import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCancelOrder, useOrder } from '@/hooks/orderHooks';
import FeedbackForm from '@/components/FeedbackForm';
import { coinsFor, hhmm12, MAPS_URL, plaisir, rupees, useWays, WORKFLOWS } from '@/lib/plaisir';
import { HankoStamp, StageTimeline, SupportNote } from '@/components/plaisir/ui';

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function OrderTrackPage() {
  const { id } = useParams();
  const oid = id ? Number(id) : null;
  const { data: o, isLoading, isError } = useOrder(oid);
  const { data: det } = useQuery({ queryKey: ['pl-det', oid], queryFn: () => plaisir.details(oid!), enabled: oid != null });
  const { data: ways } = useWays();
  const cancel = useCancelOrder();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  if (isLoading) return <div className="page page--narrow"><p>Loading…</p></div>;
  if (isError || !o) return <div className="page page--narrow"><p>We could not find that order. <Link className="underline" to="/orders">Back to orders</Link>.</p><SupportNote /></div>;
  const wf = WORKFLOWS[o.workflowCode];
  const d = det?.detail ?? null;
  const done = wf && o.currentStageCode === wf.success;
  const fb = coinsFor(ways, 'FEEDBACK');
  return (
    <div className="page page--narrow space-y-6">
      <Link to="/orders" className="underline">← Orders & bookings</Link>
      <div className="flex items-start justify-between gap-4"><div><p className="sec-no">{wf?.label ?? o.workflowCode}</p><h1 className="h2-display mt-1">{o.orderNumber}</h1></div>{done && <HankoStamp label="Done" yolk />}</div>

      <section className="cell p-4"><h2 className="text-xl mb-3">Progress</h2><StageTimeline workflow={o.workflowCode} current={o.currentStageCode} /></section>

      {det?.kind === 'PICKUP' && d && <section className="cell p-4"><h2 className="text-xl mb-2">Pickup</h2><p>{new Date(d.pickupAt).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}, name: {d.counterName}</p>{d.cakeMessage && <p>Cake message: {d.cakeMessage}</p>}{d.flavours && <p>{d.flavours}</p>}{d.note && <p>Note: {d.note}</p>}<a className="underline" href={MAPS_URL} target="_blank" rel="noopener noreferrer">Directions</a></section>}
      {det?.kind === 'BOOKING' && d && <section className="cell p-4"><h2 className="text-xl mb-2">Table</h2><p>{d.date} at {hhmm12(String(d.slotStart))} for {d.partySize}. Occasion: {d.occasion}. Seating: {d.seatingPref}.</p><a className="underline" href={MAPS_URL} target="_blank" rel="noopener noreferrer">Directions</a></section>}
      {det?.kind === 'GATHERING' && d && <section className="cell p-4"><h2 className="text-xl mb-2">Your request</h2><p>{d.groupName}: {d.headcount} guests ({d.vegCount} veg) on {d.date} at {hhmm12(String(d.time))}.</p>{d.quotedTotal != null && <p className="mt-2 font-semibold">Our quote: {rupees(d.quotedTotal)}</p>}{d.quoteNote && <p>{d.quoteNote}</p>}</section>}

      {o.items.length > 0 && Number(o.total) > 0 && <section className="cell p-4"><h2 className="text-xl mb-2">Items</h2>{o.items.map((it, i) => <div key={i} className="flex justify-between py-1"><span>{it.name} × {it.quantity}</span><span>{rupees(it.unitPrice * it.quantity)}</span></div>)}<div className="mt-2 flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>{rupees(o.total)}</span></div><p className="mt-1 text-sm text-[var(--c-muted)]">Payment: {o.paymentState.replace('_', ' ').toLowerCase()}</p></section>}

      {o.cancellable && !confirming && <button type="button" className="btn-ink" onClick={() => setConfirming(true)}>Cancel{Number(o.total) > 0 ? '' : ' (free)'}</button>}
      {confirming && <section className="cell p-4 space-y-3" role="alertdialog" aria-label="Confirm cancellation"><p>{Number(o.total) > 0 ? (o.refundPreview != null ? `Refund if you cancel now: ${rupees(o.refundPreview)}.` : 'Refund as per the policy for this stage.') : 'Free to cancel.'}</p><label htmlFor="rs" className="block">Reason (optional)</label><textarea id="rs" className="w-full rounded border border-[var(--c-rule)] p-2" value={reason} onChange={(e) => setReason(e.target.value)} /><div className="flex gap-3"><button type="button" className="btn-yolk" disabled={cancel.isPending} onClick={() => cancel.mutate({ id: o.id, reason: reason || 'Cancelled by customer' }, { onSuccess: () => setConfirming(false) })}>Yes, cancel</button><button type="button" className="btn-ink" onClick={() => setConfirming(false)}>Keep it</button></div></section>}

      {done && (
        <section className="cell p-4"><h2 className="text-xl mb-2">How was it?</h2>
          <p>{fb != null ? `Share feedback and earn ${fb} coins. ` : 'Share feedback. '}Coins are for taking part, not for stars.</p>
          {o.workflowCode === 'pickup' && <ul className="mt-3 space-y-1">{o.items.map((it, i) => <li key={i}><Link className="underline" to={`/menu/${slugify(it.name)}#rate`}>Rate {it.name}</Link></li>)}</ul>}
          {o.workflowCode === 'table' && <p className="mt-2"><Link className="underline" to="/menu">Loved a dish? Rate it</Link></p>}
          {o.workflowCode === 'gathering' && <p className="mt-2"><a className="underline" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Team lunches at Le Plaisir, Pune: ${window.location.origin}/team-lunch`)}`}>Share with your team on WhatsApp</a></p>}
          {!o.feedbackSubmitted && <FeedbackForm orderId={o.id} />}
        </section>)}

      <div className="flex flex-wrap gap-4"><Link className="underline" to="/account">My account</Link><Link className="underline" to="/me">Checklist & coins</Link></div>
      <SupportNote orderNumber={o.orderNumber} />
    </div>
  );
}
