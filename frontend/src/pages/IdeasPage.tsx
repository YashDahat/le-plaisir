import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { withToast } from '@/lib/apiToast';
import { coinsFor, plaisir, useWays } from '@/lib/plaisir';
import { Field, inputCls } from '@/components/plaisir/forms';
import { FormAlert, WaysToEarn } from '@/components/plaisir/ui';

export default function IdeasPage() {
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const { data: ways } = useWays();
  const { data: acted } = useQuery({ queryKey: ['pl-acted'], queryFn: plaisir.actedOn });
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const coins = coinsFor(ways, 'SUGGESTION');
  const errors = [text.trim().length < 5 && 'Tell us a little more (at least 5 characters)', text.length > 500 && 'Ideas are limited to 500 characters'].filter(Boolean) as string[];
  const send = async () => {
    setTouched(true);
    if (errors.length) return;
    await withToast(plaisir.suggest(text.trim()), coins != null ? `Thank you! +${coins} coins` : 'Thank you for the idea');
    setText(''); setTouched(false); qc.invalidateQueries({ queryKey: ['pl-mysug'] });
  };
  return (
    <div className="page page--form space-y-6">
      <p className="sec-no">Suggest an idea</p><h1 className="h2-display">What would make your next visit better?</h1>
      <p>{coins != null ? `Sharing an idea earns ${coins} coins. ` : ''}We read every one.</p>
      {!isAuthenticated ? <p><Link className="btn-yolk" to="/login?redirect=/ideas">Sign in to share an idea</Link></p> : (
        <>
          <Field id="idea" label="Your idea" hint={`${text.length}/500`}><textarea id="idea" rows={4} maxLength={500} className={`${inputCls} h-auto py-2 ${touched && errors.length ? 'field-err' : ''}`} value={text} onChange={(e) => setText(e.target.value)} /></Field>
          {touched && <FormAlert errors={errors} />}
          <button type="button" className="btn-yolk" disabled={errors.length > 0} onClick={send}>Send idea</button>
        </>)}
      <section><h2 className="text-2xl mb-2">Ideas we acted on</h2>{!acted || acted.length === 0 ? <p className="text-[var(--c-muted)]">Nothing here yet. Yours could be the first.</p> : <ul className="space-y-3">{acted.map((a) => <li key={a.id} className="cell p-3"><p>{a.text}</p>{a.publicNote && <p className="text-sm text-[var(--c-muted)]">{a.publicNote}</p>}</li>)}</ul>}</section>
      <WaysToEarn />
    </div>
  );
}
