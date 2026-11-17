import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { addDays, hhmm12, isoDate, plaisir, validPhone } from '@/lib/plaisir';
import { Field, inputCls } from '@/components/plaisir/forms';
import { FormAlert, SupportNote } from '@/components/plaisir/ui';

const DRAFT = 'pl-book-draft';
const OCCASIONS = ['none', 'birthday', 'anniversary', 'date', 'work'];

export default function BookPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const today = new Date();
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => addDays(today, i)), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [date, setDate] = useState(isoDate(today));
  const [party, setParty] = useState(2);
  const [slot, setSlot] = useState('');
  const [seating, setSeating] = useState('No preference');
  const [occasion, setOccasion] = useState('none');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT);
      if (raw) { const d = JSON.parse(raw); setDate(d.date); setParty(d.party); setSlot(d.slot); setSeating(d.seating); setOccasion(d.occasion); setPhone(d.phone); setNote(d.note); sessionStorage.removeItem(DRAFT); }
    } catch { /* ignore */ }
  }, []);

  const { data: slots, isLoading } = useQuery({ queryKey: ['pl-avail', date, party], queryFn: () => plaisir.availability(date, party) });
  const errors = [
    !slot && 'Choose a time',
    !validPhone(phone) && 'Enter a valid Indian mobile number (10 digits, optionally +91)',
    note.length > 200 && 'Note is limited to 200 characters',
  ].filter(Boolean) as string[];

  const submit = async () => {
    setTouched(true);
    if (errors.length) return;
    if (!isAuthenticated) {
      try { sessionStorage.setItem(DRAFT, JSON.stringify({ date, party, slot, seating, occasion, phone, note })); } catch { /* ignore */ }
      navigate('/login?redirect=/book');
      return;
    }
    setBusy(true);
    try {
      const r = await plaisir.book({ date, slot, partySize: party, seatingPref: seating, occasion, phone, note });
      navigate(`/book/confirmed/${r.orderId}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="page page--narrow">
      <p className="sec-no">Tier 01 · Table booking</p>
      <h1 className="h2-display mt-1">Book a table</h1>
      <p className="mt-2 text-[var(--c-muted)]">Free to book. No deposit. Weekends fill fast, so a few days ahead helps.</p>
      <div className="mt-6 space-y-6">
        <fieldset><legend className="mb-2 font-medium">Date</legend>
          <div className="scroll-x flex gap-2 pb-2">{days.map((d) => { const v = isoDate(d); return <button key={v} type="button" aria-pressed={date === v} className="chip shrink-0 flex-col !h-auto py-2" onClick={() => { setDate(v); setSlot(''); }}><span className="text-xs">{d.toLocaleDateString('en-IN', { weekday: 'short' })}</span><span className="font-semibold">{d.getDate()} {d.toLocaleDateString('en-IN', { month: 'short' })}</span></button>; })}</div>
        </fieldset>
        <Field id="party" label="Party size" hint="For 11 or more guests, use Team lunches & large tables.">
          <div className="flex items-center gap-3">
            <button type="button" className="chip" aria-label="Fewer guests" onClick={() => { setParty(Math.max(1, party - 1)); setSlot(''); }}>−</button>
            <output id="party" className="min-w-8 text-center text-xl font-semibold">{party}</output>
            <button type="button" className="chip" aria-label="More guests" disabled={party >= 10} onClick={() => { setParty(party + 1); setSlot(''); }}>+</button>
            {party >= 10 && <Link className="underline" to={`/team-lunch?date=${date}`}>Need 11 or more?</Link>}
          </div>
        </Field>
        <fieldset><legend className="mb-2 font-medium">Time</legend>
          {isLoading ? <p>Checking the room…</p> : !slots || slots.length === 0 ? <p>We are not taking bookings that day. Try another date, or <Link className="underline" to="/support">ask Support</Link>.</p> : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {slots.map((s) => (
                <button key={s.time} type="button" disabled={s.status === 'full'} aria-pressed={slot === s.time} className="chip flex-col !h-auto py-2 disabled:opacity-50" onClick={() => setSlot(s.time)}>
                  <span className="font-semibold">{hhmm12(s.time)}</span><span className="text-xs">{s.status === 'full' ? 'Full' : s.status === 'few' ? 'A few tables left' : 'Open'}</span>
                </button>))}
            </div>)}
        </fieldset>
        <Field id="seat" label="Seating" hint="A wish, not a promise. The room is small and can get noisy when full.">
          <select id="seat" className={inputCls} value={seating} onChange={(e) => setSeating(e.target.value)}><option>No preference</option><option>Quieter corner, if possible</option></select>
        </Field>
        <Field id="occ" label="Occasion"><select id="occ" className={inputCls} value={occasion} onChange={(e) => setOccasion(e.target.value)}>{OCCASIONS.map((o) => <option key={o} value={o}>{o === 'none' ? 'Just a meal' : o[0].toUpperCase() + o.slice(1)}</option>)}</select></Field>
        <Field id="phone" label="Mobile number" hint="We call or message only about this booking." error={touched && !validPhone(phone) ? 'Enter a valid mobile number' : null}>
          <input id="phone" inputMode="tel" autoComplete="tel" className={`${inputCls} ${touched && !validPhone(phone) ? 'field-err' : ''}`} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
        </Field>
        <Field id="note" label="Note (optional)" hint={`${note.length}/200`}><textarea id="note" rows={3} className={`${inputCls} h-auto py-2`} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        {touched && <FormAlert errors={errors} />}
        <button type="button" className="btn-yolk" disabled={busy || errors.length > 0} onClick={submit}>{busy ? 'Sending…' : 'Request this table'}</button>
        {!isAuthenticated && <p className="text-sm text-[var(--c-muted)]">You can fill this in as a guest. We ask you to sign in when you send it, and keep your answers.</p>}
        <SupportNote />
      </div>
    </div>
  );
}
