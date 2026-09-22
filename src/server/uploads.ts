import { createHash, randomUUID } from "node:crypto";
import sharp, { type Metadata } from "sharp";
import { ApiError } from "./errors";
import { adminStorage } from "./firebase-admin";

/**
 * File uploads — one path in, for every kind of file the app accepts.
 *
 * Nothing about the request is trusted:
 *   - the type comes from the bytes (magic numbers), never from the filename
 *     or the declared Content-Type; anything not on the allow list is refused,
 *     including SVG (scriptable), HTML, executables and archives
 *   - the size is capped per kind before and after decoding
 *   - images are decoded and re-encoded by sharp: EXIF/GPS/XMP metadata is
 *     dropped, dimensions are bounded, and a file that is a valid image *and*
 *     something else (a polyglot) comes out as only an image
 *   - the object name is a fresh UUID plus the extension of the *detected*
 *     type; the client's filename is never used, so there is nothing to
 *     traverse or collide with
 *   - the object path is built from validated ids, and the caller's right to
 *     write under that owner is checked by the route before this runs
 *   - files live only in Firebase Storage (Cloud Storage), never on disk or
 *     under the web root; the bucket's rules deny every client write, so this
 *     module is the only writer
 */

/* ───────────── what may be uploaded ───────────── */

export type UploadKind = "festBanner" | "festLogo" | "eventPoster" | "profilePhoto";

export interface UploadPolicy {
  /** Owner segment: a fest id, or a user id. */
  owner: "fest" | "user";
  /** Folder under the owner. */
  folder: string;
  maxBytes: number;
  /** Longest side after processing. */
  maxDimension: number;
  /** Which capability the route must check before calling in. */
  permission: "upload:festArtwork" | "upload:eventPoster" | "self";
}

export const UPLOAD_POLICY: Record<UploadKind, UploadPolicy> = {
  festBanner: { owner: "fest", folder: "banners", maxBytes: 5 * 1024 * 1024, maxDimension: 2400, permission: "upload:festArtwork" },
  festLogo: { owner: "fest", folder: "logos", maxBytes: 2 * 1024 * 1024, maxDimension: 1024, permission: "upload:festArtwork" },
  eventPoster: { owner: "fest", folder: "posters", maxBytes: 5 * 1024 * 1024, maxDimension: 2400, permission: "upload:eventPoster" },
  profilePhoto: { owner: "user", folder: "photo", maxBytes: 3 * 1024 * 1024, maxDimension: 1024, permission: "self" },
};

/** The largest any request body may be, whatever the kind. Checked first. */
export const MAX_UPLOAD_BYTES = Math.max(...Object.values(UPLOAD_POLICY).map((p) => p.maxBytes));

/* ───────────── type detection ───────────── */

export type DetectedImage = "image/png" | "image/jpeg" | "image/webp" | "image/gif";
export type DetectedType = DetectedImage | "application/pdf";

const EXTENSION: Record<DetectedType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

const startsWith = (buf: Uint8Array, bytes: number[], offset = 0) => bytes.every((b, i) => buf[offset + i] === b);

/**
 * Magic-number sniffing for the handful of types we accept. Returns null for
 * everything else — which is the safe answer for an EXE, an SVG, an HTML
 * file with an image extension, or an empty body.
 */
export const sniffType = (buf: Uint8Array): DetectedType | null => {
  if (buf.length < 12) return null;
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(buf, [0x47, 0x49, 0x46, 0x38]) && (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61) return "image/gif";
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  return null;
};

/** Types we will never store, named so the refusal can say why. */
export const describeRejectedType = (buf: Uint8Array, declared: string | null): string => {
  const head = Buffer.from(buf.subarray(0, 512)).toString("latin1");
  if (startsWith(buf, [0x4d, 0x5a])) return "Windows executables are not accepted.";
  if (startsWith(buf, [0x7f, 0x45, 0x4c, 0x46])) return "Executables are not accepted.";
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04])) return "Archives and Office documents are not accepted.";
  if (/^\s*<\?xml|<svg[\s>]/i.test(head)) return "SVG files are not accepted — export as PNG or JPEG.";
  if (/<!doctype html|<html[\s>]|<script[\s>]/i.test(head)) return "HTML is not accepted.";
  if (head.startsWith("#!") || /^<\?php/i.test(head)) return "Scripts are not accepted.";
  return declared ? `"${declared}" is not an accepted image type. Use PNG, JPEG or WebP.` : "That file is not a PNG, JPEG or WebP image.";
};

/* ───────────── processing ───────────── */

export interface ProcessedImage {
  bytes: Buffer;
  contentType: DetectedImage;
  width: number;
  height: number;
  /** True when the decoded image carried EXIF/XMP/ICC that was dropped. */
  strippedMetadata: boolean;
}

/**
 * Decode → bound → re-encode. The output carries no EXIF, XMP, IPTC or GPS
 * (sharp omits metadata unless `withMetadata()` is called), is auto-rotated
 * first so the orientation survives without the tag, and is at most
 * `maxDimension` on its longest side. Animated GIFs are flattened to their
 * first frame; animation is not a feature the app uses and the flattening
 * removes another class of parser trouble.
 */
