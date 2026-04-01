'use client';

import { createContext, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCurrentUser, updateCurrentUser, User } from '@votr/shared';

type UpdateUserFields = Partial<Pick<User, 'address' | 'preferences'>> & {
  senator_api_ids?: string[];
  congress_member_api_ids?: string[];
};

interface UserContextValue {
  user: User | null;
  isLoading: boolean;
  updateUser: (fields: UpdateUserFields) => Promise<void>;
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

  async function updateUser(fields: UpdateUserFields) {
    const updated = await updateCurrentUser(fields);
    queryClient.setQueryData(['currentUser'], updated);
    // Invalidate cached reps so NavBar re-fetches with new IDs
    queryClient.invalidateQueries({ queryKey: ['myReps'] });
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
