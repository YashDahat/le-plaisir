import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { plaisir } from '@/lib/plaisir';
import { Reveal } from '@/components/plaisir/ui';

export default function StoryPage() {
  const { data } = useQuery({ queryKey: ['pl-story'], queryFn: plaisir.story });
  return (
    <div>
      <section className="bg-[var(--c-graphite)] text-[var(--c-on-dark)]"><div className="site-container py-[var(--section-y)]"><p className="sec-no text-[var(--c-on-dark)]">Our story</p><h1 className="h1-display mt-2">Since 2012</h1></div></section>
      <div className="page page--text">
        <ol className="space-y-12 border-l-2 border-[var(--c-anchor)] pl-6">
          {(data ?? []).map((b) => (
            <Reveal as="li" key={b.id}>
              <p className="sec-no">{b.yearLabel}</p>
              <h2 className="h2-display mt-1">{b.title}</h2>
              <p className="mt-2 text-lg">{b.body}</p>
              {b.sourceNote && <p className="mt-1 text-xs text-[var(--c-muted)]">Source: {b.sourceNote}</p>}
            </Reveal>
          ))}
        </ol>
        <p className="mt-12 font-display text-2xl">Come hungry, or come for one slice.</p>
        <div className="mt-4 flex flex-wrap gap-3"><Link to="/book" className="btn-yolk">Book a table</Link><Link to="/order" className="btn-ink">Order for pickup</Link><Link to="/team-lunch" className="btn-ink">Plan a team lunch</Link></div>
      </div>
    </div>
  );
}
