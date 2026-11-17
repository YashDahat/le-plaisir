import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useCart } from '@/cart';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { plaisir, rupees, useFavourites, useWays, WORKFLOWS, SUPPORT_PHONE, SUPPORT_TEL, type Dish, type Diet } from '@/lib/plaisir';
import { withToast } from '@/lib/apiToast';

/** Content is visible by default; once mounted (and motion is allowed) it settles in as it enters the viewport. */
export function Reveal({ as: Tag = 'div', className, children }: { as?: ElementType; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return; // already in view: stay put
    el.setAttribute('data-reveal', 'pending');
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { el.setAttribute('data-reveal', 'in'); io.disconnect(); }
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={className}>{children}</Tag>;
}

export function SectionHead({ no, title, children }: { no: string; title: string; children?: ReactNode }) {
  return (
    <Reveal className="mb-8">
      <div className="rule-top rule-draw mb-3" aria-hidden="true" />
      <p className="sec-no">No. {no}</p>
      <h2 className="h2-display mt-1">{title}</h2>
      {children}
    </Reveal>
  );
}

export function HankoStamp({ label, yolk }: { label: string; yolk?: boolean }) {
  return <span className={`hanko hanko-press ${yolk ? 'hanko--yolk' : ''}`} role="img" aria-label={label}>{label}</span>;
}

const DIET_LABEL: Record<Diet, string> = { VEG: 'Vegetarian', EGG: 'Contains egg', NON_VEG: 'Non-vegetarian' };
export function DietMark({ diet }: { diet: Diet }) {
  const c = diet === 'VEG' ? '#2E7D32' : diet === 'EGG' ? '#B7791F' : '#9A2B1F';
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[var(--c-muted)]" title={DIET_LABEL[diet]}>
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="1" y="1" width="12" height="12" fill="none" stroke={c} strokeWidth="1.5" /><circle cx="7" cy="7" r="3.2" fill={c} /></svg>
      {DIET_LABEL[diet]}
    </span>
  );
}

/** Single-weight ink line illustrations used until the owner uploads real photos. */
export function Illus({ kind, className }: { kind: 'macaron' | 'cake' | 'cup' | 'plate' | 'bread'; className?: string }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={`${kind} illustration`} style={{ color: 'var(--c-ink)' }}>
      {kind === 'macaron' && (<g {...p}><path d="M26 52c0-16 15-26 34-26s34 10 34 26z" /><path d="M24 62h72" strokeDasharray="2 6" /><path d="M26 72c0 16 15 26 34 26s34-10 34-26z" /></g>)}
      {kind === 'cake' && (<g {...p}><path d="M20 92 60 28l40 64z" /><path d="M36 66h48" /><path d="M46 48h28" /><circle cx="60" cy="22" r="5" /></g>)}
      {kind === 'cup' && (<g {...p}><path d="M24 46h58v22c0 14-12 24-29 24S24 82 24 68z" /><path d="M82 54h8a10 10 0 0 1 0 20h-9" /><path d="M40 28c-4 6 4 8 0 14M56 28c-4 6 4 8 0 14" /></g>)}
      {kind === 'plate' && (<g {...p}><circle cx="60" cy="62" r="38" /><circle cx="60" cy="62" r="24" /><path d="M18 22v24M24 22v24M12 22v24" /></g>)}
      {kind === 'bread' && (<g {...p}><path d="M18 78c-6-24 12-44 42-44s48 20 42 44z" /><path d="M42 48l10 22M62 44l10 26M82 50l6 20" /></g>)}
    </svg>
  );
}

export function SupportNote({ orderNumber, compact }: { orderNumber?: string; compact?: boolean }) {
  return (
    <p className="text-sm text-[var(--c-muted)]">
      {orderNumber ? 'Need help with this order? ' : 'Questions? '}
      <Link to="/support" className="underline font-medium text-[var(--c-anchor)]">Write to us on Support</Link>
      {orderNumber ? ` with order ${orderNumber}` : ''}.{' '}
      {!compact && <>We reply on the same thread, usually the same day, and email you when we do. For anything urgent today, call <a className="underline" href={SUPPORT_TEL}>{SUPPORT_PHONE}</a>.</>}
    </p>
  );
}

