const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface User {
  id: number;
  name: string;
  email: string;
  address: string | null;
  preferences: Record<string, unknown>;
}

export async function fetchCurrentUser(): Promise<User> {
  const res = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include' });
  if (!res.ok) throw new Error('Not authenticated');
  const data = await res.json();
  return data.user;
}

export async function updateCurrentUser(
  fields: Partial<Pick<User, 'address' | 'preferences'>>
): Promise<User> {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error('Failed to update user');
  const data = await res.json();
  return data.user;
}
