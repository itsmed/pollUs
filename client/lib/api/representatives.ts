const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Shape of a legislator returned by /find-representative-and-senator. */
export interface Legislator {
  name: string;
  role: 'Senator' | 'Representative';
  party: string;
  photo_url: string | null;
  api_id: string;
  state: string;
  district: string | null;
}

export interface FindRepsResponse {
  address: string;
  state: string;
  legislators: Legislator[];
}

export async function findRepresentatives(address: string): Promise<FindRepsResponse> {
  const params = new URLSearchParams({ address });
  const res = await fetch(`${API_URL}/find-representative-and-senator?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
