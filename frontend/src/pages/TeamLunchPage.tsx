import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { addDays, isoDate, plaisir, validPhone } from '@/lib/plaisir';
import { Field, inputCls } from '@/components/plaisir/forms';
import { FormAlert, SupportNote } from '@/components/plaisir/ui';

const DRAFT = 'pl-team-draft';
const BUDGETS = ['₹400–600', '₹600–900', '₹900+', 'Suggest for us'];

export default function TeamLunchPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [type, setType] = useState<'TEAM_LUNCH' | 'LARGE_TABLE'>('TEAM_LUNCH');
  const [group, setGroup] = useState('');
  const [date, setDate] = useState(sp.get('date') && sp.get('date')! > isoDate(new Date()) ? sp.get('date')! : isoDate(addDays(new Date(), 1)));
  const [time, setTime] = useState('13:00');
  const [head, setHead] = useState('15');
  const [veg, setVeg] = useState('5');
  const [budget, setBudget] = useState('Suggest for us');
  const [mode, setMode] = useState<'PICKUP' | 'DINE_IN' | 'DISCUSS_DELIVERY'>('DINE_IN');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { try { const r = sessionStorage.getItem(DRAFT); if (r) { const d = JSON.parse(r); setType(d.type); setGroup(d.group); setDate(d.date); setTime(d.time); setHead(d.head); setVeg(d.veg); setBudget(d.budget); setMode(d.mode); setPhone(d.phone); setEmail(d.email); setNote(d.note); sessionStorage.removeItem(DRAFT); } } catch { /* ignore */ } }, []);

  const h = Number(head), v = Number(veg);
  const errors = [
    !group.trim() && 'Add your company or group name',
    date <= isoDate(new Date()) && 'Choose a date from tomorrow onwards',
    type === 'TEAM_LUNCH' && (time < '11:30' || time > '15:30') && 'Team lunches run 11:30 am to 3:30 pm',
    !(h >= 11 && h <= 60) && 'Headcount should be between 11 and 60',
    !(v >= 0 && v <= h) && 'Veg count cannot be more than the headcount',
    !validPhone(phone) && 'Enter a valid Indian mobile number',
    email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && 'Enter a valid work email or leave it blank',
  ].filter(Boolean) as string[];

  const submit = async () => {
    setTouched(true);
    if (errors.length) return;
    if (!isAuthenticated) { try { sessionStorage.setItem(DRAFT, JSON.stringify({ type, group, date, time, head, veg, budget, mode, phone, email, note })); } catch { /* ignore */ } navigate('/login?redirect=/team-lunch'); return; }
    setBusy(true);
    try { const r = await plaisir.gathering({ type, groupName: group, date, time, headcount: h, vegCount: v, budgetBand: budget, mode, phone, email, note }); navigate(`/team-lunch/confirmed/${r.orderId}`); } finally { setBusy(false); }
  };
  const bad = (c: boolean) => (touched && c ? 'field-err' : '');

  return (
    <div>
      <section className="bg-[var(--c-surface)] border-b border-[var(--c-rule)]"><div className="site-container py-[var(--section-y)]">
        <p className="sec-no">Tier 03 · Team lunches & large tables</p><h1 className="h1-display mt-2" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>Team lunch, sorted.</h1>
        <p className="mt-3 max-w-2xl text-lg">Tell us the date, headcount and how many are veg. We will call within about two hours (during opening hours) with a menu and a price. No payment is taken here.</p>
      </div></section>
      <div className="page page--narrow space-y-6">
        <fieldset><legend className="mb-2 font-medium">What is it for?</legend><div className="flex gap-2" role="radiogroup">{([['TEAM_LUNCH', 'Team lunch (11:30–3:30)'], ['LARGE_TABLE', 'Large table (11+ guests)']] as const).map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={type === k} className="chip" onClick={() => setType(k)}>{l}</button>)}</div></fieldset>
        <Field id="grp" label="Company or group name" error={touched && !group.trim() ? 'Required' : null}><input id="grp" className={`${inputCls} ${bad(!group.trim())}`} value={group} onChange={(e) => setGroup(e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="dt" label="Date"><input id="dt" type="date" min={isoDate(addDays(new Date(), 1))} className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field id="tm" label="Time"><input id="tm" type="time" className={`${inputCls} ${bad(type === 'TEAM_LUNCH' && (time < '11:30' || time > '15:30'))}`} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
          <Field id="hc" label="Headcount (11–60)"><input id="hc" inputMode="numeric" className={`${inputCls} ${bad(!(h >= 11 && h <= 60))}`} value={head} onChange={(e) => setHead(e.target.value.replace(/\D/g, ''))} /></Field>
          <Field id="vc" label="How many are veg?"><input id="vc" inputMode="numeric" className={`${inputCls} ${bad(!(v >= 0 && v <= h))}`} value={veg} onChange={(e) => setVeg(e.target.value.replace(/\D/g, ''))} /></Field>
        </div>
        <Field id="bud" label="Budget per head"><select id="bud" className={inputCls} value={budget} onChange={(e) => setBudget(e.target.value)}>{BUDGETS.map((b) => <option key={b}>{b}</option>)}</select></Field>
        <Field id="mode" label="How would you like it?"><select id="mode" className={inputCls} value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}><option value="DINE_IN">Dine in</option><option value="PICKUP">Collect from the counter</option><option value="DISCUSS_DELIVERY">Talk to us about delivery</option></select></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="ph" label="Contact mobile" error={touched && !validPhone(phone) ? 'Enter a valid mobile number' : null}><input id="ph" inputMode="tel" className={`${inputCls} ${bad(!validPhone(phone))}`} value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <Field id="em" label="Work email (optional)"><input id="em" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        </div>
        <Field id="nt" label="Allergies, egg-free needs, anything else" hint={`${note.length}/500`}><textarea id="nt" rows={3} maxLength={500} className={`${inputCls} h-auto py-2`} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        {touched && <FormAlert errors={errors} />}
        <button type="button" className="btn-yolk" disabled={busy || errors.length > 0} onClick={submit}>{busy ? 'Sending…' : 'Send request'}</button>
        {!isAuthenticated && <p className="text-sm text-[var(--c-muted)]">You can fill this in as a guest; we ask you to sign in when you send it and keep your answers.</p>}
        <p className="text-sm">Just a few people? <Link to="/book" className="underline">Book a table</Link> instead.</p>
        <SupportNote />
      </div>
    </div>
  );
}
