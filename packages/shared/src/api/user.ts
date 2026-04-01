import type { Member } from './members.js';
import { getApiUrl } from '../config.js';

export interface User {
  id: number;
  name: string;
  email: string;
  address: string | null;
  preferences: Record<string, unknown>;
  senator_ids: number[];
  congress_member_ids: number[];
}

export interface MyRepsResponse {
  senators: Member[];
  representatives: Member[];
}

export async function fetchCurrentUser(): Promise<User> {
  const res = await fetch(`${getApiUrl()}/api/auth/me`, { credentials: 'include' });
  if (!res.ok) throw new Error('Not authenticated');
  const data = await res.json();
  return data.user;
}

export async function updateCurrentUser(
  fields: Partial<Pick<User, 'address' | 'preferences'>> & {
    senator_api_ids?: string[];
    congress_member_api_ids?: string[];
  }
): Promise<User> {
  const res = await fetch(`${getApiUrl()}/api/auth/me`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error('Failed to update user');
  const data = await res.json();
  return data.user;
}

export async function fetchMyReps(): Promise<MyRepsResponse> {
  const res = await fetch(`${getApiUrl()}/api/auth/me/reps`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch reps');
  return res.json();
}
