import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useLoyaltyMe } from '@/hooks/loyaltyHooks';
import { plaisir, useFavourites, useMenu, useWays } from '@/lib/plaisir';
import { HankoStamp, SupportNote, WaysToEarn, useAddDish } from '@/components/plaisir/ui';

export default function AccountHubPage() {
  const { data: me } = useLoyaltyMe();
  const { data: list } = useQuery({ queryKey: ['pl-check'], queryFn: plaisir.checklist });
  const { data: favs } = useFavourites();
  const { data: menu } = useMenu();
  const { data: sugg } = useQuery({ queryKey: ['pl-mysug'], queryFn: plaisir.mySuggestions });
  useWays();
  const add = useAddDish();
  const done = (list ?? []).filter((i) => i.done).length;
  const favDishes = (menu ?? []).filter((d) => d.options.some((o) => favs?.includes(o.productId)));
  return (
    <div className="page page--narrow space-y-10">
      <div><p className="sec-no">Your corner</p><h1 className="h2-display mt-1">My Le Plaisir</h1>
        <p className="mt-2">{me ? <>You have <strong>{Number(me.coinBalance)}</strong> coins{me.tierName ? ` · ${me.tierName}` : ''}. </> : null}Profile, password and addresses live in <Link className="underline" to="/account">My account</Link>.</p></div>
      <nav aria-label="Account links" className="compartments sm:grid-cols-2">{[['/account', 'My account'], ['/orders', 'Orders & bookings'], ['/ideas', 'Suggest an idea'], ['/loyalty-terms', 'Loyalty terms'], ['/support', 'Support']].map(([h, l]) => <Link key={h} to={h} className="font-medium hover:underline">{l} →</Link>)}</nav>
      <section><h2 className="text-2xl mb-1">Get started</h2><p className="text-[var(--c-muted)] mb-3">{done} of {(list ?? []).length} done. Try each way of using Le Plaisir once.</p>
        <ul className="space-y-2">{(list ?? []).map((i) => <li key={i.id} className="cell flex items-center justify-between gap-3 p-3"><span>{i.label}{i.optional ? <span className="text-sm text-[var(--c-muted)]"> (for office folks)</span> : null}</span>{i.done ? <span className="scale-50 -m-4"><HankoStamp label="Done" /></span> : <Link className="btn-ink" to={i.href}>Try it</Link>}</li>)}</ul></section>
      <section><h2 className="text-2xl mb-2">Favourites</h2>{favDishes.length === 0 ? <p className="text-[var(--c-muted)]">Tap the heart on any dish. <Link className="underline" to="/menu">Browse the menu</Link>.</p> : <ul className="space-y-2">{favDishes.map((d) => <li key={d.key} className="cell flex items-center justify-between gap-3 p-3"><Link className="underline" to={`/menu/${d.slug}`}>{d.name}</Link><button type="button" className="btn-yolk" onClick={() => add(d, 0)}>Add to pickup bag</button></li>)}</ul>}</section>
      <section><h2 className="text-2xl mb-2">My ideas</h2>{!sugg || sugg.length === 0 ? <p className="text-[var(--c-muted)]">None yet. <Link className="underline" to="/ideas">Suggest one</Link>.</p> : <ul className="space-y-2">{sugg.map((s: any) => <li key={s.id} className="cell p-3">{s.text}<span className="ml-2 text-sm text-[var(--c-muted)]">{String(s.status).toLowerCase()}</span></li>)}</ul>}</section>
      <section><WaysToEarn /></section>
      <SupportNote />
    </div>
  );
}
