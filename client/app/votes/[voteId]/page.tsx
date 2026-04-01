import { Link, useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { useVoteDetail, useUserCongressionalVote, useMyReps, pageShell, pageHeaderColors, btn, textLink, feedback } from '@votr/shared';
import { useUser } from '@/lib/context/UserContext';
import VoteDetail from '@/components/votes/VoteDetail';

function ChevronLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function VoteDetailPage() {
  const { voteId } = useParams<{ voteId: string }>();
  const navigate = useNavigate();
  const decodedId = decodeURIComponent(voteId!);

  const { data, isLoading, isError } = useVoteDetail(decodedId);
  const { user } = useUser();

  const hasReps =
    (user?.senator_ids?.length ?? 0) > 0 ||
    (user?.congress_member_ids?.length ?? 0) > 0;
  const { data: repsData } = useMyReps(hasReps);
  const chamber = data?.vote.chamber;
  const myReps = repsData && chamber
    ? chamber === 's' ? repsData.senators : repsData.representatives
    : undefined;

  const { userVote, cast, isCasting } = useUserCongressionalVote(decodedId);

  const prevId = data?.prev_vote_id;
  const nextId = data?.next_vote_id;

  function navigateTo(id: string) {
    navigate(`/votes/${encodeURIComponent(id)}`);
  }

  return (
    <div className={pageShell}>
      <header className={`shrink-0 ${pageHeaderColors} px-4 py-3`}>
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link to="/votes" className={`text-sm ${textLink} hover:underline`}>
            ← Votes
          </Link>

          <div className="flex items-center gap-1">
            <button
              onClick={() => prevId && navigateTo(prevId)}
              disabled={!prevId}
              aria-label="Previous vote"
              className={`p-1.5 ${btn.ghost} disabled:cursor-not-allowed disabled:opacity-30`}
            >
              <ChevronLeftIcon />
            </button>
            <button
              onClick={() => nextId && navigateTo(nextId)}
              disabled={!nextId}
              aria-label="Next vote"
              className={`p-1.5 ${btn.ghost} disabled:cursor-not-allowed disabled:opacity-30`}
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {isLoading && <p className={feedback.loadingText}>Loading vote…</p>}
        {isError   && <p className={feedback.errorText}>Failed to load vote. Please try again.</p>}
        {!isLoading && !isError && data && (
          <VoteDetail
            vote={data.vote}
            positions={data.positions}
            myReps={myReps}
            userVote={userVote}
            onVote={cast}
            isVoting={isCasting}
          />
        )}
      </main>
    </div>
  );
}
