import { type Bill } from '@/lib/api/bills';

const CHAMBER_STYLES: Record<string, string> = {
  House: 'bg-green-100 text-green-800',
  Senate: 'bg-purple-100 text-purple-800',
};

function chamberStyle(chamber: string | null): string {
  return CHAMBER_STYLES[chamber ?? ''] ?? 'bg-gray-100 text-gray-700';
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
    <article className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {billLabel && (
            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
              {billLabel}
            </span>
          )}
          {origin_chamber && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${chamberStyle(origin_chamber)}`}>
              {origin_chamber}
            </span>
          )}
        </div>
        {update_date && (
          <p className="shrink-0 text-xs text-gray-400">Updated {formatDate(update_date)}</p>
        )}
      </div>

      <p className="text-sm font-medium leading-snug text-gray-900">{title}</p>

      {latest_action_text && (
        <div className="border-t border-gray-100 pt-2">
          <p className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">Latest action</span>
            {latest_action_date && (
              <span className="ml-1 text-gray-400">· {formatDate(latest_action_date)}</span>
            )}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-600">{latest_action_text}</p>
        </div>
      )}
    </article>
  );
}
