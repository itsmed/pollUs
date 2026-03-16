import { type VoteRow } from '@/lib/api/congressionalVotes';
import VotePreview from './VotePreview';

interface VoteListProps {
  votes: VoteRow[];
  emptyMessage?: string;
}

export default function VoteList({ votes, emptyMessage = 'No votes found.' }: VoteListProps) {
  if (votes.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-gray-400">{emptyMessage}</p>;
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
