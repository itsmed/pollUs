import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Routes, Route } from 'react-router-dom';
import { UserProvider } from '@/lib/context/UserContext';
import NavBar from '@/components/NavBar';
import HomePage from '@/app/page';
import BillsPage from '@/app/bills/page';
import BillDetailPage from '@/app/bills/[congress]/[type]/[number]/page';
import MembersPage from '@/app/members/page';
import MemberDetailPage from '@/app/members/[bioguideId]/page';
import VotesPage from '@/app/votes/page';
import VoteDetailPage from '@/app/votes/[voteId]/page';
import ProfilePage from '@/app/profile/page';
import PreferencesPage from '@/app/preferences/page';
import LoginPage from '@/app/login/page';

export default function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            retry: 2,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <div className="flex min-h-screen flex-col">
          <NavBar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/bills" element={<BillsPage />} />
            <Route path="/bills/:congress/:type/:number" element={<BillDetailPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/members/:bioguideId" element={<MemberDetailPage />} />
            <Route path="/votes" element={<VotesPage />} />
            <Route path="/votes/:voteId" element={<VoteDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/preferences" element={<PreferencesPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </div>
      </UserProvider>
    </QueryClientProvider>
  );
}
