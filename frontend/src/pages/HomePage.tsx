import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/cart';
import { plaisir, useVitrine, useMenu, rupees, MAPS_URL, SUPPORT_PHONE, SUPPORT_TEL, hhmm12 } from '@/lib/plaisir';
import { DietMark, HankoStamp, Illus, Reveal, SectionHead, SupportNote, WaysToEarn, WorkflowPromises, useAddDish } from '@/components/plaisir/ui';

function WelcomeBack() {
  const { data } = useQuery({ queryKey: ['pl-welcome'], queryFn: plaisir.welcome });
  const { addItem } = useCart();
  if (!data) return null;
  const n = data.next;
  return (
    <div className="cell p-4 bg-[var(--c-graphite)] text-[var(--c-on-dark)]" data-testid="welcome-back">
      <p className="font-display text-2xl">Welcome back, {data.firstName}.</p>
      <p className="mt-1">You have <strong>{Number(data.coins)}</strong> coins. <Link className="underline text-[var(--c-accent)]" to="/account">My account</Link></p>
      {n?.kind === 'BOOKING' && <p className="mt-2">Your table on {n.date} at {hhmm12(String(n.time))} for {n.partySize}. <Link className="underline text-[var(--c-accent)]" to={`/orders/${n.orderId}`}>View</Link></p>}
      {n?.kind === 'GATHERING' && <p className="mt-2">Your team-lunch request is in progress. <Link className="underline text-[var(--c-accent)]" to={`/orders/${n.orderId}`}>See where it is</Link></p>}
      {n?.kind === 'REORDER' && (
        <button type="button" className="btn-yolk mt-3" onClick={() => n.lines?.forEach((l) => addItem({ id: `PRODUCT:${l.itemId}`, name: l.name, unitPrice: Number(l.unitPrice), imageUrl: l.imageUrl, metadata: { itemType: 'PRODUCT', itemId: l.itemId } }, l.quantity))}>
          Reorder your last pickup
        </button>
      )}
    </div>
  );
}

