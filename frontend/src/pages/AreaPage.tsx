import { Link, useParams } from 'react-router-dom';
import { useMenu } from '@/lib/plaisir';
import { MAPS_URL } from '@/lib/plaisir';
import { DietMark } from '@/components/plaisir/ui';

export const AREAS: Record<string, { name: string; h1: string; intro: string }> = {
  'fc-road-shivajinagar': { name: 'FC Road & Shivajinagar', h1: 'A European bistro near FC Road & Shivajinagar', intro: 'Le Plaisir is on Prabhat Road in Deccan Gymkhana, close to the FC Road and Shivajinagar side of Pune. Open every day from 8 am to 10:45 pm for breakfast, pasta, sandwiches and patisserie.' },
  'model-colony': { name: 'Model Colony', h1: 'A European bistro near Model Colony', intro: 'Le Plaisir is on Prabhat Road, Deccan Gymkhana, a short way from Model Colony. Book a table, or order ahead and collect at the patisserie counter by the door.' },
  'erandwane-law-college-road': { name: 'Erandwane & Law College Road', h1: 'A European bistro near Erandwane & Law College Road', intro: 'Le Plaisir is on Prabhat Road in Deccan Gymkhana, near Erandwane and Law College Road. Plan a team lunch, or reserve a slice of cheesecake for pickup.' },
  'kothrud-karve-road': { name: 'Kothrud & Karve Road', h1: 'A European bistro near Kothrud & Karve Road', intro: 'Le Plaisir is on Prabhat Road, Deccan Gymkhana, reachable from the Kothrud and Karve Road side. Open daily, with all-day breakfast and a patisserie counter at the entrance.' },
};

export default function AreaPage() {
  const { area = '' } = useParams();
  const a = AREAS[area];
  const { data } = useMenu();
  if (!a) return <div className="page"><p>We do not have a page for that area. <Link className="underline" to="/visit">Visit us</Link>.</p></div>;
  const sig = (data ?? []).filter((d) => d.signature).slice(0, 6);
  return (
    <div className="page">
      <title>{`Le Plaisir near ${a.name} | European bistro, Deccan Gymkhana, Pune`}</title>
      <p className="sec-no">Near {a.name}</p>
      <h1 className="h2-display mt-1">{a.h1}</h1>
      <p className="mt-3 max-w-2xl text-lg">{a.intro}</p>
      <p className="mt-2"><a className="underline" href={MAPS_URL} target="_blank" rel="noopener noreferrer">Get directions in Maps</a></p>
      <h2 className="text-2xl mt-10">What to try</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{sig.map((d) => <li key={d.key} className="cell p-4"><Link to={`/menu/${d.slug}`} className="font-display text-xl hover:underline">{d.name}</Link><div><DietMark diet={d.diet} /></div></li>)}</ul>
      <div className="mt-8 flex flex-wrap gap-3"><Link to="/book" className="btn-yolk">Book a table</Link><Link to="/order" className="btn-ink">Order for pickup</Link><Link to="/team-lunch" className="btn-ink">Plan a team lunch</Link></div>
    </div>
  );
}
