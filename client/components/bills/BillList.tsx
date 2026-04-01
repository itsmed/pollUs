import { type Bill, feedback } from '@pollus/shared';
import BillCard from './BillCard';

interface BillListProps {
  bills: Bill[];
  emptyMessage?: string;
}

/**
 * Scrollable list of BillCard items.
 * The parent is expected to constrain the height so this component
 * can overflow-y-auto within it.
 */
export default function BillList({ bills, emptyMessage = 'No bills found.' }: BillListProps) {
  if (bills.length === 0) {
    return <p className={`px-4 py-8 text-center ${feedback.loadingText}`}>{emptyMessage}</p>;
  }

  return (
    <ul className="flex flex-col gap-3 p-4">
      {bills.map((bill) => (
        <li key={bill.id}>
          <BillCard bill={bill} />
        </li>
      ))}
    </ul>
  );
}
