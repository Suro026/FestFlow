/**
 * Deploys firestore.rules and firestore.indexes.json using the service
 * account in FIREBASE_SERVICE_ACCOUNT — no `firebase login` needed. File
 * storage is Supabase now, provisioned separately in the Supabase dashboard.
 *
 *   npm run firebase:deploy              # rules + indexes
 *   npm run firebase:deploy -- --rules   # rules only
 *   npm run firebase:deploy -- --indexes # indexes only
 *
 * Why not the Firebase CLI: it needs an interactive OAuth sign-in, which does
 * not fit CI or a machine where the developer is not the project owner. The
 * Rules and Firestore Admin REST APIs accept the service account directly.
 */

import { readFileSync } from "node:fs";
import { GoogleAuth } from "google-auth-library";

const args = new Set(process.argv.slice(2));
const doRules = args.size === 0 || args.has("--rules");
const doIndexes = args.size === 0 || args.has("--indexes");

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw?.trim()) {
  console.error("\n  FIREBASE_SERVICE_ACCOUNT is not set. See .env.example.\n");
  process.exit(1);
}
const trimmed = raw.trim().replace(/^['"]|['"]$/g, "");
const credentials = JSON.parse(trimmed.startsWith("{") ? trimmed : Buffer.from(trimmed, "base64").toString("utf8"));
credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");

const project = credentials.project_id;

const auth = new GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/cloud-platform", "https://www.googleapis.com/auth/firebase"],
});
const client = await auth.getClient();
const { token } = await client.getAccessToken();

const call = async (method, url, body) => {
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { ok: response.ok, status: response.status, json };
};

const fail = (message) => {
  console.error(`\n  FAIL  ${message}\n`);
  process.exit(1);
};

/* ───────────── rules ───────────── */

const deployRuleset = async (label, fileName, releaseName) => {
  const content = readFileSync(fileName, "utf8");

  const created = await call("POST", `https://firebaserules.googleapis.com/v1/projects/${project}/rulesets`, {
    source: { files: [{ name: fileName, content }] },
  });

  if (!created.ok) {
    const issues = created.json?.error?.details?.flatMap((d) => d.issues ?? []) ?? [];
    for (const issue of issues) {
      console.error(`    ${fileName}:${issue.sourcePosition?.line ?? "?"}  ${issue.description}`);
    }
    fail(`${label}: ruleset rejected (${created.status}) ${created.json?.error?.message ?? ""}`);
  }

  const rulesetName = created.json.name;
  const fullRelease = `projects/${project}/releases/${releaseName}`;

  // PATCH updates an existing release; POST creates it the first time.
  let released = await call(
    "PATCH",
    `https://firebaserules.googleapis.com/v1/${fullRelease}`,
    { release: { name: fullRelease, rulesetName } },
  );

  if (released.status === 404) {
    released = await call("POST", `https://firebaserules.googleapis.com/v1/projects/${project}/releases`, {
      name: fullRelease,
      rulesetName,
    });
  }

  if (!released.ok) {
    fail(`${label}: release failed (${released.status}) ${released.json?.error?.message ?? ""}`);
  }

  console.log(`  ${label.padEnd(10)} deployed  ${rulesetName.split("/").pop()}`);
};

/* ───────────── indexes ───────────── */

const deployIndexes = async () => {
  const wanted = JSON.parse(readFileSync("firestore.indexes.json", "utf8")).indexes ?? [];
  const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/collectionGroups`;

  // What already exists, so we only create what is missing.
  const existing = await call("GET", `${base}/-/indexes`);
  if (!existing.ok) fail(`listing indexes failed (${existing.status}) ${existing.json?.error?.message ?? ""}`);

  const key = (cg, fields) =>
    `${cg}|${fields
      .map((f) => `${f.fieldPath}:${f.order ?? (f.arrayConfig ? "CONTAINS" : "")}`)
      .join(",")}`;

  const have = new Set(
    (existing.json.indexes ?? [])
      .filter((i) => i.queryScope === "COLLECTION")
      .map((i) =>
        key(
          i.name.split("/collectionGroups/")[1].split("/")[0],
          (i.fields ?? []).filter((f) => f.fieldPath !== "__name__"),
        ),
      ),
  );

  let created = 0;
  let present = 0;

  for (const index of wanted) {
    const k = key(index.collectionGroup, index.fields);
    if (have.has(k)) {
      present += 1;
      continue;
    }

    const response = await call("POST", `${base}/${index.collectionGroup}/indexes`, {
      queryScope: index.queryScope ?? "COLLECTION",
      fields: index.fields.map((f) =>
        f.arrayConfig ? { fieldPath: f.fieldPath, arrayConfig: f.arrayConfig } : { fieldPath: f.fieldPath, order: f.order },
      ),
    });

    if (response.status === 409) {
      present += 1;
      continue;
    }
    if (!response.ok) {
      console.error(`    ${index.collectionGroup} ${k}: ${response.json?.error?.message ?? response.status}`);
      continue;
    }
    created += 1;
    console.log(`  index      building  ${index.collectionGroup}: ${index.fields.map((f) => f.fieldPath).join(", ")}`);
  }

  console.log(`  indexes    ${created} created, ${present} already present`);
  if (created) console.log("             new indexes take a few minutes to build; queries using them 503 until then");
};

/* ───────────── run ───────────── */

console.log(`\n  Project: ${project}\n`);

if (doRules) {
  await deployRuleset("firestore", "firestore.rules", "cloud.firestore");
}

if (doIndexes) await deployIndexes();

console.log("\n  Done.\n");
process.exit(0);
