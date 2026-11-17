import type { SiteConfig } from '@/shell';

const siteConfig: SiteConfig = {
  header: {
    brandName: 'Le Plaisir',
    logoUrl: null,
    navLinks: [
      { label: 'Menu', href: '/menu' },
      { label: 'Order', href: '/order' },
      { label: 'Patisserie', href: '/patisserie' },
      { label: 'Team lunch', href: '/team-lunch' },
      { label: 'Our story', href: '/story' },
      { label: 'Visit', href: '/visit' },
      { label: 'Support', href: '/support' },
    ],
    ctaButton: { label: 'Book a table', href: '/book' },
    showAuth: true,
    showCart: true,
    bgClass: 'bg-[var(--c-base)]',
    textClass: 'text-[var(--c-ink)]',
    hoverClass: 'hover:text-[var(--c-anchor)]',
    ctaClass: 'bg-[var(--c-accent)] text-[#161514] hover:brightness-95',
  },
  footer: {
    brandName: 'Le Plaisir',
    tagline: 'European bistro & patisserie · Prabhat Road, Pune · since 2012',
    address: 'Rajkamal, Survey No. 759/125, Prabhat Road, opp. Cox and Kings, near Kelkar Nursing Home, Deccan Gymkhana, Pune 411004',
    phone: '+91 85509 95835',
    email: null,
    openingHours: 'Open daily · 8 am – 10:45 pm',
    quickLinks: [
      { label: 'Book a table', href: '/book' },
      { label: 'Order for pickup', href: '/order' },
      { label: 'Team lunch', href: '/team-lunch' },
      { label: 'Menu', href: '/menu' },
      { label: 'Our story', href: '/story' },
      { label: 'Suggest an idea', href: '/ideas' },
      { label: 'My account', href: '/me' },
      { label: 'Support', href: '/support' },
      { label: 'Loyalty terms', href: '/loyalty-terms' },
      { label: 'Near FC Road & Shivajinagar', href: '/near/fc-road-shivajinagar' },
      { label: 'Near Model Colony', href: '/near/model-colony' },
      { label: 'Near Erandwane & Law College Road', href: '/near/erandwane-law-college-road' },
      { label: 'Near Kothrud & Karve Road', href: '/near/kothrud-karve-road' },
    ],
    socialLinks: [],
    bgClass: 'bg-[var(--c-graphite)]',
    textClass: 'text-[var(--c-on-dark)]',
    accentClass: 'hover:text-[var(--c-accent)]',
  },
};

export default siteConfig;
