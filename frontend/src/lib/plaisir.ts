// Le Plaisir site API + helpers. Everything goes through the foundation apiClient (auth + global error toasts).
import apiClient from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import type { BulkUploadResult } from '@/types/bulkUpload';

const B = '/api/v1/plaisir';
const A = '/api/v1/admin/plaisir';

export type Diet = 'VEG' | 'EGG' | 'NON_VEG';
export interface DishOption { productId: number; portion: string | null; price: number; slug: string; name: string }
export interface Dish {
  key: string; name: string; slug: string; category: string; diet: Diet; signature: boolean; shortNote: string | null;
  priceConfirmed: boolean; inVitrineToday: boolean; soldOutToday: boolean; leadHours: number;
  availableFrom: string | null; availableTo: string | null; imageUrl: string | null; description: string | null; options: DishOption[];
}
export interface Slot { time: string; at: string; available: boolean; left: number }
export interface TableSlot { time: string; status: 'open' | 'few' | 'full'; left: number }
export interface Earn { type: string; label: string; points: number; perDayCap: number | null; onceOnly: boolean }
export interface Flavour { id: number; name: string; colourHex: string; available: boolean }
export interface StoryBeat { id: number; yearLabel: string; title: string; body: string; sourceNote?: string }
export interface ChecklistItem { id: string; label: string; done: boolean; href: string; optional: boolean }
export interface Welcome { firstName: string; coins: number; next: null | { kind: 'BOOKING' | 'GATHERING' | 'REORDER'; orderId: number; date?: string; time?: string; partySize?: number; stage?: string; lines?: { itemId: number; name: string; unitPrice: number; quantity: number; imageUrl?: string | null }[] } }

const get = async <T,>(url: string, params?: Record<string, unknown>) => (await apiClient.get<T>(url, { params })).data;
const post = async <T,>(url: string, body?: unknown) => (await apiClient.post<T>(url, body)).data;
const put = async <T,>(url: string, body?: unknown) => (await apiClient.put<T>(url, body)).data;
const upload = async (url: string, file: File): Promise<BulkUploadResult> => {
  const fd = new FormData();
  fd.append('file', file);
  return (await apiClient.post<BulkUploadResult>(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
};

export const plaisir = {
  menu: () => get<Dish[]>(`${B}/menu`),
  dish: (slug: string) => get<Dish>(`${B}/menu/${slug}`),
  vitrine: () => get<Dish[]>(`${B}/vitrine`),
  flavours: () => get<Flavour[]>(`${B}/macaron-flavours`),
  story: () => get<StoryBeat[]>(`${B}/story`),
  ways: () => get<Earn[]>(`${B}/ways-to-earn`),
  pickupSlots: (date: string, lead: boolean) => get<Slot[]>(`${B}/pickup/slots`, { date, lead }),
  attachPickup: (body: Record<string, unknown>) => post(`${B}/pickup-details`, body),
  details: (orderId: number) => get<{ kind: string; detail: Record<string, any> | null }>(`${B}/orders/${orderId}/details`),
  availability: (date: string, party: number) => get<TableSlot[]>(`${B}/bookings/availability`, { date, party }),
  book: (body: Record<string, unknown>) => post<{ orderId: number }>(`${B}/bookings`, body),
  gathering: (body: Record<string, unknown>) => post<{ orderId: number }>(`${B}/gatherings`, body),
  welcome: () => get<Welcome>(`${B}/me/welcome`),
  checklist: () => get<ChecklistItem[]>(`${B}/me/checklist`),
  favourites: () => get<number[]>(`${B}/favourites`),
  toggleFav: (productId: number) => post<{ favourite: boolean }>(`${B}/favourites/${productId}/toggle`),
  suggest: (text: string) => post(`${B}/suggestions`, { text }),
  mySuggestions: () => get<any[]>(`${B}/suggestions/mine`),
  actedOn: () => get<{ id: number; text: string; publicNote: string | null }[]>(`${B}/suggestions/acted-on`),
  icsUrl: (orderId: number) => `${B}/bookings/${orderId}/ics`,
  admin: {
    list: <T,>(path: string) => get<T>(`${A}/${path}`),
    put: <T,>(path: string, body: unknown) => put<T>(`${A}/${path}`, body),
    post: <T,>(path: string, body: unknown) => post<T>(`${A}/${path}`, body),
    del: async (path: string) => { await apiClient.delete(`${A}/${path}`); },
    upload: (path: string, file: File) => upload(`${A}/${path}`, file),
  },
};

export function useMenu() { return useQuery({ queryKey: ['pl-menu'], queryFn: plaisir.menu, staleTime: 60_000 }); }
export function useVitrine() { return useQuery({ queryKey: ['pl-vitrine'], queryFn: plaisir.vitrine, staleTime: 60_000 }); }
export function useWays() { return useQuery({ queryKey: ['pl-ways'], queryFn: plaisir.ways, staleTime: 300_000 }); }
export function useFavourites() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: ['pl-favs'], queryFn: plaisir.favourites, enabled: isAuthenticated });
}

/** Coins shown for an event type, read from the live rules (never hard-coded). */
export function coinsFor(ways: Earn[] | undefined, type: string): number | null {
  const r = ways?.find((w) => w.type === type);
  return r ? Number(r.points) : null;
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export const rupees = (n: number | string) => inr.format(Number(n));

export function isoDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
export function hhmm12(t: string) {
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
}
export const validPhone = (p: string) => /^(\+91)?[6-9]\d{9}$/.test(p.replace(/[\s-]/g, ''));

export const SUPPORT_PHONE = '+91 85509 95835';
export const SUPPORT_TEL = 'tel:+918550995835';
export const MAPS_URL = 'https://www.google.com/maps/place/?q=place_id:ChIJnenf-Ii_wjsRaJtt5ZESdLo';

/** Mirrors the stages seeded in PlaisirWorkflowSeeder (label, expected minutes). */
export const WORKFLOWS: Record<string, { label: string; success: string; stages: [string, string, number | null][] }> = {
  pickup: { label: 'Counter pickup', success: 'COLLECTED', stages: [['PLACED', 'Order sent', 5], ['CONFIRMED', 'Kitchen has it', 10], ['PREPARING', 'Being plated / boxed', 20], ['READY', 'Waiting at the counter', 30], ['COLLECTED', 'Collected. Enjoy!', null]] },
  table: { label: 'Table booking', success: 'COMPLETED', stages: [['RECEIVED', 'Received', 5], ['WITH_HOST', 'With our host', 15], ['CONFIRMED', 'Table confirmed', null], ['SEATED', 'Seated. Bon appetit', 120], ['COMPLETED', 'Completed', null]] },
  gathering: { label: 'Team lunch / large table', success: 'FULFILLED', stages: [['RECEIVED', 'Received', 5], ['REVIEWING', 'We are planning it', 120], ['QUOTED', 'Menu & quote shared', 1440], ['CONFIRMED', 'Confirmed', null], ['FULFILLED', 'Done', null]] },
};

export const CHECKLIST_NOTE = 'Reviews earn coins for being written, not for the stars. We never hide or reorder reviews.';