export function WaysToEarn({ heading = true }: { heading?: boolean }) {
  const { data, isLoading } = useWays();
  return (
    <div>
      {heading && <h3 className="text-xl mb-3">Ways to earn coins</h3>}
      {isLoading ? <p className="text-sm text-[var(--c-muted)]">Loading…</p> : !data || data.length === 0 ? (
        <p className="text-sm text-[var(--c-muted)]">Coin rules will show here once the team switches them on.</p>
      ) : (
        <ul className="divide-y border-y border-[var(--c-rule)]">
          {data.map((w) => (
            <li key={w.type} className="flex items-center justify-between gap-3 py-3">
              <span>{w.label}</span>
              <span className="font-semibold">+{Number(w.points)} coins{w.onceOnly ? ' (once)' : ''}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm text-[var(--c-muted)]">Coins are for taking part, never for a high rating. Spend them at checkout. <Link to="/loyalty-terms" className="underline">Loyalty terms</Link></p>
    </div>
  );
}

/** Vertical ruled tiers of a workflow's stages with friendly labels and expected times. */
export function StageTimeline({ workflow, current }: { workflow: string; current?: string | null }) {
  const wf = WORKFLOWS[workflow];
  if (!wf) return null;
  if (current === 'CANCELLED') return <p className="stage-tier" data-state="done">Cancelled</p>;
  if (current === 'NO_SHOW') return <p className="stage-tier" data-state="done">Marked as a no-show</p>;
  const idx = wf.stages.findIndex((s) => s[0] === current);
  return (
    <ol className="space-y-2" aria-label={`${wf.label} progress`}>
      {wf.stages.map(([code, label, mins], i) => {
        const state = i < idx ? 'done' : i === idx ? 'current' : 'todo';
        return (
          <li key={code} className="stage-tier" data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
            <span className={state === 'todo' ? 'text-[var(--c-muted)]' : 'font-medium'}>{label}</span>
            {state === 'current' && mins ? <span className="ml-2 text-sm text-[var(--c-muted)]">usually within {mins >= 60 ? `${Math.round(mins / 60)} h` : `${mins} min`}</span> : null}
            {state === 'done' && <span className="sr-only"> (done)</span>}
          </li>
        );
      })}
    </ol>
  );
}

export function FavButton({ productId }: { productId: number }) {
  const { isAuthenticated } = useAuth();
  const { data } = useFavourites();
  const qc = useQueryClient();
  const on = !!data?.includes(productId);
  if (!isAuthenticated) return <Link to="/login" aria-label="Sign in to save favourites" className="inline-flex h-11 w-11 items-center justify-center"><Heart size={20} aria-hidden="true" /></Link>;
  return (
    <button type="button" aria-pressed={on} aria-label={on ? 'Remove from favourites' : 'Save as favourite'} className="inline-flex h-11 w-11 items-center justify-center"
      onClick={async () => { await withToast(plaisir.toggleFav(productId), on ? 'Removed from favourites' : 'Saved to favourites'); qc.invalidateQueries({ queryKey: ['pl-favs'] }); }}>
      <Heart size={20} fill={on ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  );
}

export function useAddDish() {
  const { addItem } = useCart();
  return (d: Dish, optIdx: number, note?: string) => {
    const o = d.options[optIdx] ?? d.options[0];
    addItem({ id: `PRODUCT:${o.productId}`, name: o.name, unitPrice: Number(o.price), metadata: { itemType: 'PRODUCT', itemId: o.productId, ...(note ? { note } : {}) } }, 1);
  };
}

export function DishCard({ dish, onAdded }: { dish: Dish; onAdded?: () => void }) {
  const [opt, setOpt] = useState(0);
  const add = useAddDish();
  const [added, setAdded] = useState(false);
  const o = dish.options[opt] ?? dish.options[0];
  const windowTxt = dish.availableFrom ? `Weekdays ${dish.availableFrom.slice(0, 5)}–${dish.availableTo?.slice(0, 5)}` : null;
  return (
    <article className="cell flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg"><a href={`/menu/${dish.slug}`} className="hover:underline">{dish.name}</a></h3>
          <DietMark diet={dish.diet} />
        </div>
        <FavButton productId={o.productId} />
      </div>
      {dish.shortNote && <p className="mt-1 text-sm text-[var(--c-muted)]">{dish.shortNote}</p>}
      {windowTxt && <p className="mt-1 text-sm">{windowTxt}</p>}
      {dish.leadHours > 0 && <p className="mt-1 text-sm">Order {dish.leadHours} hours ahead</p>}
      {dish.options.length > 1 && (
        <div role="radiogroup" aria-label="Portion" className="mt-3 flex flex-wrap gap-2">
          {dish.options.map((x, i) => (
            <button key={x.productId} type="button" role="radio" aria-checked={opt === i} className="chip" onClick={() => setOpt(i)}>{x.portion} · {rupees(x.price)}</button>
          ))}
        </div>
      )}
      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <span className="text-lg font-semibold">{rupees(o.price)}</span>
        {dish.soldOutToday ? <span className="text-sm font-medium text-[var(--c-nonveg)]">Sold out today</span> : (
          <button type="button" className="btn-yolk" onClick={() => { add(dish, opt); setAdded(true); onAdded?.(); setTimeout(() => setAdded(false), 1500); }}>
            {added ? 'Added ✓' : 'Add to pickup bag'}
          </button>
        )}
      </div>
    </article>
  );
}

export function PriceNote({ show }: { show: boolean }) {
  return show ? <p className="text-sm text-[var(--c-muted)]">Prices are indicative. Please confirm at the counter. Ask us about ingredients.</p> : null;
}

export function FormAlert({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return <div role="alert" className="form-alert"><p className="font-medium">Please fix the following:</p><ul className="list-disc pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul></div>;
}

export function WorkflowPromises() {
  return (
    <div className="compartments md:grid-cols-3" style={{ gridTemplateColumns: undefined }}>
      {[
        { n: '01', t: 'Book a table', d: 'Free. Our host usually confirms within about 15 minutes during opening hours.', cta: 'Book a table', href: '/book', primary: true },
        { n: '02', t: 'Order for pickup', d: 'Pay by UPI, collect at the counter. Skip the wait.', cta: 'Order for pickup', href: '/order' },
        { n: '03', t: 'Team lunches for 11–60', d: 'Tell us the date and headcount. We will call with a menu and a price.', cta: 'Plan a team lunch', href: '/team-lunch' },
      ].map((c) => (
        <div key={c.n} className="md:[grid-column:auto]">
          <p className="sec-no">Tier {c.n}</p>
          <h3 className="text-xl mt-1">{c.t}</h3>
          <p className="mt-2 text-[var(--c-muted)]">{c.d}</p>
          <Link to={c.href} className={`${c.primary ? 'btn-yolk' : 'btn-ink'} mt-4`}>{c.cta}</Link>
        </div>
      ))}
    </div>
  );
}
