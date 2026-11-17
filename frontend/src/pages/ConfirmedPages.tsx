import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { useOrder } from '@/hooks/orderHooks';
import { hhmm12, MAPS_URL, plaisir } from '@/lib/plaisir';
import { HankoStamp, SupportNote } from '@/components/plaisir/ui';

function useIds() { const { orderId } = useParams(); const id = Number(orderId); return { id, order: useOrder(Number.isFinite(id) ? id : null).data, details: useQuery({ queryKey: ['pl-det', id], queryFn: () => plaisir.details(id), enabled: Number.isFinite(id) }).data?.detail }; }

function Actions({ id }: { id: number }) {
  return <div className="mt-6 flex flex-wrap gap-3"><Link className="btn-yolk" to={`/orders/${id}`}>Track it</Link><Link className="btn-ink" to="/account">My account</Link><Link className="btn-ink" to="/me">Get started checklist</Link></div>;
}

export function PickupConfirmedPage() {
  const { id, order, details } = useIds();
  return (
    <div className="page page--narrow"><HankoStamp label="Order sent" yolk />
      <h1 className="h2-display mt-4">Thank you{details?.counterName ? `, ${details.counterName}` : ''}.</h1>
      <p className="mt-2">Order {order?.orderNumber}. {details?.pickupAt ? <>Pickup on <strong>{new Date(details.pickupAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</strong> at the counter.</> : null}</p>
      <p className="mt-1"><a className="underline" href={MAPS_URL} target="_blank" rel="noopener noreferrer">Directions</a></p>
      <Actions id={id} /><div className="mt-6"><SupportNote orderNumber={order?.orderNumber} /></div></div>
  );
}

export function BookConfirmedPage() {
  const { id, order, details } = useIds();
  const ics = async () => { const r = await apiClient.get(plaisir.icsUrl(id), { responseType: 'blob' }); const u = URL.createObjectURL(r.data); const a = document.createElement('a'); a.href = u; a.download = 'le-plaisir-table.ics'; a.click(); URL.revokeObjectURL(u); };
  return (
    <div className="page page--narrow"><HankoStamp label="Request sent" yolk />
      <h1 className="h2-display mt-4">We have your request.</h1>
      <p className="mt-2">{details ? <>Table for {details.partySize} on {details.date} at {hhmm12(String(details.slotStart))}. </> : null}Our host usually confirms within about 15 minutes during opening hours. Booking {order?.orderNumber}.</p>
      <div className="mt-4 flex flex-wrap gap-3"><button type="button" className="btn-ink" onClick={ics}>Add to calendar</button><a className="btn-ink" href={MAPS_URL} target="_blank" rel="noopener noreferrer">Directions</a></div>
      <Actions id={id} /><div className="mt-6"><SupportNote orderNumber={order?.orderNumber} /></div></div>
  );
}

export function TeamLunchConfirmedPage() {
  const { id, order, details } = useIds();
  return (
    <div className="page page--narrow"><HankoStamp label="Request sent" yolk />
      <h1 className="h2-display mt-4">Request received.</h1>
      <p className="mt-2">{details ? <>{details.headcount} guests on {details.date}. </> : null}We will usually call within 2 hours during opening hours with a menu and a price. Request {order?.orderNumber}.</p>
      <Actions id={id} /><div className="mt-6"><SupportNote orderNumber={order?.orderNumber} /></div></div>
  );
}
