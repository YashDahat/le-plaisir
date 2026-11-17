import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMyOrders } from '@/hooks/orderHooks';
import { rupees, WORKFLOWS } from '@/lib/plaisir';
import { SupportNote } from '@/components/plaisir/ui';

const TABS: [string, string | null][] = [['All', null], ['Pickup', 'pickup'], ['Tables', 'table'], ['Team lunches', 'gathering']];

export default function MyOrdersPage() {
  const { data, isLoading } = useMyOrders();
  const [tab, setTab] = useState<string | null>(null);
  const list = (data ?? []).filter((o) => !tab || o.workflowCode === tab);
  return (
    <div className="page page--narrow">
      <p className="sec-no">My orders & bookings</p><h1 className="h2-display mt-1">Orders & bookings</h1>
      <div className="mt-4 flex flex-wrap gap-2" role="tablist">{TABS.map(([l, k]) => <button key={l} type="button" role="tab" aria-pressed={tab === k} className="chip" onClick={() => setTab(k)}>{l}</button>)}</div>
      {isLoading && <p className="mt-6">Loading…</p>}
      {!isLoading && list.length === 0 && <div className="cell mt-6 p-6"><p>No orders yet. The cheesecake is a good place to start.</p><div className="mt-3 flex flex-wrap gap-3"><Link className="btn-yolk" to="/order">Order for pickup</Link><Link className="btn-ink" to="/book">Book a table</Link></div></div>}
      <ul className="mt-6 space-y-3">{list.map((o) => {
        const wf = WORKFLOWS[o.workflowCode];
        const stage = wf?.stages.find((s) => s[0] === o.currentStageCode)?.[1] ?? (o.currentStageCode === 'CANCELLED' ? 'Cancelled' : o.currentStageCode);
        return <li key={o.id}><Link to={`/orders/${o.id}`} className="cell flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-[var(--c-base)]"><span><span className="font-medium">{o.orderNumber}</span><span className="block text-sm text-[var(--c-muted)]">{wf?.label ?? o.workflowCode} · {new Date(o.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span></span><span className="text-right"><span className="block">{stage}</span><span className="text-sm">{Number(o.total) > 0 ? rupees(o.total) : 'Free'}</span></span></Link></li>;
      })}</ul>
      <div className="mt-8"><SupportNote /></div>
    </div>
  );
}
