import { useState, useEffect, useRef } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, orderBy, query
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import {
  Plus, Edit2, Trash2, X, Image, Save, Eye, EyeOff,
  ShoppingBag, Tag, Package, DollarSign, Check, ChevronDown, ChevronUp
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import type { Merchandise, PricingOption } from '../../types';

const CATEGORIES = ['Uniform', 'Accessories', 'Equipment', 'Stationery', 'Other'];

const EMPTY_ITEM: Partial<Merchandise> = {
  name: '', description: '', price: '',
  image: '', category: 'Uniform', isPublished: false,
  pricingOptions: [], totalStock: 0,
};

const EMPTY_OPTION: PricingOption = { label: '', price: '', isActive: true, stock: 0 };

function MerchCard({ item, onEdit, onDelete, onToggle }: {
  item: Merchandise;
  onEdit: (i: Merchandise) => void;
  onDelete: (i: Merchandise) => void;
  onToggle: (i: Merchandise) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden border-2 transition-colors ${
      item.isPublished ? 'border-transparent' : 'border-dashed border-slate-200 dark:border-slate-700'}`}>
      <div className="flex items-center gap-3 px-5 py-4">
        {/* Image */}
        {item.image
          ? <img src={item.image} alt={item.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
          : <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-6 h-6 text-slate-300" />
            </div>
        }

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            {item.category && (
              <span className="px-2 py-0.5 bg-navy/10 text-navy dark:text-gold rounded-full text-xs font-black">{item.category}</span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${item.isPublished ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              {item.isPublished ? 'Published' : 'Draft'}
            </span>
          </div>
          <p className="font-black text-navy dark:text-white text-sm truncate">{item.name}</p>
          <p className="text-ocean font-black text-sm">{item.price}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setExpanded(!expanded)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          <button onClick={() => onToggle(item)}
            className={`p-1.5 rounded-lg transition-colors ${item.isPublished ? 'text-green-500 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}
            title={item.isPublished ? 'Unpublish' : 'Publish'}>
            {item.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button onClick={() => onEdit(item)} className="p-1.5 hover:bg-navy/10 rounded-lg transition-colors">
            <Edit2 className="w-4 h-4 text-navy dark:text-white" />
          </button>
          <button onClick={() => onDelete(item)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-4 border-t border-slate-50 dark:border-slate-700 pt-3 space-y-2">
          {item.description && <p className="text-sm text-slate-500 dark:text-slate-400">{item.description}</p>}
          {item.pricingOptions && item.pricingOptions.length > 0 && (
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Variants</p>
              <div className="flex gap-2 flex-wrap">
                {item.pricingOptions.map((opt, i) => (
                  <span key={i} className={`px-2 py-1 rounded-lg text-xs font-bold ${opt.isActive ? 'bg-navy/10 text-navy dark:text-white' : 'bg-slate-100 text-slate-400 line-through'}`}>
                    {opt.label} — {opt.price}
                    {opt.stock !== undefined && ` (${opt.stock} left)`}
                  </span>
                ))}
              </div>
            </div>
          )}
          {item.totalStock !== undefined && (
            <p className="text-xs text-slate-400"><strong>Total stock:</strong> {item.totalStock}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function MerchandisePage() {
  const [items, setItems]       = useState<Merchandise[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<Merchandise | null>(null);
  const [form, setForm]         = useState<Partial<Merchandise>>(EMPTY_ITEM);
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [filterCat, setFilterCat] = useState<string>('all');
  const imageRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const q = query(collection(db, 'merchandise'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Merchandise)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY_ITEM, pricingOptions: [] }); setModalOpen(true); };
  const openEdit   = (item: Merchandise) => { setEditing(item); setForm({ ...EMPTY_ITEM, ...item }); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); setForm(EMPTY_ITEM); };
  const set        = (k: keyof Merchandise, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { showToast('Image must be under 8MB', 'error'); return; }
    setUploading(true);
    try {
      const storageRef = ref(storage, `merchandise/${Date.now()}-${file.name}`);
      const task = uploadBytesResumable(storageRef, file);
      task.on('state_changed', (s) => setUploadPct(Math.round(s.bytesTransferred / s.totalBytes * 100)));
      await task;
      set('image', await getDownloadURL(storageRef));
      showToast('Image uploaded!', 'success');
    } catch { showToast('Upload failed', 'error'); }
    finally { setUploading(false); setUploadPct(0); }
  };

  // Pricing option helpers
  const addOption   = () => setForm((p) => ({ ...p, pricingOptions: [...(p.pricingOptions || []), { ...EMPTY_OPTION }] }));
  const removeOption = (i: number) => setForm((p) => ({ ...p, pricingOptions: (p.pricingOptions || []).filter((_, idx) => idx !== i) }));
  const setOption   = (i: number, k: keyof PricingOption, v: any) =>
    setForm((p) => ({ ...p, pricingOptions: (p.pricingOptions || []).map((o, idx) => idx === i ? { ...o, [k]: v } : o) }));

  const handleSave = async () => {
    if (!form.name?.trim()) { showToast('Item name is required.', 'error'); return; }
    if (!form.price?.trim()) { showToast('Price is required.', 'error'); return; }
    setSaving(true);
    try {
      const data = { ...form, updatedAt: serverTimestamp() };
      if (editing) {
        await updateDoc(doc(db, 'merchandise', editing.id), data);
        showToast('Item updated!', 'success');
      } else {
        await addDoc(collection(db, 'merchandise'), { ...data, createdAt: serverTimestamp() });
        showToast('Item added!', 'success');
      }
      closeModal();
    } catch { showToast('Failed to save.', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item: Merchandise) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    await deleteDoc(doc(db, 'merchandise', item.id));
    showToast('Item deleted', 'info');
  };

  const handleToggle = async (item: Merchandise) => {
    await updateDoc(doc(db, 'merchandise', item.id), { isPublished: !item.isPublished });
    showToast(item.isPublished ? 'Item unpublished' : 'Item published!', 'success');
  };

  const filtered = filterCat === 'all' ? items : items.filter((i) => i.category === filterCat);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Merchandise</h1>
          <p className="text-slate-500 text-sm mt-1">
            {items.filter(i => i.isPublished).length} published · {items.filter(i => !i.isPublished).length} drafts
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-navy text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-ocean transition-colors">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', ...CATEGORIES].map((cat) => (
          <button key={cat} onClick={() => setFilterCat(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              filterCat === cat ? 'bg-navy text-white' : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-navy dark:hover:text-white'}`}>
            {cat === 'all' ? `All (${items.length})` : cat}
          </button>
        ))}
      </div>

      {/* Items */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl h-20 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl py-16 text-center text-slate-400">
          <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-bold text-sm">No items yet. Add your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <MerchCard key={item.id} item={item} onEdit={openEdit} onDelete={handleDelete} onToggle={handleToggle} />
          ))}
        </div>
      )}

      {/* ── CREATE / EDIT MODAL ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col">

            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <h2 className="font-black text-navy dark:text-white text-lg">
                {editing ? 'Edit Item' : 'New Item'}
              </h2>
              <button onClick={closeModal} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* ── Category ── */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Category</label>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map((cat) => (
                    <button key={cat} type="button" onClick={() => set('category', cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        form.category === cat ? 'bg-navy text-white' : 'bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-navy dark:hover:text-white'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Name & Base Price ── */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Item Name *</label>
                  <input value={form.name || ''} onChange={(e) => set('name', e.target.value)}
                    placeholder="e.g. OBJICC Beret"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Base Price *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={form.price || ''} onChange={(e) => set('price', e.target.value)}
                      placeholder="JMD $1,500"
                      className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Total Stock</label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="number" min={0} value={form.totalStock ?? ''} onChange={(e) => set('totalStock', parseInt(e.target.value) || 0)}
                      placeholder="0 = unlimited"
                      className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm" />
                  </div>
                </div>
              </div>

              {/* ── Description ── */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Description</label>
                <textarea rows={3} value={form.description || ''} onChange={(e) => set('description', e.target.value)}
                  placeholder="Brief description of the item…"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm resize-none" />
              </div>

              {/* ── Image ── */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Product Image</label>
                <div className="flex gap-2">
                  <input value={form.image || ''} onChange={(e) => set('image', e.target.value)}
                    placeholder="Paste URL or upload…"
                    className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none text-sm" />
                  <input ref={imageRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <button type="button" onClick={() => imageRef.current?.click()} disabled={uploading}
                    className="flex items-center gap-1 px-4 py-2.5 border-2 border-dashed border-slate-300 hover:border-navy dark:hover:border-gold rounded-xl text-xs font-black text-slate-500 hover:text-navy dark:hover:text-white transition-all disabled:opacity-50">
                    <Image className="w-4 h-4" />{uploading ? `${uploadPct}%` : 'Upload'}
                  </button>
                </div>
                {form.image && (
                  <div className="mt-2 relative inline-block">
                    <img src={form.image} alt="Preview" className="h-24 w-24 object-cover rounded-xl" />
                    <button onClick={() => set('image', '')} className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-lg">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* ── Variants / Pricing Options ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Variants / Sizes</label>
                  <button type="button" onClick={addOption}
                    className="flex items-center gap-1 px-3 py-1 bg-navy/10 hover:bg-navy/20 text-navy dark:text-white rounded-lg text-xs font-black transition-colors">
                    <Plus className="w-3 h-3" /> Add Variant
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-3">e.g. Small, Medium, Large — each with its own price and stock count.</p>
                {(form.pricingOptions || []).length === 0 ? (
                  <div className="py-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 text-xs">
                    No variants added — item has one base price only
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(form.pricingOptions || []).map((opt, i) => (
                      <div key={i} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <input value={opt.label} onChange={(e) => setOption(i, 'label', e.target.value)}
                            placeholder="Label (e.g. Small)"
                            className="px-3 py-2 bg-white dark:bg-slate-700 rounded-lg text-xs font-bold text-navy dark:text-white outline-none focus:ring-1 focus:ring-navy/20" />
                          <input value={opt.price} onChange={(e) => setOption(i, 'price', e.target.value)}
                            placeholder="Price"
                            className="px-3 py-2 bg-white dark:bg-slate-700 rounded-lg text-xs font-bold text-navy dark:text-white outline-none focus:ring-1 focus:ring-navy/20" />
                          <input type="number" min={0} value={opt.stock ?? ''} onChange={(e) => setOption(i, 'stock', parseInt(e.target.value) || 0)}
                            placeholder="Stock"
                            className="px-3 py-2 bg-white dark:bg-slate-700 rounded-lg text-xs font-bold text-navy dark:text-white outline-none focus:ring-1 focus:ring-navy/20" />
                        </div>
                        <div className={`w-8 h-4 rounded-full cursor-pointer transition-colors relative shrink-0 ${opt.isActive ? 'bg-green-500' : 'bg-slate-300'}`}
                          onClick={() => setOption(i, 'isActive', !opt.isActive)}>
                          <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${opt.isActive ? 'left-4' : 'left-0.5'}`} />
                        </div>
                        <button onClick={() => removeOption(i)} className="p-1 text-red-400 hover:bg-red-50 rounded-lg shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Publish toggle ── */}
              <div onClick={() => set('isPublished', !form.isPublished)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  form.isPublished ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                <Eye className={`w-5 h-5 shrink-0 ${form.isPublished ? 'text-green-600' : 'text-slate-400'}`} />
                <div className="flex-1">
                  <p className={`text-sm font-black ${form.isPublished ? 'text-green-700 dark:text-green-400' : 'text-slate-500'}`}>
                    {form.isPublished ? 'Published — visible in shop' : 'Draft — hidden from shop'}
                  </p>
                  <p className="text-xs text-slate-400">Toggle to show or hide this item in the member shop</p>
                </div>
                <div className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${form.isPublished ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-600'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isPublished ? 'left-5' : 'left-0.5'}`} />
                </div>
              </div>

            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
              <button onClick={handleSave} disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-navy text-white font-black rounded-xl text-sm uppercase tracking-widest hover:bg-ocean transition-colors disabled:opacity-60">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving…' : editing ? 'Update Item' : 'Add to Shop'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
