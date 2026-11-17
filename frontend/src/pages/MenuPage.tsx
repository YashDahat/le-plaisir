import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '@/cart';
import { useMenu } from '@/lib/plaisir';
import { DishCard, PriceNote } from '@/components/plaisir/ui';

const FILTERS = ['All', 'Veg', 'Has egg', 'Non-veg', 'Small portions'] as const;

/** Used for both /menu and /order (pickup framing). */
export default function MenuPage({ pickup = false }: { pickup?: boolean }) {
  const { data, isLoading, isError } = useMenu();
  const { cartCount } = useCart();
  const [cat, setCat] = useState('All');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [q, setQ] = useState('');
  const cats = useMemo(() => ['All', ...Array.from(new Set((data ?? []).map((d) => d.category)))], [data]);
  const shown = (data ?? []).filter((d) => (cat === 'All' || d.category === cat)
    && (filter === 'All' || (filter === 'Veg' && d.diet === 'VEG') || (filter === 'Has egg' && d.diet === 'EGG') || (filter === 'Non-veg' && d.diet === 'NON_VEG') || (filter === 'Small portions' && d.options.length > 1))
    && (!q || d.name.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="page">
      <p className="sec-no">{pickup ? 'Counter pickup' : 'The menu'}</p>
      <h1 className="h2-display mt-1">{pickup ? 'Order for pickup' : 'Menu'}</h1>
      <p className="mt-2 max-w-2xl text-[var(--c-muted)]">{pickup ? 'Fill your pickup bag, choose a slot at checkout, pay by UPI or at the counter. Most dishes come in small and large plates.' : 'All-day breakfast, croissant sandwiches, pastas, seasonal dishes and a patisserie. Most dishes come in small and large plates.'}</p>
      <div className="mt-6 scroll-x flex gap-2 pb-2" role="tablist" aria-label="Categories">
        {cats.map((c) => <button key={c} type="button" role="tab" aria-pressed={cat === c} className="chip shrink-0" onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => <button key={f} type="button" aria-pressed={filter === f} className="chip" onClick={() => setFilter(f)}>{f}</button>)}
        <label className="sr-only" htmlFor="menu-q">Search the menu</label>
        <input id="menu-q" className="h-11 rounded border border-[var(--c-rule)] bg-[var(--c-surface)] px-3" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-4"><PriceNote show={(data ?? []).some((d) => !d.priceConfirmed)} /></div>
      {isLoading && <p className="mt-8">Loading the menu…</p>}
      {isError && <p className="mt-8" role="alert">We could not load the menu. Please try again, or <Link className="underline" to="/support">write to Support</Link>.</p>}
      {!isLoading && shown.length === 0 && !isError && <p className="mt-8">Nothing matches. Try another filter.</p>}
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {shown.map((d) => <li key={d.key} className="flex"><div className="w-full flex"><DishCard dish={d} /></div></li>)}
      </ul>
      {cartCount > 0 && (
        <div className="sticky bottom-3 mt-8 flex justify-end"><Link to="/cart" className="btn-yolk shadow-lg">Pickup bag ({cartCount}) →</Link></div>
      )}
    </div>
  );
}
