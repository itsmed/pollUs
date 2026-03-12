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

export async function fetchBills(): Promise<BillsResponse> {
  const res = await fetch(`${API_URL}/api/bill`);
  if (!res.ok) {
    throw new Error(`Failed to fetch bills: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
