import sharp from "sharp";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { adminDb, adminStorage, COLLECTIONS } from "@/server/firebase-admin";
import { POST as upload } from "@/app/api/uploads/route";
import { mintUser, resetAuth, resetFirestore, seedFest, type TestUser } from "./harness";

/**
 * POST /api/uploads through the real handler against the Storage emulator:
 * who may upload where, what is refused by content, and that what lands in
 * the bucket has a random name, the detected type and no metadata.
 */

let student: TestUser;
let admin: TestUser;
let otherOrganizer: TestUser;
let organizer: TestUser;

const png = (w = 64, h = 64) => sharp({ create: { width: w, height: h, channels: 4, background: "#9184d9" } }).png().toBuffer();

const send = async (user: TestUser | null, query: string, file: { bytes: Buffer; name: string; type: string } | null, headers: Record<string, string> = {}) => {
  const form = new FormData();
  if (file) form.append("file", new Blob([new Uint8Array(file.bytes)], { type: file.type }), file.name);
  const request = new Request(`http://localhost:3000/api/uploads?${query}`, {
    method: "POST",
    headers: { ...(user ? { authorization: `Bearer ${user.idToken}` } : {}), ...headers },
    body: file ? form : undefined,
  });
  const res = await upload(request, { params: Promise.resolve({}) });
  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  return { status: res.status, body };
};

beforeAll(async () => {
  await resetAuth();
  student = await mintUser({ name: "Uploader Student" });
  admin = await mintUser({ role: "admin", festIds: ["fest1"], name: "Fest Admin" });
  otherOrganizer = await mintUser({ role: "organizer", festIds: ["fest2"], name: "Other Org" });
  organizer = await mintUser({ role: "organizer", festIds: ["fest1"], name: "Fest Org" });
});

beforeEach(async () => {
  await resetFirestore();
  for (const u of [student, admin, otherOrganizer, organizer]) {
    const festIds = u === otherOrganizer ? ["fest2"] : ["fest1"];
    await adminDb()
      .collection(COLLECTIONS.users)
      .doc(u.uid)
      .set({ id: u.uid, email: u.email, fullName: u.name, role: u.role, emailVerified: true, createdAt: new Date(), updatedAt: new Date(), ...(u.role === "student" ? { student: { college: "T" } } : { organizer: { festIds } }) });
  }
  await seedFest();
  await seedFest({ id: "fest2", slug: "other" });
});

describe("authorization", () => {
  it("requires a signed-in caller", async () => {
    expect((await send(null, "kind=festBanner&id=fest1", { bytes: await png(), name: "a.png", type: "image/png" })).status).toBe(401);
  });

  it("students and organizers cannot upload fest banners; organizers of other fests cannot upload posters here", async () => {
    const file = { bytes: await png(), name: "banner.png", type: "image/png" };
    expect((await send(student, "kind=festBanner&id=fest1", file)).status).toBe(403);
    expect((await send(organizer, "kind=festBanner&id=fest1", file)).status).toBe(403);
    expect((await send(otherOrganizer, "kind=eventPoster&id=fest1", file)).status).toBe(403);
    expect((await send(admin, "kind=festBanner&id=fest1", file)).status).toBe(201);
  });

  it("an organizer may upload an event poster for their own fest", async () => {
    const ok = await send(organizer, "kind=eventPoster&id=fest1", { bytes: await png(), name: "poster.png", type: "image/png" });
    expect(ok.status).toBe(201);
    expect(String(ok.body.path)).toMatch(/^fests\/fest1\/posters\/[0-9a-f-]{36}\.png$/);
  });

  it("a profile photo always lands under the caller, whatever id is passed", async () => {
    const ok = await send(student, `kind=profilePhoto&id=${admin.uid}`, { bytes: await png(), name: "me.png", type: "image/png" });
    expect(ok.status).toBe(201);
    expect(String(ok.body.path)).toMatch(new RegExp(`^users/${student.uid}/photo/[0-9a-f-]{36}\\.png$`));
  });

  it("rejects unknown kinds, missing ids and ids that could traverse", async () => {
    const file = { bytes: await png(), name: "x.png", type: "image/png" };
    expect((await send(admin, "kind=anything&id=fest1", file)).status).toBe(400);
    expect((await send(admin, "kind=festBanner&id=..%2F..%2Fcertificates", file)).status).toBe(400);
    expect((await send(admin, "kind=festBanner", file)).status).toBe(400);
    expect((await send(admin, "kind=festBanner&id=nope", file)).status).toBe(404); // admins are unscoped; the fest must exist
  });
});

