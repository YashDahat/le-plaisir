import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '@/cart';
import type { CartItem } from '@/cart';
import { useBranch } from '@/context/BranchContext';
import { useAuth } from '@/context/AuthContext';
import { orderService } from '@/services/orderService';
import { verifyPayment } from '@/services/paymentService';
import { loadRazorpay, openRazorpay } from '@/lib/razorpay';
import type { CartLineInput, PlaceOrderRequest, QuoteResponse } from '@/types/order';
import { addDays, hhmm12, isoDate, plaisir, rupees, useMenu } from '@/lib/plaisir';
import { Field, inputCls } from '@/components/plaisir/forms';
import { FormAlert, SupportNote } from '@/components/plaisir/ui';

const COIN_CONNECTOR = 'loyalty.coins';

function toLine(item: CartItem): CartLineInput {
  const md = (item.metadata ?? {}) as { itemType?: string; itemId?: number };
  const parts = String(item.id).split(':');
  return { itemType: String(md.itemType ?? parts[0] ?? 'PRODUCT'), itemId: Number(md.itemId ?? parts[1] ?? item.id), variantKey: item.variantKey ?? null, quantity: item.quantity };
}

/** Pickup checkout: choose a 15-minute slot, name for the counter, pay by UPI/online or at the counter, use coins. */
export default function CheckoutPage() {
  const { cartItems, totals, clearCart } = useCart();
  const { selectedBranchId } = useBranch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: menu } = useMenu();
  const lines = useMemo(() => cartItems.map(toLine), [cartItems]);
  const lead = useMemo(() => cartItems.some((c) => menu?.some((d) => d.leadHours > 0 && d.options.some((o) => `PRODUCT:${o.productId}` === String(c.id)))), [cartItems, menu]);
  const flavours = cartItems.map((c) => (c.metadata as { note?: string } | undefined)?.note).filter(Boolean).join('; ');
  const hasCake = lead;

  const [date, setDate] = useState(isoDate(new Date()));
  const [slot, setSlot] = useState('');
  const [name, setName] = useState('');
  const [cake, setCake] = useState('');
  const [note, setNote] = useState('');
  const [payCounter, setPayCounter] = useState(false);
  const [useCoins, setUseCoins] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [touched, setTouched] = useState(false);
  const [placing, setPlacing] = useState(false);

  const days = useMemo(() => Array.from({ length: 8 }, (_, i) => addDays(new Date(), i)), []);
  const { data: slots, isLoading } = useQuery({ queryKey: ['pl-pslots', date, lead], queryFn: () => plaisir.pickupSlots(date, lead) });
  useEffect(() => { if (!name && user?.username) setName(''); }, [user, name]);
  useEffect(() => {
    if (cartItems.length === 0) return;
    let on = true;
    orderService.quote({ items: lines, fulfillmentType: 'SELF_PICKUP' }).then((q) => { if (on) setQuote(q); }).catch(() => undefined);
    return () => { on = false; };
  }, [cartItems.length, lines]);

  const coinOption = quote?.options.find((o) => o.connectorId === COIN_CONNECTOR) ?? null;
  const coinOff = useCoins && coinOption ? Math.abs(coinOption.amount) : 0;
  const total = Math.max(0, totals.total - coinOff);
  const errors = [!slot && 'Choose a pickup slot', !name.trim() && 'Add a name for the counter', cake.length > 40 && 'Cake message is limited to 40 characters', note.length > 200 && 'Note is limited to 200 characters'].filter(Boolean) as string[];

  const place = async () => {
    setTouched(true);
    if (errors.length) return;
    const connectorSelections: Record<string, string> = {};
    if (useCoins && coinOption) connectorSelections[coinOption.connectorId] = coinOption.code;
    const req: PlaceOrderRequest = { items: lines, fulfillmentType: 'SELF_PICKUP', paymentMode: payCounter ? 'PAY_AT_COUNTER' : 'ONLINE', connectorSelections, branchId: selectedBranchId ?? undefined };
    setPlacing(true);
    try {
      const order = await orderService.place(req);
      try {
        await plaisir.attachPickup({ orderId: order.id, pickupAt: `${date}T${slot}:00`, counterName: name.trim(), cakeMessage: hasCake ? cake : undefined, flavours, note });
      } catch (e) {
        await orderService.cancel(order.id, 'Pickup slot could not be saved').catch(() => undefined);
        throw e; // already toasted by the interceptor
      }
      const done = () => { clearCart(); navigate(`/order/confirmed/${order.id}`); };
      if (!order.payment) { done(); return; }
      if (order.payment.gatewayKeyId === 'demo_key') {
        await verifyPayment({ gatewayOrderId: order.payment.gatewayOrderId, gatewayPaymentId: `demo_pay_${order.payment.gatewayOrderId}`, signature: 'demo_signature' });
        toast.success('Payment successful (demo mode)'); done(); return;
      }
      const ok = await loadRazorpay();
      if (!ok) { toast.error('Could not load the payment SDK'); clearCart(); navigate(`/orders/${order.id}`); return; }
      try {
        const r = await openRazorpay({ keyId: order.payment.gatewayKeyId, orderId: order.payment.gatewayOrderId, amount: order.payment.amount, currency: order.payment.currency, name: 'Le Plaisir', description: order.orderNumber });
        await verifyPayment({ gatewayOrderId: r.razorpay_order_id, gatewayPaymentId: r.razorpay_payment_id, signature: r.razorpay_signature });
        toast.success('Payment successful'); done();
      } catch { toast.message('Payment not completed. You can pay from your order.'); clearCart(); navigate(`/orders/${order.id}`); }
    } finally { setPlacing(false); }
  };

  if (cartItems.length === 0) return <div className="page page--narrow"><p data-testid="checkout-empty">Your pickup bag is empty. <Link className="underline" to="/order">Order for pickup</Link> or <Link className="underline" to="/book">book a table</Link>.</p></div>;

  return (
    <div className="page page--narrow space-y-6">
      <p className="sec-no">Counter pickup</p><h1 className="h2-display">Checkout</h1>
      <section className="cell p-4"><h2 className="text-xl mb-2">Your bag</h2>
        {cartItems.map((c) => <div key={`${c.id}:${c.variantKey ?? ''}`} className="flex justify-between py-1"><span>{c.name} × {c.quantity}</span><span>{rupees(c.unitPrice * c.quantity)}</span></div>)}
        {flavours && <p className="mt-2 text-sm text-[var(--c-muted)]">{flavours}</p>}
      </section>
      <fieldset><legend className="mb-2 text-xl font-display">Pickup day</legend>
        <div className="scroll-x flex gap-2 pb-2">{days.map((d) => { const v = isoDate(d); return <button key={v} type="button" aria-pressed={date === v} className="chip shrink-0" onClick={() => { setDate(v); setSlot(''); }}>{d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</button>; })}</div>
        {lead && <p className="text-sm">Whole cakes need 24 hours' notice, so earlier slots are not offered.</p>}
      </fieldset>
      <fieldset><legend className="mb-2 font-medium">Pickup time</legend>
        {isLoading ? <p>Loading slots…</p> : !slots || slots.length === 0 ? <p>No pickups that day. Try another day.</p> : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">{slots.map((s) => <button key={s.time} type="button" disabled={!s.available} aria-pressed={slot === s.time} className="chip justify-center disabled:opacity-40" onClick={() => setSlot(s.time)}>{hhmm12(s.time)}</button>)}</div>)}
      </fieldset>
      <Field id="nm" label="Name for the counter"><input id="nm" className={`${inputCls} ${touched && !name.trim() ? 'field-err' : ''}`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>
      {hasCake && <Field id="ck" label="Message on the cake (optional)" hint={`${cake.length}/40`}><input id="ck" maxLength={40} className={inputCls} value={cake} onChange={(e) => setCake(e.target.value)} /></Field>}
      <Field id="pn" label="Note (optional)" hint={`${note.length}/200`}><textarea id="pn" rows={2} maxLength={200} className={`${inputCls} h-auto py-2`} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <fieldset className="cell p-4"><legend className="px-1 font-medium">Payment</legend>
        <div role="radiogroup" className="flex flex-wrap gap-2"><button type="button" role="radio" aria-checked={!payCounter} className="chip" onClick={() => setPayCounter(false)}>UPI / online</button><button type="button" role="radio" aria-checked={payCounter} className="chip" onClick={() => setPayCounter(true)}>Pay at the counter</button></div>
        {coinOption && <label className="mt-3 flex items-center justify-between gap-3" htmlFor="use-coins"><span>{coinOption.label}{coinOption.detail ? <span className="text-[var(--c-muted)]"> · {coinOption.detail}</span> : null}</span><input id="use-coins" data-testid="checkout-use-coins" type="checkbox" className="h-5 w-5" checked={useCoins} onChange={(e) => setUseCoins(e.target.checked)} /></label>}
      </fieldset>
      <div className="flex justify-between text-xl font-semibold"><span>Total</span><span data-testid="checkout-total">{rupees(total)}</span></div>
      {touched && <FormAlert errors={errors} />}
      <button type="button" className="btn-yolk w-full" disabled={placing || errors.length > 0} data-testid="place-order" onClick={place}>{placing ? 'Placing…' : payCounter ? 'Place order (pay at counter)' : 'Place order & pay'}</button>
      <SupportNote compact /> <p className="text-sm"><Link to="/account" className="underline">My account</Link></p>
    </div>
  );
}
