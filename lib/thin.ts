import type { CapabilityRecord } from "./types";

export type ThinRecord = {
  record_id: string;
  display_name: string | null;
  firm: string | null;
  tasks: string[];
  office_city: string | null;
  jurisdiction: string;
  session_url: string | null;
  verification: string | null;
  key_id: string;
};

function ev(record: CapabilityRecord, key: string): string | null {
  const evidence = record.evidence || {};
  const value = evidence[key];
  return typeof value === "string" && value.trim() ? value : null;
}

export function toThin(record: CapabilityRecord): ThinRecord {
  return {
    record_id: record.record_id,
    display_name: record.display_name || ev(record, "person") || null,
    firm: ev(record, "firm"),
    tasks: record.tasks,
    office_city: ev(record, "office_city"),
    jurisdiction: record.jurisdiction,
    session_url: record.endpoints?.session || null,
    verification: ev(record, "verification"),
    key_id: record.key_id,
  };
}