describe("content validation", () => {
  it("rejects an executable renamed to .png with an image content type (415)", async () => {
    const spoofed = Buffer.concat([Buffer.from("MZ"), Buffer.from("\x89PNG\r\n\x1a\n", "latin1"), Buffer.alloc(300)]);
    const res = await send(admin, "kind=festBanner&id=fest1", { bytes: spoofed, name: "innocent.png", type: "image/png" });
    expect(res.status).toBe(415);
    expect(res.body.code).toBe("unsupported-type");
    expect(String(res.body.error)).toMatch(/executables/i);
  });

  it("rejects SVG and HTML however they are declared", async () => {
    const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect/></svg>`);
    expect((await send(admin, "kind=festLogo&id=fest1", { bytes: svg, name: "logo.svg", type: "image/svg+xml" })).status).toBe(415);
    expect((await send(admin, "kind=festLogo&id=fest1", { bytes: svg, name: "logo.png", type: "image/png" })).status).toBe(415);
    const html = Buffer.from(`<!doctype html><html><script>1</script></html>`);
    expect((await send(admin, "kind=festLogo&id=fest1", { bytes: html, name: "logo.jpg", type: "image/jpeg" })).status).toBe(415);
  });

  it("rejects oversized files before decoding (413)", async () => {
    // 2 MB logo limit: a 2.5 MB body with a valid PNG header.
    const big = Buffer.concat([Buffer.from("\x89PNG\r\n\x1a\n", "latin1"), Buffer.alloc(2.5 * 1024 * 1024)]);
    const res = await send(admin, "kind=festLogo&id=fest1", { bytes: big, name: "big.png", type: "image/png" });
    expect(res.status).toBe(413);
    expect(res.body.code).toBe("too-large");
    const declared = await send(admin, "kind=festBanner&id=fest1", { bytes: await png(), name: "a.png", type: "image/png" }, { "content-length": String(50 * 1024 * 1024) });
    expect(declared.status).toBe(413);
  });

  it("rejects an empty or missing file and a non-multipart body", async () => {
    expect((await send(admin, "kind=festBanner&id=fest1", null)).status).toBe(400);
    expect((await send(admin, "kind=festBanner&id=fest1", { bytes: Buffer.alloc(0), name: "e.png", type: "image/png" })).status).toBe(400);
  });
});

describe("what is stored", () => {
  it("lands in the bucket under a random name with the detected type, no EXIF, and provenance metadata", async () => {
    const exif = await sharp({ create: { width: 300, height: 200, channels: 3, background: "#123456" } })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Copyright: "remove me" } } })
      .toBuffer();
    const res = await send(admin, "kind=festBanner&id=fest1", { bytes: exif, name: "../../../etc/passwd.jpg", type: "application/octet-stream" });
    expect(res.status).toBe(201);
    expect(res.body.contentType).toBe("image/jpeg");
    expect(String(res.body.path)).toMatch(/^fests\/fest1\/banners\/[0-9a-f-]{36}\.jpg$/);
    expect(String(res.body.path)).not.toContain("passwd");
    expect(String(res.body.url)).toMatch(/\/o\/fests%2Ffest1%2Fbanners%2F[0-9a-f-]{36}\.jpg\?alt=media&token=/);

    const file = adminStorage().bucket().file(String(res.body.path));
    const [exists] = await file.exists();
    expect(exists).toBe(true);
    const [meta] = await file.getMetadata();
    expect(meta.contentType).toBe("image/jpeg");
    expect(meta.metadata?.uploadedBy).toBe(admin.uid);
    expect(meta.metadata?.kind).toBe("festBanner");
    expect(String(meta.cacheControl)).toContain("immutable");
    const [bytes] = await file.download();
    const stored = await sharp(bytes).metadata();
    expect(stored.exif).toBeUndefined();
    expect(bytes.toString("latin1")).not.toContain("remove me");

    const auditRows = await adminDb().collection(COLLECTIONS.auditLog).where("action", "==", "file_uploaded").get();
    expect(auditRows.size).toBe(1);
  });
});
