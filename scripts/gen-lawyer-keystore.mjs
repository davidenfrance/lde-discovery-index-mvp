#!/usr/bin/env node
/**
 * Option 2: new Ed25519 pair per distinct lawyer on LAN.
 * Writes keystore/manifest.json + keystore/pem/<key_id>.pem
 * Does not recover old private keys. Optional --publish posts NEW records.
 *
 * Usage:
 *   node scripts/gen-lawyer-keystore.mjs
 *   node scripts/gen-lawyer-keystore.mjs --source https://www.londonagenticnetwork.com/api/v1/records
 *   node scripts/gen-lawyer-keystore.mjs --publish
 */
import { generateKeyPairSync, createPrivateKey, sign } from "crypto";
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";

const args = new Set(process.argv.slice(2));
const publish = args.has("--publish");
const outDir = process.env.KEYSTORE_DIR || join(process.cwd(), "keystore");
const sourceIdx = process.argv.indexOf("--source");
const source =
  (sourceIdx >= 0 && process.argv[sourceIdx + 1]) ||
  process.env.LAN_RECORDS_URL ||
  "https://www.londonagenticnetwork.com/api/v1/records";
const publishUrl = process.env.LAN_PUBLISH_URL || "https://www.londonagenticnetwork.com/api/v1/records";

function lawyerKey(record) {
  const ev = record.evidence || {};
  const person = String(ev.person || record.display_name || record.agent_id || "unknown").trim();
  const firm = String(ev.firm || "").trim();
  return `${person.toLowerCase()}||${firm.toLowerCase()}`;
}

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "unknown";
}

function canonicalPublish(record) {
  return JSON.stringify({
    record_id: record.record_id,
    agent_id: record.agent_id,
    principal_id: record.principal_id,
    tasks: [...record.tasks].sort(),
    jurisdiction: record.jurisdiction,
    settlement_currency: record.settlement_currency,
    value_band_usd_min: record.value_band_usd_min,
    value_band_usd_max: record.value_band_usd_max,
    issued_at: record.issued_at,
    expires_at: record.expires_at,
    key_id: record.key_id,
  });
}

async function loadRecords() {
  if (source.startsWith("http")) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`fetch_failed_${res.status}`);
    const body = await res.json();
    return body.records || [];
  }
  const body = JSON.parse(readFileSync(source, "utf8"));
  return body.records || body;
}

const records = await loadRecords();
const groups = new Map();
for (const rec of records) {
  if (!rec || rec.status === "revoked") continue;
  const k = lawyerKey(rec);
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(rec);
}

mkdirSync(join(outDir, "pem"), { recursive: true });

const lawyers = [];
const issued_at = new Date().toISOString();
const expires_at = "2026-11-30T23:59:59.000Z";

for (const [, recs] of groups) {
  recs.sort((a, b) => String(a.record_id).localeCompare(String(b.record_id)));
  const primary = recs[0];
  const ev = primary.evidence || {};
  const person = ev.person || primary.display_name || primary.agent_id;
  const firm = ev.firm || "";
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const key_id = Buffer.from(publicKey.export({ format: "jwk" }).x, "base64url").toString("hex");
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const pem_file = `pem/${key_id}.pem`;
  writeFileSync(join(outDir, pem_file), pem);

  const tasks = [...new Set(recs.flatMap((r) => r.tasks || []))].sort();
  lawyers.push({
    person,
    firm,
    display_name: primary.display_name,
    agent_id: primary.agent_id,
    principal_id: primary.principal_id,
    jurisdiction: primary.jurisdiction || "England and Wales",
    settlement_currency: primary.settlement_currency || "GENIUS_USD",
    value_band_usd_min: Math.min(...recs.map((r) => Number(r.value_band_usd_min ?? 0))),
    value_band_usd_max: Math.max(...recs.map((r) => Number(r.value_band_usd_max ?? 0))),
    tasks,
    evidence: ev,
    old_record_ids: recs.map((r) => r.record_id),
    old_key_ids: [...new Set(recs.map((r) => r.key_id))],
    key_id,
    pem_file,
    new_record_id: `rec-ks-${slug(person)}-${Date.now().toString(36)}`,
  });
}

lawyers.sort((a, b) => String(a.person).localeCompare(String(b.person)) || String(a.firm).localeCompare(String(b.firm)));

const manifest = {
  generated_at: issued_at,
  source,
  note: "New demo keypairs. Old LAN signatures cannot be reproduced. Do not commit pem/.",
  lawyer_count: lawyers.length,
  source_record_count: records.length,
  lawyers,
};

writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`wrote ${outDir}/manifest.json lawyers=${lawyers.length} source_records=${records.length}`);

if (!publish) {
  console.log("skip publish (pass --publish to POST new records)");
  process.exit(0);
}

let ok = 0;
let fail = 0;
for (const row of lawyers) {
  const pem = readFileSync(join(outDir, row.pem_file), "utf8");
  const key = createPrivateKey(pem);
  const body = {
    record_id: row.new_record_id,
    agent_id: row.agent_id,
    principal_id: row.principal_id,
    display_name: row.display_name,
    tasks: row.tasks,
    jurisdiction: row.jurisdiction,
    settlement_currency: row.settlement_currency,
    value_band_usd_min: row.value_band_usd_min,
    value_band_usd_max: row.value_band_usd_max,
    endpoints: {},
    evidence: {
      ...(row.evidence || {}),
      person: row.person,
      firm: row.firm,
      identity_as_at: issued_at,
      keystore: "option-2-new-device-key",
    },
    issued_at,
    expires_at,
    key_id: row.key_id,
  };
  body.signature = sign(null, Buffer.from(canonicalPublish(body), "utf8"), key).toString("hex");
  const res = await fetch(publishUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) ok += 1;
  else {
    fail += 1;
    console.error("publish_fail", row.new_record_id, res.status, await res.text());
  }
}
console.log(`published ok=${ok} fail=${fail}`);
