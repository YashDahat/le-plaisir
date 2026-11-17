import type { ReactNode } from 'react';

export const inputCls = 'h-11 w-full rounded border border-[var(--c-rule)] bg-[var(--c-surface)] px-3 text-[var(--c-ink)]';

export function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string | null; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-medium">{label}</label>
      {children}
      {hint && <p id={`${id}-hint`} className="mt-1 text-sm text-[var(--c-muted)]">{hint}</p>}
      {error && <p className="mt-1 text-sm text-[var(--c-nonveg)]">{error}</p>}
    </div>
  );
}
