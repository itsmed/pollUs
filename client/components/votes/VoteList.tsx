import { type VoteRow, feedback } from '@pollus/shared';
import VotePreview from './VotePreview';

interface VoteListProps {
  votes: VoteRow[];
  emptyMessage?: string;
}

export default function VoteList({ votes, emptyMessage = 'No votes found.' }: VoteListProps) {
  if (votes.length === 0) {
    return <p className={`px-4 py-8 text-center ${feedback.loadingText}`}>{emptyMessage}</p>;
  }

  return (
    <ul className="flex flex-col gap-2 p-4">
      {votes.map((vote) => (
        <li key={vote.vote_id}>
          <VotePreview vote={vote} />
        </li>
      ))}
    </ul>
  );
}
