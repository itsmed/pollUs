import { getApiUrl } from '../config';

/** Shape of a legislator returned by /find-representative-and-senator. */
export interface RepLegislator {
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
  legislators: RepLegislator[];
}

export async function findRepresentatives(address: string): Promise<FindRepsResponse> {
  const params = new URLSearchParams({ address });
  const res = await fetch(`${getApiUrl()}/find-representative-and-senator?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