function GuestInvite() {
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem('pl-guest-hide') === '1'; } catch { return false; } });
  if (hidden) return null;
  return (
    <div className="cell p-4">
      <p className="font-medium">Join free: earn coins when you review a dish, share feedback or suggest an idea, and spend them on your next pickup.</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Link to="/signup" className="btn-ink">Create account</Link>
        <button type="button" className="chip" onClick={() => { try { localStorage.setItem('pl-guest-hide', '1'); } catch { /* ignore */ } setHidden(true); }}>Just browsing</button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const { data: vit } = useVitrine();
  const { data: menu } = useMenu();
  const add = useAddDish();
  const sig = (menu ?? []).filter((d) => d.signature).slice(0, 5);

  return (
    <div>
      {/* No. 00 hero: a ruled compartment grid, the lids lift away once on load */}
      <section className="bg-[var(--c-base)]">
        <div className="site-container py-[var(--page-y)]">
          <div className="grid gap-0 border border-[var(--c-rule)] md:grid-cols-6 md:grid-rows-2" style={{ borderRadius: 3 }}>
            <div className="p-6 md:col-span-4 md:row-span-2 md:p-10 border-b md:border-b-0 md:border-r border-[var(--c-rule)]">
              <p className="sec-no">Prabhat Road · Deccan Gymkhana · since 2012</p>
              <h1 className="h1-display mt-3">Le Plaisir</h1>
              <p className="font-display text-2xl mt-1 text-[var(--c-muted)]" lang="mr">ले प्लेझिर</p>
              <p className="mt-5 max-w-xl text-lg">A European bistro and patisserie that has tasted the same, every visit, since 2012.</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link to="/book" className="btn-yolk">Book a table</Link>
                <Link to="/order" className="btn-ink">Order for pickup</Link>
                <Link to="/team-lunch" className="underline font-medium px-2 py-3">Plan a team lunch →</Link>
              </div>
              <div className="mt-8">
                {isAuthenticated ? <WelcomeBack /> : (
                  <ul className="flex flex-wrap gap-2 text-sm">
                    <li className="chip">Open daily 8 am – 10:45 pm</li>
                    <li className="chip"><a href={MAPS_URL} target="_blank" rel="noopener noreferrer">4.4★ from 11,844 Google reviews</a></li>
                  </ul>
                )}
              </div>
            </div>
            <div className="relative flex items-center justify-center bg-[var(--c-accent)] p-6 md:col-span-2 border-b border-[var(--c-rule)] min-h-[10rem]">
              <HankoStamp label={'since 2012'} yolk />
              <span className="lid" style={{ ['--d' as string]: '80ms' }} aria-hidden="true" />
            </div>
            <div className="relative grid grid-cols-2 md:col-span-2">
              <div className="relative flex items-center justify-center p-4 border-r border-[var(--c-rule)]"><Illus kind="macaron" className="h-20 w-20" /><span className="lid" style={{ ['--d' as string]: '160ms' }} aria-hidden="true" /></div>
              <div className="relative flex items-center justify-center p-4 bg-[var(--c-graphite)] text-[var(--c-on-dark)]"><p className="text-center text-sm">At the vitrine today<br /><span className="font-display text-3xl">{vit ? vit.length : '–'}</span></p><span className="lid" style={{ ['--d' as string]: '240ms' }} aria-hidden="true" /></div>
            </div>
          </div>
          {!isAuthenticated && <div className="mt-4"><GuestInvite /></div>}
        </div>
      </section>

      <section className="section"><div className="site-container grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5"><SectionHead no="01" title="Who we are." /></div>
        <Reveal className="lg:col-span-7">
          <p className="text-lg">It began in 2012 in a small room on Bhandarkar Road. Our chef trained as a marine engineer, then at Le Cordon Bleu, then in kitchens in Sydney, and came home to cook the food he loved. We moved to Prabhat Road for more tables; the recipes didn't move an inch.</p>
          <Link to="/story" className="btn-ink mt-5">Read our story</Link>
        </Reveal>
      </div></section>

      <section className="section bg-[var(--c-surface)] border-y border-[var(--c-rule)]"><div className="site-container">
        <SectionHead no="02" title="At the vitrine today."><p className="mt-2 text-[var(--c-muted)]">Set by our counter staff each day. When something sells out, it says so.</p></SectionHead>
        {!vit || vit.length === 0 ? <p className="text-[var(--c-muted)]">The counter team has not set today's vitrine yet. See the <Link className="underline" to="/patisserie">patisserie</Link>.</p> : (
          <ul className="grid gap-0 border border-[var(--c-rule)] sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {vit.map((d) => (
              <li key={d.key} className="p-4 border-b border-r border-[var(--c-rule)] flex flex-col gap-2">
                <Illus kind={d.category === 'Macaron boxes' ? 'macaron' : 'cake'} className="h-16 w-16" />
                <p className="font-medium">{d.name}</p><DietMark diet={d.diet} />
                <div className="mt-auto flex items-center justify-between gap-2"><span>{rupees(d.options[0].price)}</span>
                  {d.soldOutToday ? <span className="text-sm text-[var(--c-nonveg)]">Sold out today</span> : <button type="button" className="btn-yolk" onClick={() => add(d, 0)}>Reserve for pickup</button>}
                </div>
              </li>))}
          </ul>)}
        <div className="mt-5 flex flex-wrap gap-3"><Link to="/patisserie" className="btn-ink">Build a box of six</Link><Link to="/cart" className="underline py-3">Open pickup bag</Link></div>
      </div></section>

      <section className="section"><div className="site-container">
        <SectionHead no="03" title="What people come back for."><p className="mt-2 text-[var(--c-muted)]">Most dishes come in small and large plates.</p></SectionHead>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {sig.map((d) => (<li key={d.key} className="cell p-4"><p className="font-display text-xl">{d.name}</p><DietMark diet={d.diet} /><p className="mt-2 text-sm">{d.options.map((o) => `${o.portion ?? ''} ${rupees(o.price)}`.trim()).join(' · ')}</p><Link to={`/menu/${d.slug}`} className="underline mt-2 inline-block">See it</Link></li>))}
        </ul>
        <p className="mt-4 text-sm text-[var(--c-muted)]">Prices are indicative. Please confirm at the counter.</p>
      </div></section>

      <section className="section bg-[var(--c-surface)] border-y border-[var(--c-rule)]"><div className="site-container"><SectionHead no="04" title="Skip the wait." /><WorkflowPromises /></div></section>

      <section className="section"><div className="site-container grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5"><SectionHead no="05" title="Ways to earn." /><p>Reviews earn coins for being written, not for the stars. We never hide or reorder reviews.</p>{isAuthenticated ? <Link to="/me" className="btn-ink mt-4">My coins & checklist</Link> : <Link to="/signup" className="btn-yolk mt-4">Join free</Link>}</div>
        <div className="lg:col-span-7"><WaysToEarn heading={false} /></div>
      </div></section>

      <section className="section bg-[var(--c-graphite)] text-[var(--c-on-dark)]"><div className="site-container grid gap-8 lg:grid-cols-2">
        <div><p className="sec-no text-[var(--c-on-dark)]">No. 06</p><h2 className="h2-display mt-1">Find us.</h2>
          <address className="not-italic mt-4">Rajkamal, Survey No. 759/125, Prabhat Road,<br />opposite Cox and Kings, near Kelkar Nursing Home,<br />Deccan Gymkhana, Pune 411004</address>
          <p className="mt-3">Open daily, 8 am – 10:45 pm</p>
          <div className="mt-5 flex flex-wrap gap-3"><a className="btn-yolk" href={SUPPORT_TEL}>Call {SUPPORT_PHONE}</a><a className="btn-ink !text-[var(--c-on-dark)] !border-[var(--c-on-dark)]" href={MAPS_URL} target="_blank" rel="noopener noreferrer">Directions</a></div></div>
        <div className="[&_p]:!text-[var(--c-on-dark)] [&_a]:!text-[var(--c-accent)]"><SupportNote /></div>
      </div></section>
    </div>
  );
}
