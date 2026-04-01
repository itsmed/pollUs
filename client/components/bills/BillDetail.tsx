import { useState } from 'react';
import parse, {
  type HTMLReactParserOptions,
  type DOMNode,
  Element,
  domToReact,
} from 'html-react-parser';
import {
  type Bill,
  type BillAction,
  type BillSummary,
  type TextVersion,
  badge,
  chamberBadgeByName,
  btn,
  textPrimary,
  textSecondary,
  textFaint,
  textLink,
  borderBase,
  borderSubtle,
  feedback,
} from '@pollus/shared';

// Tags that must never be rendered, regardless of where they appear.
const BLOCKED_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed',
  'form', 'input', 'button', 'link', 'meta',
]);

const htmlParseOptions: HTMLReactParserOptions = {
  replace(domNode: DOMNode) {
    if (!(domNode instanceof Element)) return;

    if (BLOCKED_TAGS.has(domNode.name)) {
      return <></>;
    }

    if (domNode.name === 'a') {
      return (
        <a
          href={domNode.attribs.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${textLink} underline hover:text-blue-800 dark:hover:text-blue-300`}
        >
          {domToReact(domNode.children as DOMNode[], htmlParseOptions)}
        </a>
      );
    }
  },
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// ─── Text versions panel ──────────────────────────────────────────────────────

interface TextPanelProps {
  textVersions: TextVersion[];
  isLoading: boolean;
  isError: boolean;
  onFetch: () => void;
}

function TextPanel({ textVersions, isLoading, isError, onFetch }: TextPanelProps) {
  const [fetched, setFetched] = useState(false);

  const handleClick = () => {
    setFetched(true);
    onFetch();
  };

  if (!fetched) {
    return (
      <button onClick={handleClick} className={`${btn.blueOutline} px-4 py-2 text-sm`}>
        View Full Text
      </button>
    );
  }

  if (isLoading) return <p className={feedback.loadingText}>Loading text versions…</p>;
  if (isError)   return <p className={feedback.errorText}>Failed to load text versions.</p>;

  if (textVersions.length === 0) {
    return <p className={feedback.loadingText}>No text versions available yet.</p>;
  }

  const latest = textVersions[0];
  const htmlFormat = latest.formats.find((f) => f.type === 'Formatted Text');
  const pdfFormat  = latest.formats.find((f) => f.type === 'PDF');

  return (
    <div className="flex flex-wrap gap-2">
      {htmlFormat && (
        <a
          href={htmlFormat.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btn.blueOutline} px-4 py-2 text-sm`}
        >
          Full Text (HTML)
        </a>
      )}
      {pdfFormat && (
        <a
          href={pdfFormat.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btn.secondary} px-4 py-2 text-sm`}
        >
          Full Text (PDF)
        </a>
      )}
      {!htmlFormat && !pdfFormat && latest.formats.map((f) => (
        <a
          key={f.url}
          href={f.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btn.secondary} px-4 py-2 text-sm`}
        >
          {f.type}
        </a>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface BillDetailProps {
  bill: Bill | null;
  actions: BillAction[];
  summaries: BillSummary[];
  textVersions: TextVersion[];
  isTextLoading: boolean;
  isTextError: boolean;
  onFetchText: () => void;
  /** Fallback label when bill is not in the local DB (e.g. "HR 134 · 119th Congress") */
  fallbackLabel?: string;
}

/**
 * Full detail view for a single bill: summary, action history, and full-text links.
 */
export default function BillDetail({
  bill,
  actions,
  summaries,
  textVersions,
  isTextLoading,
  isTextError,
  onFetchText,
  fallbackLabel,
}: BillDetailProps) {
  const title = bill?.title ?? fallbackLabel ?? 'Bill Detail';
  const billLabel =
    bill?.bill_type && bill?.bill_number ? `${bill.bill_type} ${bill.bill_number}` : null;
  const latestSummary = summaries[summaries.length - 1] ?? null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {billLabel && (
            <span className={`shrink-0 ${badge.neutral}`}>{billLabel}</span>
          )}
          {bill?.origin_chamber && (
            <span className={`shrink-0 ${chamberBadgeByName[bill.origin_chamber] ?? badge.neutral}`}>
              {bill.origin_chamber}
            </span>
          )}
          {bill?.update_date && (
            <span className={`text-xs ${textFaint}`}>Updated {formatDate(bill.update_date)}</span>
          )}
        </div>
        <h1 className={`text-lg font-semibold leading-snug ${textPrimary}`}>{title}</h1>
      </div>

      {/* Full text */}
      <TextPanel
        textVersions={textVersions}
        isLoading={isTextLoading}
        isError={isTextError}
        onFetch={onFetchText}
      />

      {/* Summary */}
      {latestSummary && (
        <section>
          <h2 className={`mb-2 text-sm font-semibold ${textSecondary}`}>Summary</h2>
          <div className={`prose prose-sm max-w-none rounded-lg border ${borderBase} bg-white dark:bg-gray-900 px-4 py-3 text-sm leading-relaxed ${textSecondary}`}>
            {parse(latestSummary.text, htmlParseOptions)}
          </div>
        </section>
      )}

      {/* Actions timeline */}
      {actions.length > 0 && (
        <section>
          <h2 className={`mb-3 text-sm font-semibold ${textSecondary}`}>
            Actions <span className={`font-normal ${textFaint}`}>({actions.length})</span>
          </h2>
          <ol className={`relative border-l ${borderBase}`}>
            {actions.map((action, i) => (
              <li key={i} className="mb-4 ml-4">
                <div className={`absolute -left-1.5 mt-1 h-3 w-3 rounded-full border ${borderSubtle} bg-gray-300 dark:bg-gray-600`} />
                <time className={`mb-0.5 block text-xs ${textFaint}`}>{formatDate(action.actionDate)}</time>
                <p className={`text-sm ${textSecondary}`}>{action.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
