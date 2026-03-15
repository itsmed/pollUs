'use client';

import { createContext, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCurrentUser, updateCurrentUser, User } from '@/lib/api/user';

interface UserContextValue {
  user: User | null;
  isLoading: boolean;
  updateUser: (fields: Partial<Pick<User, 'address' | 'preferences'>>) => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  isLoading: true,
  updateUser: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user = null, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: Infinity,
  });

  async function updateUser(fields: Partial<Pick<User, 'address' | 'preferences'>>) {
    const updated = await updateCurrentUser(fields);
    queryClient.setQueryData(['currentUser'], updated);
  }

  return (
    <UserContext.Provider value={{ user, isLoading, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
