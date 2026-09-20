import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { ShoppingBag, Plus, Minus, Trash2, ShoppingCart, X, Check, PackageX, Store, CreditCard, Upload, FileText, Clock, ArrowLeft, Paperclip, User, Phone } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import type { Merchandise, PricingOption } from '../types';

const priceNum = (p: string) => parseFloat(p.replace(/[^0-9.]/g, '')) || 0;
const itemCurrency = (item: Merchandise | { currency?: 'USD' | 'JMD' }): 'USD' | 'JMD' => item.currency || 'JMD';
const displayPrice = (price: string, currency: 'USD' | 'JMD') => /^(USD|JMD)\b/.test(price.trim()) ? price : `${currency} $${price}`;
const lineKey = (id: string, size?: string) => `${id}__${size || 'base'}`;
const withoutUndefined = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(withoutUndefined);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined).map(([key, entry]) => [key, withoutUndefined(entry)]));
  }
  return value;
};
const RECEIPT_ACCEPT = '.jpg,.jpeg,.png,.heic,.heif,.webp,.pdf,image/jpeg,image/png,image/heic,image/heif,image/webp,application/pdf';
const RECEIPT_MAX_MB = 15;

export default function PublicShopPage() {
  const [items, setItems] = useState<Merchandise[]>([]);
  const [filterCat, setFilterCat] = useState('all');
  const [showAllFilterCats, setShowAllFilterCats] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<Merchandise | null>(null);
  const [detailVariant, setDetailVariant] = useState<PricingOption | null>(null);
  const [detailQty, setDetailQty] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "walk-in" | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'closed' | 'contact-info' | 'choice' | 'pay-now' | 'receipt'>('closed');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Create a local cart state since this is a separate shop
  const [cart, setCart] = useState<any[]>([]);

  const { profile } = useUser();
  const { showToast } = useToast();

  useEffect(() => {
    // Query public_merchandise instead of merchandise
    const q = query(collection(db, 'public_merchandise'), where('isPublished', '==', true));
    return onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as Merchandise)));
      setLoading(false);
    });
  }, []);

  // Pre-fill contact info if logged in
  useEffect(() => {
    if (profile) {
      if (!customerName) setCustomerName(profile.displayName || '');
      if (!customerPhone) setCustomerPhone(profile.phone || '');
    }
  }, [profile]);

  const openDetail = (item: Merchandise) => {
    setDetailItem(item);
    const activeOpts = (item.pricingOptions || []).filter(o => o.isActive);
    setDetailVariant(activeOpts.length > 0 ? activeOpts.find(o => (o.stock ?? 1) > 0) || activeOpts[0] : null);
    setDetailQty(1);
  };
  const closeDetail = () => { setDetailItem(null); setDetailVariant(null); setDetailQty(1); };

  const addToCart = (item: Merchandise, opts: { variant: PricingOption | null; qty: number }) => {
    const size = opts.variant?.label;
    const price = opts.variant ? opts.variant.price : item.price;
    const key = lineKey(item.id, size);
    setCart(prev => {
      const ex = prev.find(c => (c.lineKey || lineKey(c.id, c.selectedSize)) === key);
      if (ex) return prev.map(c => (c.lineKey || lineKey(c.id, c.selectedSize)) === key ? { ...c, quantity: c.quantity + opts.qty } : c);
      return [...prev, { id: item.id, name: item.name, price, currency: itemCurrency(item), quantity: opts.qty, selectedSize: size, image: item.image, lineKey: key }];
    });
    showToast(`${item.name}${size ? ` (${size})` : ''} added to cart`, 'success');
    setCartOpen(true);
  };

  const quickAdd = (item: Merchandise, e: React.MouseEvent) => {
    e.stopPropagation();
    const activeOpts = (item.pricingOptions || []).filter(o => o.isActive);
    if (activeOpts.length > 0) { openDetail(item); return; }
    addToCart(item, { variant: null, qty: 1 });
  };

  const updateQty = (key: string, delta: number) => setCart(prev => prev.map(c => (c.lineKey || lineKey(c.id, c.selectedSize)) === key ? { ...c, quantity: c.quantity + delta } : c).filter(c => c.quantity > 0));
  const removeLine = (key: string) => setCart(p => p.filter(c => (c.lineKey || lineKey(c.id, c.selectedSize)) !== key));

  const totalItems = cart.reduce((s, c) => s + c.quantity, 0);
  const totalPrice = () => Object.entries(cart.reduce((s, c) => { const currency = itemCurrency(c); s[currency] = (s[currency] || 0) + priceNum(c.price) * c.quantity; return s; }, {} as Record<'USD' | 'JMD', number>)).map(([currency, sum]) => `${currency} $${sum.toFixed(2)}`).join(' + ');

  const finalizeOrder = async (extra: Record<string, any> = {}) => {
    if (!cart.length) return;
    setSubmitting(true);
    try {
      const requestId = `PUB-${Date.now().toString(36).toUpperCase()}`;
      await addDoc(collection(db, 'public_orders'), withoutUndefined({
        userUid: profile?.uid || 'guest',
        customerName,
        customerPhone,
        items: cart,
        totalPrice: totalPrice(),
        paymentMethod,
        paymentStatus: 'pending',
        status: 'pending',
        requestId,
        createdAt: serverTimestamp(),
        ...extra
      }));
      setCart([]);
      setOrderSuccess(true);
      setPaymentMethod(null);
      setCheckoutStep('closed');
      setReceiptFile(null);
      showToast('Order submitted!', 'success');
    } catch (err) {
      console.error('Failed to submit public order:', err);
      const code = (err as { code?: string })?.code;
      showToast(`Failed to submit order${code ? ` (${code})` : ''}.`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const submitOrderClick = () => {
    if (!cart.length) return;
    if (!paymentMethod) { showToast('Please select how you\'ll pay.', 'error'); return; }
    setCheckoutStep('contact-info');
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      showToast('Please provide your name and phone number.', 'error');
      return;
    }
    
    if (paymentMethod === 'walk-in') {
      finalizeOrder({ paymentSubOption: 'walk-in' });
    } else {
      setCheckoutStep('choice');
    }
  };

  const validateReceiptFile = (f: File): string | null => {
    const okType = /\.(jpe?g|png|heic|heif|webp|pdf)$/i.test(f.name) || ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'application/pdf'].includes(f.type);
    if (!okType) return 'Please upload a photo (JPG, PNG, HEIC, WEBP) or a PDF.';
    if (f.size > RECEIPT_MAX_MB * 1024 * 1024) return `File is too large -- please keep it under ${RECEIPT_MAX_MB}MB.`;
    return null;
  };

  const onReceiptSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const err = validateReceiptFile(f);
    if (err) { showToast(err, 'error'); e.target.value = ''; return; }
    setReceiptFile(f);
  };

  const submitReceipt = async () => {
    if (!receiptFile) return;
    setUploadingReceipt(true);
    try {
      let receiptUrl: string | null = null;
      try {
        const path = `receipts/public/${Date.now()}-${receiptFile.name}`;
        const fileRef = ref(storage, path);
        await uploadBytes(fileRef, receiptFile);
        receiptUrl = await getDownloadURL(fileRef);
      } catch (uploadErr) {
        console.warn('Receipt upload unavailable (Storage not yet configured):', uploadErr);
        showToast("Order submitted, but we couldn't upload your receipt right now -- please bring a copy to the office.", 'info');
      }
      await finalizeOrder({ paymentSubOption: 'receipt', receiptUrl, receiptFileName: receiptFile.name, receiptUploadPending: !receiptUrl });
    } finally {
      setUploadingReceipt(false);
    }
  };

  const activeOpts = (detailItem?.pricingOptions || []).filter(o => o.isActive);
  const detailPrice = detailVariant ? detailVariant.price : detailItem?.price || '';
  const detailStock = detailVariant?.stock;
  const detailMaxed = detailStock !== undefined && detailQty >= detailStock;
  const detailOutOfStock = detailStock !== undefined && detailStock <= 0;

  const categoryCounts = items.reduce((acc, item) => {
    if (item.category) acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const sortedCats = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  const popularCats = sortedCats.slice(0, 4);
  const otherCats = sortedCats.slice(4);
  const displayedFilterCats = showAllFilterCats ? sortedCats : popularCats;

  const filteredItems = filterCat === 'all' ? items : items.filter(i => i.category === filterCat);

  return (
    <div className="min-h-screen pt-28 pb-16 bg-slate-50 dark:bg-darkbg">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-4xl font-black text-navy dark:text-white uppercase tracking-tight mb-2">Ocean Blue JA Stores</h1>
              <p className="text-slate-500">Discover exclusive merchandise, gift baskets, and more.</p>
            </div>
            <button onClick={() => setCartOpen(true)} className="relative flex items-center gap-2 px-5 py-3 bg-ocean text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-navy transition-colors">
              <ShoppingCart className="w-4 h-4" />Cart
              {totalItems > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-gold text-navy rounded-full text-xs font-black flex items-center justify-center">{totalItems}</span>}
            </button>
          </div>
          {items.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-8">
              <button onClick={()=>setFilterCat('all')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterCat==='all'?'bg-ocean text-white':'bg-white dark:bg-slate-800 text-slate-500 hover:text-ocean dark:hover:text-white shadow-sm'}`}>All ({items.length})</button>
              {displayedFilterCats.map(c=><button key={c} onClick={()=>setFilterCat(c)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterCat===c?'bg-ocean text-white':'bg-white dark:bg-slate-800 text-slate-500 hover:text-ocean dark:hover:text-white shadow-sm'}`}>{c}</button>)}
              {otherCats.length > 0 && (
                <button onClick={()=>setShowAllFilterCats(!showAllFilterCats)} className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all bg-white dark:bg-slate-800 text-slate-400 hover:text-ocean dark:hover:text-white shadow-sm">
                  {showAllFilterCats ? 'Show Less' : `+ ${otherCats.length} More`}
                </button>
              )}
            </div>
          )}
          {loading ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">{[...Array(8)].map((_, i) => <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl h-64 animate-pulse" />)}</div>
            : filteredItems.length === 0 ? <div className="text-center py-20 text-slate-400"><ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-30" /><p className="font-bold">No items found.</p></div>
              : <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">{filteredItems.map(item => {
                const hasVariants = (item.pricingOptions || []).some(o => o.isActive);
                const allOutOfStock = hasVariants && (item.pricingOptions || []).filter(o => o.isActive).every(o => (o.stock ?? 1) <= 0);
                return (
                  <article key={item.id} onClick={() => openDetail(item)}
                    className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-all group cursor-pointer hover:-translate-y-0.5 border border-slate-100 dark:border-slate-700">
                    <div className="aspect-square overflow-hidden bg-slate-100 dark:bg-slate-700 relative">
                      {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-12 h-12 text-slate-300" /></div>}
                      {allOutOfStock && <div className="absolute inset-0 bg-navy/60 flex items-center justify-center"><span className="px-3 py-1.5 bg-white/90 text-navy rounded-full text-xs font-black uppercase tracking-widest">Out of Stock</span></div>}
                    </div>
                    <div className="p-4">
                      <h3 className="font-black text-navy dark:text-white text-sm leading-tight mb-1">{item.name}</h3>
                      {item.description && <p className="text-slate-400 text-xs mb-3 line-clamp-2">{item.description}</p>}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-ocean text-base">{hasVariants ? `From ${displayPrice(item.price, itemCurrency(item))}` : displayPrice(item.price, itemCurrency(item))}</span>
                        <button onClick={e => quickAdd(item, e)} disabled={allOutOfStock}
                          className="flex items-center gap-1 px-3 py-1.5 bg-ocean text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-navy transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
                          <Plus className="w-3 h-3" />Add
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}</div>}
        </div>
      </div>

      {/* Product detail modal */}
      {detailItem && <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm" onClick={closeDetail}>
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col sm:flex-row" onClick={e => e.stopPropagation()}>
          <div className="sm:w-1/2 aspect-square sm:aspect-auto bg-slate-100 dark:bg-slate-700 shrink-0 relative">
            {detailItem.image ? <img src={detailItem.image} alt={detailItem.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-16 h-16 text-slate-300" /></div>}
            <button onClick={closeDetail} className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-slate-800/90 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors sm:hidden"><X className="w-4 h-4 text-navy dark:text-white" /></button>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <div className="hidden sm:flex items-start justify-between px-6 pt-6"><span />
              <button onClick={closeDetail} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="px-6 sm:pt-2 pt-5 pb-4 overflow-y-auto flex-1">
              {detailItem.category && <span className="text-xs font-black text-ocean uppercase tracking-widest">{detailItem.category}</span>}
              <h2 className="text-2xl font-black text-navy dark:text-white mt-1 mb-2 leading-tight">{detailItem.name}</h2>
              {detailItem.description && <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-5">{detailItem.description}</p>}

              {activeOpts.length > 0 && <div className="mb-5">
                <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Choose an option</p>
                <div className="flex flex-wrap gap-2">
                  {activeOpts.map(o => {
                    const out = (o.stock ?? 1) <= 0;
                    const sel = detailVariant?.label === o.label;
                    return (<button key={o.label} disabled={out} onClick={() => { setDetailVariant(o); setDetailQty(1); }}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${out ? 'opacity-40 cursor-not-allowed border-slate-100 dark:border-slate-700 text-slate-400' : sel ? 'border-ocean bg-ocean/10 text-ocean dark:text-white' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-ocean/40'}`}>
                      {o.label} — {displayPrice(o.price, itemCurrency(detailItem))}{out ? ' (Out of stock)' : ''}
                    </button>);
                  })}
                </div>
              </div>}

              {detailStock !== undefined && !detailOutOfStock && <p className="text-xs text-slate-400 mb-4">{detailStock} in stock</p>}

              <div className="flex items-center gap-4 mb-2">
                <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Quantity</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setDetailQty(q => Math.max(1, q - 1))} className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"><Minus className="w-3.5 h-3.5 text-navy dark:text-white" /></button>
                  <span className="w-8 text-center font-black text-navy dark:text-white">{detailQty}</span>
                  <button onClick={() => setDetailQty(q => detailMaxed ? q : q + 1)} disabled={detailMaxed} className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-40"><Plus className="w-3.5 h-3.5 text-navy dark:text-white" /></button>
                </div>
              </div>
            </div>
            <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-700 shrink-0">
              {detailOutOfStock ? (
                <div className="flex items-center justify-center gap-2 py-3 text-slate-400 font-bold text-sm"><PackageX className="w-4 h-4" />Out of stock</div>
              ) : (
                <button onClick={() => { addToCart(detailItem, { variant: detailVariant, qty: detailQty }); closeDetail(); }}
                  className="w-full py-3.5 bg-ocean text-white font-black rounded-xl text-sm uppercase tracking-widest hover:bg-navy transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />Add to Cart — {itemCurrency(detailItem)} ${(priceNum(detailPrice) * detailQty).toFixed(2)}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>}

      {/* Cart Sidebar */}
      {cartOpen && <>
        <div className="fixed inset-0 bg-navy/40 z-40" onClick={() => { setCartOpen(false); setOrderSuccess(false); }} />
        <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-slate-900 z-50 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-black text-navy dark:text-white uppercase tracking-tight">{orderSuccess ? 'Order Placed!' : `Cart (${totalItems})`}</h2>
            <button onClick={() => { setCartOpen(false); setOrderSuccess(false); }}><X className="w-5 h-5 text-slate-400" /></button>
          </div>
          {orderSuccess ? <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"><Check className="w-8 h-8 text-green-600" /></div>
            <h3 className="font-black text-navy dark:text-white text-xl mb-2">Order Submitted!</h3>
            <p className="text-slate-400 text-sm">We will contact you to confirm and arrange delivery or pickup.</p>
            <button onClick={() => { setCartOpen(false); setOrderSuccess(false); }} className="mt-6 px-6 py-3 bg-ocean text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-navy transition-colors">Continue Shopping</button>
          </div> : <>
            <div className="flex-1 overflow-y-auto p-5 min-h-0">
              {cart.length === 0 ? <div className="text-center py-16 text-slate-400"><ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="font-bold text-sm">Your cart is empty</p></div>
                : <div className="space-y-4">{cart.map(item => {
                  const key = item.lineKey || lineKey(item.id, item.selectedSize);
                  return (
                    <div key={key} className="flex items-center gap-3">
                      {item.image && <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-navy dark:text-white text-sm truncate">{item.name}</p>
                        {item.selectedSize && <p className="text-xs text-slate-400">{item.selectedSize}</p>}
                        <p className="text-ocean font-black text-sm">{displayPrice(item.price, itemCurrency(item))}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(key, -1)} className="w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                        <span className="w-6 text-center text-sm font-black text-navy dark:text-white">{item.quantity}</span>
                        <button onClick={() => updateQty(key, 1)} className="w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                        <button onClick={() => removeLine(key)} className="ml-1 p-1 text-red-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  );
                })}<div className="border-t border-slate-100 dark:border-slate-700 pt-3 flex justify-between font-black text-navy dark:text-white text-sm"><span>Total</span><span>{totalPrice()}</span></div></div>}
            </div>
            {cart.length > 0 && <div className="p-5 border-t border-slate-100 dark:border-slate-800 space-y-3 shrink-0">
              <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">How will you pay?</p>
              <div className="space-y-2">
                {([
                  { id: 'walk-in' as const, icon: Store, title: 'Walk-in / Cash', desc: 'Pay in person at pickup' },
                  { id: 'online' as const, icon: CreditCard, title: 'Online Transfer', desc: 'Make your payment online' },
                ]).map(opt => {
                  const Icon = opt.icon; const sel = paymentMethod === opt.id;
                  return (
                    <button key={opt.id} onClick={() => setPaymentMethod(opt.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${sel ? 'border-ocean bg-ocean/10' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'}`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${sel ? 'bg-ocean text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}><Icon className="w-4 h-4" /></div>
                      <div className="min-w-0 flex-1"><p className={`text-sm font-black ${sel ? 'text-navy dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>{opt.title}</p><p className="text-xs text-slate-400">{opt.desc}</p></div>
                      {sel && <Check className="w-4 h-4 text-ocean shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <button onClick={submitOrderClick} disabled={submitting || !paymentMethod} title={!paymentMethod ? 'Select a payment method first' : ''}
                className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                Checkout
              </button>
            </div>}
          </>}
        </div>
      </>}

      {/* Checkout sub-flow modal */}
      {checkoutStep !== 'closed' && <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm" onClick={() => { setCheckoutStep('closed'); setReceiptFile(null); }}>
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              {(checkoutStep === 'choice' || checkoutStep === 'pay-now' || checkoutStep === 'receipt') && <button onClick={() => checkoutStep === 'choice' ? setCheckoutStep('contact-info') : setCheckoutStep('choice')} className="p-1 -ml-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><ArrowLeft className="w-4 h-4 text-slate-400" /></button>}
              <h2 className="font-black text-navy dark:text-white">
                {checkoutStep === 'contact-info' ? 'Your Details' :
                 checkoutStep === 'choice' ? 'Online Payment' :
                 checkoutStep === 'pay-now' ? 'Pay Now' : 'Submit Receipt'}
              </h2>
            </div>
            <button onClick={() => { setCheckoutStep('closed'); setReceiptFile(null); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
          </div>

          {checkoutStep === 'contact-info' && <form onSubmit={handleContactSubmit} className="p-6 space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Please provide your contact information so we can process your order.</p>
            
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                <input required value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Jane Doe" className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-navy dark:text-white text-sm font-bold outline-none focus:ring-2 focus:ring-ocean/20"/>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Phone Number *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                <input required type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="(876) 555-0123" className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-navy dark:text-white text-sm font-bold outline-none focus:ring-2 focus:ring-ocean/20"/>
              </div>
            </div>

            <button type="submit" disabled={submitting} className="w-full mt-4 py-3 bg-ocean hover:bg-navy text-white font-black rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
              {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : 'Continue'}
            </button>
          </form>}

          {checkoutStep === 'choice' && <div className="p-6 space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">How would you like to complete your online payment?</p>
            <button onClick={() => setCheckoutStep('pay-now')} className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-slate-100 dark:border-slate-700 hover:border-ocean/40 text-left transition-all">
              <div className="w-10 h-10 rounded-xl bg-ocean/10 flex items-center justify-center shrink-0"><CreditCard className="w-5 h-5 text-ocean" /></div>
              <div className="min-w-0 flex-1"><p className="font-black text-navy dark:text-white text-sm">Pay Now</p><p className="text-xs text-slate-400">Complete your payment online right now</p></div>
            </button>
            <button onClick={() => setCheckoutStep('receipt')} className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-slate-100 dark:border-slate-700 hover:border-ocean/40 text-left transition-all">
              <div className="w-10 h-10 rounded-xl bg-ocean/10 flex items-center justify-center shrink-0"><Upload className="w-5 h-5 text-ocean" /></div>
              <div className="min-w-0 flex-1"><p className="font-black text-navy dark:text-white text-sm">Submit Receipt</p><p className="text-xs text-slate-400">Already paid? Upload a photo or PDF of your receipt</p></div>
            </button>
          </div>}

          {checkoutStep === 'pay-now' && <div className="p-6 text-center">
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-4"><Clock className="w-8 h-8 text-amber-500" /></div>
            <h3 className="font-black text-navy dark:text-white text-lg mb-2">Online Payments Coming Soon</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">We're still finalizing online checkout. In the meantime, you can submit a receipt if you've already paid, or choose Walk-in to pay at pickup.</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => setCheckoutStep('receipt')} className="w-full py-3 bg-ocean text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-navy transition-colors">Submit a Receipt Instead</button>
              <button onClick={() => { setPaymentMethod('walk-in'); setCheckoutStep('contact-info'); }} className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-navy dark:text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Switch to Walk-in</button>
            </div>
          </div>}

          {checkoutStep === 'receipt' && <div className="p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Already made your payment? Upload a photo of your receipt (a phone picture is fine) or a PDF, and we'll confirm it on our end.</p>
            <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl py-8 px-4 cursor-pointer transition-colors ${receiptFile ? 'border-ocean/40 bg-ocean/5' : 'border-slate-200 dark:border-slate-700 hover:border-ocean/30'}`}>
              <input type="file" accept={RECEIPT_ACCEPT} onChange={onReceiptSelected} className="hidden" />
              {receiptFile ? <>
                <Paperclip className="w-6 h-6 text-ocean" />
                <p className="text-sm font-bold text-navy dark:text-white text-center px-4 truncate max-w-full">{receiptFile.name}</p>
                <p className="text-xs text-slate-400">{(receiptFile.size / 1024 / 1024).toFixed(1)} MB — tap to change</p>
              </> : <>
                <FileText className="w-8 h-8 text-slate-300" />
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Tap to choose a photo or PDF</p>
                <p className="text-xs text-slate-400">JPG, PNG, HEIC, WEBP, or PDF — up to {RECEIPT_MAX_MB}MB</p>
              </>}
            </label>
            <button onClick={submitReceipt} disabled={!receiptFile || uploadingReceipt}
              className="w-full mt-4 py-3 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {uploadingReceipt ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              {uploadingReceipt ? 'Submitting…' : 'Submit Receipt'}
            </button>
          </div>}
        </div>
      </div>}
    </div>
  );
}