export const processImage = async (input: Buffer, type: DetectedImage, maxDimension: number): Promise<ProcessedImage> => {
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 40_000_000 }).metadata();
  } catch {
    throw ApiError.unprocessable("That image could not be read. Try exporting it again as PNG or JPEG.");
  }
  if (!meta.width || !meta.height) throw ApiError.unprocessable("That image has no dimensions.");
  if (meta.width < 16 || meta.height < 16) throw ApiError.unprocessable("That image is too small to use.");

  const pipeline = sharp(input, { limitInputPixels: 40_000_000, pages: 1 })
    .rotate() // apply EXIF orientation, then drop the tag with the rest
    .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true });

  const encoded =
    type === "image/png" ? pipeline.png({ compressionLevel: 9, palette: false })
    : type === "image/webp" ? pipeline.webp({ quality: 86 })
    : type === "image/gif" ? pipeline.png({ compressionLevel: 9 }) // first frame, as PNG
    : pipeline.jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: "4:2:0" });

  const { data, info } = await encoded.toBuffer({ resolveWithObject: true });
  const contentType: DetectedImage = type === "image/gif" ? "image/png" : type;
  return {
    bytes: data,
    contentType,
    width: info.width,
    height: info.height,
    strippedMetadata: Boolean(meta.exif || meta.xmp || meta.iptc || meta.icc),
  };
};

/* ───────────── naming ───────────── */

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * `fests/{festId}/banners/{uuid}.png`. The owner id is validated against a
 * strict alphabet (Firestore ids and Firebase uids both fit), the folder is
 * ours, the filename is random. No component comes from the client.
 */
export const objectPathFor = (kind: UploadKind, ownerId: string, contentType: DetectedType): string => {
  const policy = UPLOAD_POLICY[kind];
  if (!SAFE_ID.test(ownerId)) throw ApiError.badRequest("Invalid owner id.");
  const root = policy.owner === "fest" ? "fests" : "users";
  return `${root}/${ownerId}/${policy.folder}/${randomUUID()}.${EXTENSION[contentType]}`;
};

/* ───────────── storing ───────────── */

export interface StoredUpload {
  path: string;
  url: string;
  contentType: string;
  bytes: number;
  width?: number;
  height?: number;
  sha256: string;
}

/**
 * Writes to the default bucket with a download token so the public URL works
 * through Firebase's CDN. Metadata records who uploaded it and what it is,
 * which is what an abuse report is answered from.
 */
export const storeUpload = async (path: string, bytes: Buffer, contentType: string, meta: { uploadedBy: string; kind: UploadKind; width?: number; height?: number }): Promise<StoredUpload> => {
  const bucket = adminStorage().bucket();
  const token = randomUUID();
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  try {
    await bucket.file(path).save(bytes, {
      contentType,
      resumable: false,
      metadata: {
        cacheControl: "public, max-age=31536000, immutable",
        // Served as an attachment never; as an image always — the type is ours.
        contentDisposition: "inline",
        metadata: {
          firebaseStorageDownloadTokens: token,
          uploadedBy: meta.uploadedBy,
          kind: meta.kind,
          sha256,
          ...(meta.width ? { width: String(meta.width), height: String(meta.height) } : {}),
        },
      },
    });
  } catch (error) {
    // A missing bucket (Storage never initialised in the console) is a
    // deployment gap, not a bug: say so instead of a generic 500.
    const message = error instanceof Error ? error.message : String(error);
    if (/bucket does not exist|notFound|404/i.test(message)) {
      throw ApiError.unavailable("Image uploads aren’t enabled on this deployment yet. Paste an https:// image URL instead, or ask the platform admin to initialise Storage.");
    }
    throw error;
  }
  return {
    path,
    url: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`,
    contentType,
    bytes: bytes.length,
    ...(meta.width ? { width: meta.width, height: meta.height } : {}),
    sha256,
  };
};

/* ───────────── the whole pipeline ───────────── */

export interface UploadInput {
  kind: UploadKind;
  ownerId: string;
  uploadedBy: string;
  bytes: Buffer;
  declaredType: string | null;
}

/** Validate, sniff, process, name, store. Throws ApiError for anything refused. */
export const acceptImageUpload = async (input: UploadInput): Promise<StoredUpload> => {
  const policy = UPLOAD_POLICY[input.kind];
  if (input.bytes.length === 0) throw ApiError.badRequest("The file is empty.");
  if (input.bytes.length > policy.maxBytes) {
    throw new ApiError(413, "too-large", `That file is ${(input.bytes.length / 1048576).toFixed(1)} MB; the limit is ${policy.maxBytes / 1048576} MB.`);
  }

  const detected = sniffType(input.bytes);
  if (!detected || detected === "application/pdf") {
    throw new ApiError(415, "unsupported-type", describeRejectedType(input.bytes, input.declaredType));
  }

  const image = await processImage(input.bytes, detected, policy.maxDimension);
  if (image.bytes.length > policy.maxBytes) {
    throw new ApiError(413, "too-large", `That image is too large even after processing; the limit is ${policy.maxBytes / 1048576} MB.`);
  }

  const path = objectPathFor(input.kind, input.ownerId, image.contentType);
  return storeUpload(path, image.bytes, image.contentType, { uploadedBy: input.uploadedBy, kind: input.kind, width: image.width, height: image.height });
};
