import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { plaisir, rupees, useMenu, useVitrine } from '@/lib/plaisir';
import { DishCard, Illus, PriceNote, SectionHead, useAddDish } from '@/components/plaisir/ui';

function MacaronBoxBuilder() {
  const { data: flavours } = useQuery({ queryKey: ['pl-flav'], queryFn: plaisir.flavours });
  const { data: menu } = useMenu();
  const add = useAddDish();
  const [size, setSize] = useState<6 | 12>(6);
  const [cells, setCells] = useState<string[]>([]);
  const [added, setAdded] = useState(false);
  const box = (menu ?? []).find((d) => d.name === `Macaron box of ${size}`);
  const colour = (n: string) => flavours?.find((f) => f.name === n)?.colourHex ?? '#ccc';
  const full = cells.length >= size;
  const mix = Object.entries(cells.reduce<Record<string, number>>((a, c) => ({ ...a, [c]: (a[c] ?? 0) + 1 }), {})).map(([n, k]) => `${n.toLowerCase()} ×${k}`).join(', ');
  return (
    <section aria-labelledby="mb" className="cell p-5">
      <h2 id="mb" className="text-2xl">Build a box</h2>
      <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Box size">
        {([6, 12] as const).map((s) => <button key={s} type="button" role="radio" aria-checked={size === s} className="chip" onClick={() => { setSize(s); setCells((c) => c.slice(0, s)); }}>Box of {s}{menu ? ` · ${rupees((menu.find((d) => d.name === `Macaron box of ${s}`)?.options[0].price) ?? 0)}` : ''}</button>)}
      </div>
      <ol className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Box cells">
        {Array.from({ length: size }).map((_, i) => (
          <li key={i}>
            <button type="button" aria-label={cells[i] ? `Cell ${i + 1}: ${cells[i]}. Remove` : `Cell ${i + 1}: empty`} disabled={!cells[i]} onClick={() => setCells((c) => c.filter((_, j) => j !== i))}
              className="h-14 w-full rounded-full border border-dashed border-[var(--c-ink)] disabled:cursor-default">
              {cells[i] && <span key={`${i}-${cells[i]}`} className="macaron-drop block h-full w-full rounded-full" style={{ background: colour(cells[i]) }} />}
            </button>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        {(flavours ?? []).filter((f) => f.available).map((f) => (
          <button key={f.id} type="button" className="chip" disabled={full} onClick={() => setCells((c) => [...c, f.name])}>
            <span aria-hidden="true" className="mr-2 inline-block h-3 w-3 rounded-full" style={{ background: f.colourHex }} />{f.name}
          </button>))}
      </div>
      <p aria-live="polite" className="mt-3 text-sm">{cells.length} of {size} chosen{mix ? `: ${mix}` : ''}.</p>
      <button type="button" className="btn-yolk mt-4" disabled={!full || !box} onClick={() => { if (box) { add(box, 0, `Flavours: ${mix}`); setAdded(true); setTimeout(() => setAdded(false), 1800); } }}>
        {added ? 'Added to pickup bag ✓' : 'Add box to pickup bag'}
      </button>
      <p className="mt-2 text-sm text-[var(--c-muted)]">Your flavour mix is sent with your pickup order. We start with rose and coffee; more flavours arrive as the counter adds them.</p>
    </section>
  );
}

export default function PatisseriePage() {
  const { data: menu } = useMenu();
  const { data: vit } = useVitrine();
  const pat = (menu ?? []).filter((d) => ['Patisserie', 'Whole cakes'].includes(d.category));
  return (
    <div className="page">
      <p className="sec-no">The counter at the door</p>
      <h1 className="h2-display mt-1">Patisserie</h1>
      <p className="mt-2 max-w-2xl text-[var(--c-muted)]">Cheesecakes, Sachertorte, panna cotta, macarons and crepes. Reserve for pickup and skip the wait. Whole cakes need a day's notice.</p>
      <div className="mt-8 grid gap-8 lg:grid-cols-2"><MacaronBoxBuilder />
        <div><SectionHead no="01" title="At the vitrine today." />{!vit || vit.length === 0 ? <p>Not set yet today.</p> : <ul className="space-y-2">{vit.map((d) => <li key={d.key} className="flex items-center gap-3"><Illus kind="cake" className="h-10 w-10" /><span>{d.name}</span>{d.soldOutToday && <span className="text-sm text-[var(--c-nonveg)]">Sold out today</span>}</li>)}</ul>}</div>
      </div>
      <div className="mt-10"><PriceNote show /></div>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{pat.map((d) => <li key={d.key} className="flex"><div className="w-full flex"><DishCard dish={d} /></div></li>)}</ul>
      <p className="mt-8"><Link to="/cart" className="btn-ink">Open pickup bag</Link></p>
    </div>
  );
}
