'use client';

import { useState } from 'react';

export default function ExpandableText({ text }: { text: string | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return <span className="text-page-cream-muted">-</span>;

  const truncated = text.length > 100;

  if (!truncated || expanded) {
    return (
      <div className="whitespace-pre-wrap break-all font-body text-[12px] text-page-cream max-h-96 overflow-y-auto">
        {text}
        {truncated && (
          <button
            onClick={() => setExpanded(false)}
            className="ml-1 text-oxblood hover:underline hover:text-oxblood-bright transition-colors"
          >
            collapse
          </button>
        )}
      </div>
    );
  }

  return (
    <span className="font-body text-[12px] text-page-cream">
      {text.slice(0, 100)}...
      <button
        onClick={() => setExpanded(true)}
        className="ml-1 text-oxblood hover:underline hover:text-oxblood-bright transition-colors"
      >
        expand
      </button>
    </span>
  );
}
