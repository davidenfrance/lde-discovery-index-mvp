export type RecordStatus = "active" | "revoked";

export type CapabilityRecord = {
  record_id: string;
  agent_id: string;
  principal_id: string;
  display_name?: string;
  tasks: string[];
  jurisdiction: string;
  settlement_currency: string;
  value_band_usd_min: number;
  value_band_usd_max: number;
  endpoints: Record<string, string>;
  evidence?: Record<string, unknown>;
  issued_at: string;
  expires_at: string;
  status: RecordStatus;
  key_id: string;
  signature: string;
};

export type QueryFilters = {
  task?: string;
  jurisdiction?: string;
  currency?: string;
  max_usd?: number;
  firm?: string;
};
