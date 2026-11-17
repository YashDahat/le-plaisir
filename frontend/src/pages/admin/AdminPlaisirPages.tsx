import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColDef } from 'ag-grid-community';
import { Pencil, Trash2 } from 'lucide-react';
import { AdminDataGrid } from '@/components/admin/AdminDataGrid';
import { BulkUploadDialog } from '@/components/admin/BulkUploadDialog';
import { StepperSheet, type WizardStep } from '@/components/admin/StepperSheet';
import { withToast } from '@/lib/apiToast';
import { plaisir } from '@/lib/plaisir';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const A = plaisir.admin;

function useList<T>(path: string) { return useQuery({ queryKey: ['pl-admin', path], queryFn: () => A.list<T[]>(path) }); }
function useRefresh(path: string) { const qc = useQueryClient(); return () => qc.invalidateQueries({ queryKey: ['pl-admin', path] }); }

function Head({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold">{title}</h1>{hint && <p className="text-sm text-muted-foreground">{hint}</p>}</div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

const LINKS: [string, string][] = [['menu', 'Menu & dish details'], ['vitrine', 'Vitrine today'], ['pickup-settings', 'Pickup settings & blackout dates'], ['bookings', 'Table bookings'], ['table-capacity', 'Table capacity'], ['gatherings', 'Team lunch requests'], ['flavours', 'Macaron flavours'], ['suggestions', 'Ideas from customers']];
export function AdminPlaisirHub() {
  return (
    <div><Head title="Le Plaisir" hint="Run the counter, the host stand and the events desk. Orders themselves are on the Order board." />
      <ul className="grid gap-3 sm:grid-cols-2">{LINKS.map(([p, l]) => <li key={p}><Link className="block rounded-md border p-4 font-medium hover:bg-muted" to={`/admin/plaisir/${p}`}>{l}</Link></li>)}<li><Link className="block rounded-md border p-4 font-medium hover:bg-muted" to="/admin/orders">Order board (Counter, Host, Events desk)</Link></li></ul></div>
  );
}

// ── Menu ──
interface DishRow { id: number; name: string; slug: string; category: string; price: number; diet: string; signature: boolean; requestOnly: boolean; leadHours: number; priceConfirmed: boolean; inVitrineToday: boolean; soldOutToday: boolean; shortNote: string | null }
export function AdminPlaisirMenu() {
  const { data = [] } = useList<DishRow>('dishes');
  const refresh = useRefresh('dishes');
  const [form, setForm] = useState<DishRow | null>(null);
  const [saving, setSaving] = useState(false);
  const cols: ColDef<DishRow>[] = [{ field: 'name', headerName: 'Dish', minWidth: 240 }, { field: 'category' }, { field: 'price', headerName: 'Price (₹)', filter: 'agNumberColumnFilter' }, { field: 'diet' }, { field: 'signature' }, { field: 'leadHours', headerName: 'Lead hrs' }, { field: 'priceConfirmed', headerName: 'Price confirmed' }, { field: 'requestOnly', headerName: 'Request only' }];
  const steps: WizardStep[] = form ? [{ id: 'd', title: 'Details', complete: true, content: (
    <div className="space-y-3">
      <div><Label htmlFor="dd">Diet</Label><select id="dd" className="h-10 w-full rounded border bg-background px-2" value={form.diet} onChange={(e) => setForm({ ...form, diet: e.target.value })}><option value="VEG">Vegetarian</option><option value="EGG">Contains egg</option><option value="NON_VEG">Non-vegetarian</option></select></div>
      <div><Label htmlFor="dl">Lead hours</Label><Input id="dl" type="number" min={0} value={form.leadHours} onChange={(e) => setForm({ ...form, leadHours: Number(e.target.value) })} /></div>
      <div><Label htmlFor="dn">Short note</Label><Input id="dn" value={form.shortNote ?? ''} onChange={(e) => setForm({ ...form, shortNote: e.target.value })} /></div>
      <label className="flex items-center gap-2"><input type="checkbox" checked={form.signature} onChange={(e) => setForm({ ...form, signature: e.target.checked })} /> Signature dish</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={form.priceConfirmed} onChange={(e) => setForm({ ...form, priceConfirmed: e.target.checked })} /> Price confirmed with the owner</label>
      <p className="text-sm text-muted-foreground">Prices themselves are edited under Products.</p>
    </div>) }] : [];
  return (
    <div><Head title="Menu & dish details" hint="Diet markers, signature flags, lead time and price confirmation.">
      <BulkUploadDialog title="Bulk update dishes" columns={['slug', 'diet', 'signature', 'leadHours', 'priceConfirmed', 'shortNote']} sampleRow={['espresso-panna-cotta', 'VEG', 'true', '0', 'true', 'Reviewers favourite']} templateName="plaisir-dishes-template.csv" onUpload={async (f) => { const r = await A.upload('dishes/bulk-upload', f); refresh(); return r; }} />
    </Head>
      <AdminDataGrid<DishRow> rowData={data} columnDefs={cols} actions={[{ label: 'Edit', icon: Pencil, onClick: (r) => setForm({ ...r }) }]} emptyMessage="No dishes." />
      <StepperSheet open={form != null} onOpenChange={(n) => !n && setForm(null)} title={`Edit ${form?.name ?? ''}`} steps={steps} canSave={!saving} saving={saving} onSave={async () => { if (!form) return; setSaving(true); try { await withToast(A.put(`dishes/${form.id}`, form), 'Saved'); refresh(); setForm(null); } finally { setSaving(false); } }} />
    </div>
  );
}

// ── Vitrine ──
export function AdminPlaisirVitrine() {
  const { data = [] } = useList<DishRow>('dishes');
  const refresh = useRefresh('dishes');
  const set = async (id: number, patch: Partial<DishRow>) => { await withToast(A.put(`vitrine/${id}`, patch), 'Updated'); refresh(); };
  return (
    <div><Head title="Vitrine today" hint="Tick what is at the counter today. Mark sold out when it is gone. Customers see this live." />
      <ul className="space-y-2">{data.filter((d) => !d.requestOnly && ['Patisserie', 'Macaron boxes', 'Breakfast'].includes(d.category)).map((d) => (
        <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
          <span className="font-medium">{d.name}</span>
          <span className="flex gap-3">
            <Button type="button" variant={d.inVitrineToday ? 'default' : 'outline'} className="h-11" aria-pressed={d.inVitrineToday} onClick={() => set(d.id, { inVitrineToday: !d.inVitrineToday })}>{d.inVitrineToday ? 'At the vitrine' : 'Not out'}</Button>
            <Button type="button" variant={d.soldOutToday ? 'destructive' : 'outline'} className="h-11" aria-pressed={d.soldOutToday} onClick={() => set(d.id, { soldOutToday: !d.soldOutToday })}>{d.soldOutToday ? 'Sold out' : 'Mark sold out'}</Button>
          </span>
        </li>))}</ul></div>
  );
}

// ── Pickup settings + blackouts ──
interface Settings { slotMinutes: number; maxOrdersPerSlot: number; minLeadMinutes: number; openFrom: string; lastPickup: string }
interface Blackout { id: number; date: string; scope: string; reason: string | null }
export function AdminPlaisirPickupSettings() {
  const { data } = useQuery({ queryKey: ['pl-admin', 'ps'], queryFn: () => A.list<Settings>('pickup-settings') });
  const { data: bo = [] } = useList<Blackout>('blackouts');
  const refreshBo = useRefresh('blackouts');
  const [s, setS] = useState<Settings | null>(null);
  const [d, setD] = useState(''); const [scope, setScope] = useState('ALL'); const [why, setWhy] = useState('');
  const cur = s ?? data;
  return (
    <div><Head title="Pickup settings" hint="Slot length, load per slot and blackout dates for pickup and table bookings." />
      {cur && <div className="grid max-w-xl gap-3 sm:grid-cols-2">
        {([['slotMinutes', 'Slot length (min)'], ['maxOrdersPerSlot', 'Max orders per slot'], ['minLeadMinutes', 'Minimum lead (min)']] as const).map(([k, l]) => <div key={k}><Label htmlFor={k}>{l}</Label><Input id={k} type="number" min={1} value={cur[k]} onChange={(e) => setS({ ...cur, [k]: Number(e.target.value) })} /></div>)}
        <div><Label htmlFor="of">Opens for pickup</Label><Input id="of" type="time" value={String(cur.openFrom).slice(0, 5)} onChange={(e) => setS({ ...cur, openFrom: e.target.value })} /></div>
        <div><Label htmlFor="lp">Last pickup</Label><Input id="lp" type="time" value={String(cur.lastPickup).slice(0, 5)} onChange={(e) => setS({ ...cur, lastPickup: e.target.value })} /></div>
        <div className="sm:col-span-2"><Button type="button" onClick={async () => { await withToast(A.put('pickup-settings', cur), 'Saved'); }}>Save settings</Button></div>
      </div>}
      <h2 className="mt-8 mb-2 text-lg font-semibold">Blackout dates</h2>
      <div className="mb-3 flex flex-wrap items-end gap-2"><div><Label htmlFor="bd">Date</Label><Input id="bd" type="date" value={d} onChange={(e) => setD(e.target.value)} /></div><div><Label htmlFor="bs">Applies to</Label><select id="bs" className="h-10 rounded border bg-background px-2" value={scope} onChange={(e) => setScope(e.target.value)}><option value="ALL">Everything</option><option value="TABLE">Tables</option><option value="PICKUP">Pickup</option></select></div><div><Label htmlFor="br">Reason</Label><Input id="br" value={why} onChange={(e) => setWhy(e.target.value)} /></div><Button type="button" disabled={!d} onClick={async () => { await withToast(A.post('blackouts', { date: d, scope, reason: why }), 'Added'); setD(''); setWhy(''); refreshBo(); }}>Add</Button></div>
      <AdminDataGrid<Blackout> rowData={bo} height="20rem" columnDefs={[{ field: 'date' }, { field: 'scope' }, { field: 'reason' }] as ColDef<Blackout>[]} actions={[{ label: 'Remove', icon: Trash2, danger: true, onClick: async (r) => { await withToast(A.del(`blackouts/${r.id}`), 'Removed'); refreshBo(); } }]} emptyMessage="No blackout dates." />
    </div>
  );
}

// ── Bookings ──
export function AdminPlaisirBookings() {
  const { data = [] } = useList<Record<string, unknown>>('bookings');
  return (
    <div><Head title="Table bookings" hint="Next 30 days. Move the stage on the Order board (Host column)." />
      <AdminDataGrid<Record<string, unknown>> rowData={data} columnDefs={[{ field: 'date' }, { field: 'slotStart', headerName: 'Time' }, { field: 'partySize', headerName: 'Party' }, { field: 'stage' }, { field: 'occasion' }, { field: 'seatingPref', headerName: 'Seating' }, { field: 'phone' }, { field: 'note' }, { field: 'orderNumber', headerName: 'Booking' }]} emptyMessage="No upcoming bookings." /></div>
  );
}

// ── Capacity ──
interface Cap { id: number; weekday: number; slotStart: string; covers: number }
export function AdminPlaisirCapacity() {
  const { data = [] } = useList<Cap>('table-capacity');
  const refresh = useRefresh('table-capacity');
  const [wd, setWd] = useState('1'); const [t, setT] = useState('13:00'); const [c, setC] = useState('24');
  return (
    <div><Head title="Table capacity" hint="Covers per 30-minute slot, by weekday (1 = Monday, 7 = Sunday).">
      <BulkUploadDialog title="Bulk upload capacity" columns={['weekday', 'slotStart', 'covers']} sampleRow={['6', '20:00', '30']} templateName="plaisir-capacity-template.csv" onUpload={async (f) => { const r = await A.upload('table-capacity/bulk-upload', f); refresh(); return r; }} /></Head>
      <div className="mb-3 flex flex-wrap items-end gap-2"><div><Label htmlFor="cw">Weekday</Label><Input id="cw" type="number" min={1} max={7} value={wd} onChange={(e) => setWd(e.target.value)} /></div><div><Label htmlFor="ct">Slot</Label><Input id="ct" type="time" value={t} onChange={(e) => setT(e.target.value)} /></div><div><Label htmlFor="cc">Covers</Label><Input id="cc" type="number" min={0} value={c} onChange={(e) => setC(e.target.value)} /></div><Button type="button" onClick={async () => { await withToast(A.post('table-capacity', { weekday: Number(wd), slotStart: t, covers: Number(c) }), 'Added'); refresh(); }}>Add slot</Button></div>
      <AdminDataGrid<Cap> rowData={data} columnDefs={[{ field: 'weekday', filter: 'agNumberColumnFilter' }, { field: 'slotStart', headerName: 'Slot' }, { field: 'covers', filter: 'agNumberColumnFilter' }] as ColDef<Cap>[]} actions={[{ label: 'Delete', icon: Trash2, danger: true, onClick: async (r) => { await withToast(A.del(`table-capacity/${r.id}`), 'Deleted'); refresh(); } }]} emptyMessage="No capacity rows." /></div>
  );
}

// ── Gatherings ──
interface Gath { id: number; orderNumber: string; stage: string; type: string; groupName: string; date: string; time: string; headcount: number; vegCount: number; budgetBand: string; mode: string; phone: string; email: string | null; note: string | null; quoteNote: string | null; quotedTotal: number | null }
export function AdminPlaisirGatherings() {
  const { data = [] } = useList<Gath>('gatherings');
  const refresh = useRefresh('gatherings');
  const refreshDishes = useRefresh('dishes');
  const [f, setF] = useState<Gath | null>(null);
  const [saving, setSaving] = useState(false);
  const steps: WizardStep[] = f ? [{ id: 'q', title: 'Quote', complete: true, content: (
    <div className="space-y-3"><p className="text-sm text-muted-foreground">{f.groupName}: {f.headcount} guests ({f.vegCount} veg), {f.budgetBand}. Shown to the customer when the request moves to “Menu & quote shared”.</p>
      <div><Label htmlFor="qt">Quoted total (₹)</Label><Input id="qt" type="number" min={0} value={f.quotedTotal ?? ''} onChange={(e) => setF({ ...f, quotedTotal: e.target.value === '' ? null : Number(e.target.value) })} /></div>
      <div><Label htmlFor="qn">Menu / note for the customer</Label><textarea id="qn" rows={4} className="w-full rounded border bg-background p-2" value={f.quoteNote ?? ''} onChange={(e) => setF({ ...f, quoteNote: e.target.value })} /></div></div>) }] : [];
  return (
    <div><Head title="Team lunch requests" hint="Call the customer, attach a quote here, then move the stage on the Order board (Events desk).">
      <BulkUploadDialog title="Bulk update desk-lunch sets" columns={['slug', 'diet', 'signature', 'leadHours', 'priceConfirmed', 'shortNote']} sampleRow={['sandwich-set-chicken-pesto-sandwich-fries-iced-tea', 'NON_VEG', 'false', '0', 'true', 'Weekday desk lunch']} templateName="plaisir-desk-lunch-template.csv" onUpload={async (file) => { const r = await A.upload('dishes/bulk-upload', file); refreshDishes(); return r; }} /></Head>
      <AdminDataGrid<Gath> rowData={data} columnDefs={[{ field: 'orderNumber', headerName: 'Request' }, { field: 'stage' }, { field: 'groupName', headerName: 'Group' }, { field: 'type' }, { field: 'date' }, { field: 'time' }, { field: 'headcount', filter: 'agNumberColumnFilter' }, { field: 'vegCount', headerName: 'Veg' }, { field: 'budgetBand', headerName: 'Budget' }, { field: 'mode' }, { field: 'phone' }, { field: 'quotedTotal', headerName: 'Quote (₹)' }] as ColDef<Gath>[]} actions={[{ label: 'Quote', icon: Pencil, onClick: (r) => setF({ ...r }) }]} emptyMessage="No requests yet." />
      <StepperSheet open={f != null} onOpenChange={(n) => !n && setF(null)} title={`Quote ${f?.orderNumber ?? ''}`} steps={steps} canSave={!saving} saving={saving} onSave={async () => { if (!f) return; setSaving(true); try { await withToast(A.put(`gatherings/${f.id}/quote`, { quoteNote: f.quoteNote, quotedTotal: f.quotedTotal }), 'Quote saved'); refresh(); setF(null); } finally { setSaving(false); } }} />
    </div>
  );
}

// ── Flavours ──
interface Flav { id: number; name: string; colourHex: string; available: boolean }
export function AdminPlaisirFlavours() {
  const { data = [] } = useList<Flav>('flavours');
  const refresh = useRefresh('flavours');
  const [name, setName] = useState(''); const [hex, setHex] = useState('#E8A3B5');
  return (
    <div><Head title="Macaron flavours" hint="Only add flavours the counter really has. Customers build boxes from these.">
      <BulkUploadDialog title="Bulk upload flavours" columns={['name', 'colourHex']} sampleRow={['Pistachio', '#B5C99A']} templateName="plaisir-flavours-template.csv" onUpload={async (f) => { const r = await A.upload('flavours/bulk-upload', f); refresh(); return r; }} /></Head>
      <div className="mb-3 flex flex-wrap items-end gap-2"><div><Label htmlFor="fn">Flavour</Label><Input id="fn" value={name} onChange={(e) => setName(e.target.value)} /></div><div><Label htmlFor="fc">Colour</Label><Input id="fc" type="color" className="h-10 w-16 p-1" value={hex} onChange={(e) => setHex(e.target.value)} /></div><Button type="button" disabled={!name.trim()} onClick={async () => { await withToast(A.post('flavours', { name, colourHex: hex }), 'Added'); setName(''); refresh(); }}>Add flavour</Button></div>
      <AdminDataGrid<Flav> rowData={data} columnDefs={[{ field: 'name' }, { field: 'colourHex', headerName: 'Colour' }, { field: 'available' }] as ColDef<Flav>[]} actions={[{ label: 'Toggle available', icon: Pencil, onClick: async (r) => { await withToast(A.put(`flavours/${r.id}`, { name: r.name, colourHex: r.colourHex, available: !r.available }), 'Updated'); refresh(); } }]} emptyMessage="No flavours." /></div>
  );
}

// ── Suggestions ──
interface Sug { id: number; text: string; status: string; publicNote: string | null; showPublic: boolean; createdAt: string }
export function AdminPlaisirSuggestions() {
  const { data = [] } = useList<Sug>('suggestions');
  const refresh = useRefresh('suggestions');
  const upd = async (r: Sug, patch: Partial<Sug>) => { await withToast(A.put(`suggestions/${r.id}`, patch), 'Updated'); refresh(); };
  return (
    <div><Head title="Ideas from customers" hint="Move ideas through New, Planned and Done. Done ideas shown publicly appear under “Ideas we acted on”.">
      <BulkUploadDialog title="Bulk upload ideas" columns={['text', 'status', 'publicNote', 'showPublic']} sampleRow={['Add oat milk', 'NEW', '', 'false']} templateName="plaisir-ideas-template.csv" onUpload={async (f) => { const r = await A.upload('suggestions/bulk-upload', f); refresh(); return r; }} /></Head>
      <AdminDataGrid<Sug> rowData={data} columnDefs={[{ field: 'text', minWidth: 320 }, { field: 'status' }, { field: 'showPublic', headerName: 'Public' }, { field: 'publicNote', headerName: 'Public note' }, { field: 'createdAt', headerName: 'Received' }] as ColDef<Sug>[]} actions={[{ label: 'Mark planned', onClick: (r) => upd(r, { status: 'PLANNED' }) }, { label: 'Mark done & show publicly', onClick: (r) => upd(r, { status: 'DONE', showPublic: true }) }, { label: 'Reset to new', onClick: (r) => upd(r, { status: 'NEW', showPublic: false }) }]} emptyMessage="No ideas yet." /></div>
  );
}
