const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface Bill {
  id: number;
  title: string;
  origin_chamber: string | null;
  bill_type: string | null;
  bill_number: string | null;
  congress_number: number | null;
  latest_action_text: string | null;
  latest_action_date: string | null;
  update_date: string | null;
  api_id: string;
  url: string | null;
}

export interface BillsResponse {
  source: 'cache' | 'api';
  count: number;
  bills: Bill[];
}

export interface BillAction {
  actionDate: string;
  text: string;
  type: string | null;
  actionCode: string | null;
}

export interface BillSummary {
  text: string;
  actionDate: string | null;
  actionDesc: string | null;
  updateDate: string | null;
  versionCode: string | null;
}

export interface TextFormat {
  type: string;
  url: string;
}

export interface TextVersion {
  date: string | null;
  type: string | null;
  formats: TextFormat[];
}

export interface BillDetailResponse {
  bill: Bill | null;
  actions: BillAction[];
  summaries: BillSummary[];
}

export interface BillTextResponse {
  textVersions: TextVersion[];
}

export async function fetchBills(): Promise<BillsResponse> {
  const res = await fetch(`${API_URL}/api/bill`);
  if (!res.ok) {
    throw new Error(`Failed to fetch bills: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchBillDetail(
  congress: number,
  type: string,
  number: string
): Promise<BillDetailResponse> {
  const res = await fetch(`${API_URL}/api/bill/${congress}/${type.toLowerCase()}/${number}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch bill detail: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchBillText(
  congress: number,
  type: string,
  number: string
): Promise<BillTextResponse> {
  const res = await fetch(`${API_URL}/api/bill/${congress}/${type.toLowerCase()}/${number}/text`);
  if (!res.ok) {
    throw new Error(`Failed to fetch bill text: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
