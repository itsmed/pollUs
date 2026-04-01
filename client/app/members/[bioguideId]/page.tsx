import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { useMemberDetail, useMemberAgreement, pageShell, pageHeaderColors, textLink, feedback } from '@votr/shared';
import { useUser } from '@/lib/context/UserContext';
import MemberDetail from '@/components/members/MemberDetail';

export default function MemberDetailPage() {
  const { bioguideId } = useParams<{ bioguideId: string }>();
  const { member, isLoading, isError } = useMemberDetail(bioguideId!);
  const { user } = useUser();
  const { agreement } = useMemberAgreement(bioguideId!, user !== null);

  return (
    <div className={pageShell}>
      <header className={`shrink-0 ${pageHeaderColors} px-6 py-4`}>
        <Link to="/members" className={`text-sm ${textLink} hover:underline`}>
          ← Members
        </Link>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {isLoading && <p className={feedback.loadingText}>Loading member…</p>}
        {isError   && <p className={feedback.errorText}>Failed to load member. Please try again.</p>}
        {!isLoading && !isError && member && (
          <MemberDetail member={member} agreement={agreement} />
        )}
      </main>
    </div>
  );
}
