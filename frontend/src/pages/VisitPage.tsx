import { Link } from 'react-router-dom';
import { MAPS_URL, SUPPORT_PHONE, SUPPORT_TEL } from '@/lib/plaisir';
import { SupportNote } from '@/components/plaisir/ui';
import { AREAS } from '@/pages/AreaPage';

export default function VisitPage() {
  const [map, setMap] = useStateMap();
  return (
    <div className="page">
      <p className="sec-no">Find us</p><h1 className="h2-display mt-1">Visit Le Plaisir</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <address className="not-italic text-lg">Rajkamal, Survey No. 759/125, Prabhat Road,<br />opposite Cox and Kings, near Kelkar Nursing Home,<br />Deccan Gymkhana, Pune, Maharashtra 411004</address>
          <table className="mt-5 w-full max-w-sm text-left"><caption className="sr-only">Opening hours</caption><tbody>{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => <tr key={d} className="border-b border-[var(--c-rule)]"><th className="py-2 font-medium">{d}</th><td>8 am – 10:45 pm</td></tr>)}</tbody></table>
          <div className="mt-5 flex flex-wrap gap-3"><a className="btn-yolk" href={SUPPORT_TEL}>Call {SUPPORT_PHONE}</a><a className="btn-ink" href={MAPS_URL} target="_blank" rel="noopener noreferrer">Directions</a></div>
          <div className="mt-6"><SupportNote /></div>
        </div>
        <div className="cell p-4">
          {map ? <iframe title="Map of Le Plaisir" loading="lazy" className="h-80 w-full border-0" src="https://www.google.com/maps?q=18.514364,73.838608&output=embed" /> : <><p>The map loads only when you ask, to keep this page light.</p><button type="button" className="btn-ink mt-3" onClick={() => setMap(true)}>Show map</button></>}
        </div>
      </div>
      <h2 className="text-2xl mt-12">Coming from</h2>
      <ul className="mt-3 flex flex-wrap gap-2">{Object.entries(AREAS).map(([slug, a]) => <li key={slug}><Link className="chip" to={`/near/${slug}`}>{a.name}</Link></li>)}</ul>
    </div>
  );
}

import { useState } from 'react';
function useStateMap() { return useState(false); }
