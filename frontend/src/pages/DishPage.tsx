import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ProductReviews from '@/components/reviews/ProductReviews';
import RecommendationWidget from '@/components/recommendations/RecommendationWidget';
import { coinsFor, plaisir, useWays } from '@/lib/plaisir';
import { CHECKLIST_NOTE } from '@/lib/plaisir';
import { DishCard, Illus } from '@/components/plaisir/ui';

export default function DishPage() {
  const { slug = '' } = useParams();
  const { data: d, isLoading, isError } = useQuery({ queryKey: ['pl-dish', slug], queryFn: () => plaisir.dish(slug) });
  const { data: ways } = useWays();
  if (isLoading) return <div className="page"><p>Loading…</p></div>;
  if (isError || !d) return <div className="page"><p>We could not find that dish. <Link className="underline" to="/menu">Back to the menu</Link>.</p></div>;
  const review = coinsFor(ways, 'REVIEW');
  const media = coinsFor(ways, 'REVIEW_MEDIA');
  const share = `https://wa.me/?text=${encodeURIComponent(`${d.name} at Le Plaisir, Pune: ${window.location.href}`)}`;
  return (
    <div className="page">
      <p className="sec-no">{d.category}</p>
      <div className="mt-2 grid gap-8 lg:grid-cols-2">
        <div className="cell flex items-center justify-center p-10"><Illus kind={d.category === 'Drinks' ? 'cup' : d.category === 'Breakfast' ? 'bread' : d.category === 'Patisserie' || d.category === 'Whole cakes' ? 'cake' : d.category === 'Macaron boxes' ? 'macaron' : 'plate'} className="h-48 w-48" /></div>
        <div>
          <h1 className="h2-display">{d.name}</h1>
          <div className="mt-4"><DishCard dish={d} /></div>
          <a className="underline mt-4 inline-block" href={share} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
        </div>
      </div>
      <section id="rate" className="mt-12">
        <h2 className="text-2xl">Rate it</h2>
        <p className="mt-1 text-[var(--c-muted)]">{review != null ? `Reviews earn ${review} coins${media != null ? ` (+${media} with a photo)` : ''}. ` : ''}Every honest review counts, good or bad. {CHECKLIST_NOTE}</p>
        <div className="mt-4"><ProductReviews productId={d.options[0].productId} /></div>
      </section>
      <section className="mt-12"><h2 className="text-2xl mb-3">Often ordered with</h2><RecommendationWidget itemType="PRODUCT" itemId={d.options[0].productId} type="CROSS_SELL" /></section>
    </div>
  );
}
