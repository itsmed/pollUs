'use client';

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
} from '@/lib/api/bills';

// Tags that must never be rendered, regardless of where they appear.
const BLOCKED_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed',
  'form', 'input', 'button', 'link', 'meta',
]);

const htmlParseOptions: HTMLReactParserOptions = {
  replace(domNode: DOMNode) {
    if (!(domNode instanceof Element)) return;

    if (BLOCKED_TAGS.has(domNode.name)) {
      // Remove the element entirely
      return <></>;
    }

    // Force all anchor links to open in a new tab safely
    if (domNode.name === 'a') {
      return (
        <a
          href={domNode.attribs.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
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
      <button
        onClick={handleClick}
        className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
      >
        View Full Text
      </button>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-gray-400">Loading text versions…</p>;
  }

  if (isError) {
    return <p className="text-sm text-red-500">Failed to load text versions.</p>;
  }

  if (textVersions.length === 0) {
    return <p className="text-sm text-gray-400">No text versions available yet.</p>;
  }

  // Show the most recent version's formats
  const latest = textVersions[0];
  const htmlFormat = latest.formats.find((f) => f.type === 'Formatted Text');
  const pdfFormat = latest.formats.find((f) => f.type === 'PDF');

  return (
    <div className="flex flex-wrap gap-2">
      {htmlFormat && (
        <a
          href={htmlFormat.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
        >
          Full Text (HTML)
        </a>
      )}
      {pdfFormat && (
        <a
          href={pdfFormat.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
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
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
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
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
              {billLabel}
            </span>
          )}
          {bill?.origin_chamber && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
              {bill.origin_chamber}
            </span>
          )}
          {bill?.update_date && (
            <span className="text-xs text-gray-400">Updated {formatDate(bill.update_date)}</span>
          )}
        </div>
        <h1 className="text-lg font-semibold leading-snug text-gray-900">{title}</h1>
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
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Summary</h2>
          <div className="prose prose-sm max-w-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-700">
            {parse(latestSummary.text, htmlParseOptions)}
          </div>
        </section>
      )}

      {/* Actions timeline */}
      {actions.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            Actions <span className="font-normal text-gray-400">({actions.length})</span>
          </h2>
          <ol className="relative border-l border-gray-200">
            {actions.map((action, i) => (
              <li key={i} className="mb-4 ml-4">
                <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border border-white bg-gray-300" />
                <time className="mb-0.5 block text-xs text-gray-400">{formatDate(action.actionDate)}</time>
                <p className="text-sm text-gray-700">{action.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
