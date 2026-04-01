import { Link } from 'react-router-dom';
import { type Bill, badge, chamberBadgeByName, cardElevated, textPrimary, textSecondary, textMuted, textFaint, borderSubtle } from '@pollus/shared';

function billDetailHref(bill: Bill): string {
  if (!bill.congress_number || !bill.bill_type || !bill.bill_number) return '#';
  return `/bills/${bill.congress_number}/${bill.bill_type.toLowerCase()}/${bill.bill_number}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

interface BillCardProps {
  bill: Bill;
}

/**
 * Displays a single bill's key details: type/number badge, title, origin chamber,
 * latest action, and last updated date.
 */
export default function BillCard({ bill }: BillCardProps) {
  const {
    title,
    bill_type,
    bill_number,
    origin_chamber,
    latest_action_text,
    latest_action_date,
    update_date,
  } = bill;

  const billLabel = bill_type && bill_number ? `${bill_type} ${bill_number}` : null;

  return (
    <Link to={billDetailHref(bill)} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg">
      <article className={`flex flex-col gap-3 ${cardElevated} px-4 py-3`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {billLabel && (
              <span className={`shrink-0 ${badge.neutral}`}>{billLabel}</span>
            )}
            {origin_chamber && (
              <span className={`shrink-0 ${chamberBadgeByName[origin_chamber] ?? badge.neutral}`}>
                {origin_chamber}
              </span>
            )}
          </div>
          {update_date && (
            <p className={`shrink-0 text-xs ${textFaint}`}>Updated {formatDate(update_date)}</p>
          )}
        </div>

        <p className={`text-sm font-medium leading-snug ${textPrimary}`}>{title}</p>

        {latest_action_text && (
          <div className={`border-t ${borderSubtle} pt-2`}>
            <p className={`text-xs ${textMuted}`}>
              <span className={`font-medium ${textSecondary}`}>Latest action</span>
              {latest_action_date && (
                <span className={`ml-1 ${textFaint}`}>· {formatDate(latest_action_date)}</span>
              )}
            </p>
            <p className={`mt-0.5 text-xs leading-relaxed ${textSecondary}`}>{latest_action_text}</p>
          </div>
        )}
      </article>
    </Link>
  );
}
