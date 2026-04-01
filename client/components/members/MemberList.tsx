import { type Member, textFaint, feedback } from '@pollus/shared';
import MemberCard from './MemberCard';

interface MemberListProps {
  members: Member[];
  emptyMessage?: string;
}

/** Groups members by state, sorted alphabetically by state then by name. */
function groupByState(members: Member[]): { state: string; members: Member[] }[] {
  const map = new Map<string, Member[]>();

  const sorted = [...members].sort((a, b) =>
    a.state.localeCompare(b.state) || a.name.localeCompare(b.name)
  );

  for (const member of sorted) {
    const group = map.get(member.state) ?? [];
    group.push(member);
    map.set(member.state, group);
  }

  return Array.from(map.entries()).map(([state, members]) => ({ state, members }));
}

/**
 * Scrollable list of MemberCard items grouped by state.
 * The parent is expected to constrain the height so this component
 * can overflow-y-auto within it.
 */
export default function MemberList({
  members,
  emptyMessage = 'No members found.',
}: MemberListProps) {
  if (members.length === 0) {
    return <p className={`px-4 py-8 text-center ${feedback.loadingText}`}>{emptyMessage}</p>;
  }

  const groups = groupByState(members);

  return (
    <div className="flex flex-col p-4 gap-6">
      {groups.map(({ state, members: stateMembers }) => (
        <section key={state}>
          <h3 className={`mb-2 px-1 text-xs font-semibold uppercase tracking-wider ${textFaint}`}>
            {state}
          </h3>
          <ul className="flex flex-col gap-2">
            {stateMembers.map((member) => (
              <li key={member.id}>
                <MemberCard member={member} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
