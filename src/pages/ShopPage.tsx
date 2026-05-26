import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ShoppingBag, Plus, Minus, Trash2, ShoppingCart, X, Check } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import type { Merchandise, CartItem } from '../types';

function ProductCard({ item, onAdd }: { item: Merchandise; onAdd: (item: Merchandise) => void }) {
  return (
    <article className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
      <div className="aspect-square overflow-hidden bg-slate-100 dark:bg-slate-700">
        {item.image
          ? <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-12 h-12 text-slate-300" /></div>
        }
      </div>
      <div className="p-4">
        <h3 className="font-black text-navy dark:text-white text-sm leading-tight mb-1">{item.name}</h3>
        {item.description && <p className="text-slate-400 text-xs mb-3 line-clamp-2">{item.description}</p>}
        <div className="flex items-center justify-between">
          <span className="font-black text-ocean text-base">{item.price}</span>
          <button
            onClick={() => onAdd(item)}
            className="flex items-center gap-1 px-3 py-1.5 bg-navy text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-ocean transition-colors"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        {item.pricingOptions && item.pricingOptions.some((p) => p.isActive) && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {item.pricingOptions.filter((p) => p.isActive).map((opt) => (
              <span key={opt.label} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-full text-xs font-bold">
                {opt.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export default function ShopPage() {
  const [items, setItems] = useState<Merchandise[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'walk-in'>('walk-in');
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const { cart, setCart, profile } = useUser();
  const { showToast } = useToast();

  useEffect(() => {
    const q = query(collection(db, 'merchandise'), where('isPublished', '==', true));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Merchandise)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const addToCart = (item: Merchandise) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) return prev.map((c) => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1, image: item.image }];
    });
    showToast(`${item.name} added to cart`, 'success');
    setCartOpen(true);
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => prev
      .map((c) => c.id === id ? { ...c, quantity: c.quantity + delta } : c)
      .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((c) => c.id !== id));

  const totalItems = cart.reduce((s, c) => s + c.quantity, 0);
  const totalPrice = () => {
    const sum = cart.reduce((s, c) => {
      const price = parseFloat(c.price.replace(/[^0-9.]/g, '')) || 0;
      return s + price * c.quantity;
    }, 0);
    return `JMD $${sum.toFixed(2)}`;
  };

  const handleSubmitOrder = async () => {
    if (!profile || cart.length === 0) return;
    setSubmitting(true);
    try {
      const requestId = `ORD-${Date.now().toString(36).toUpperCase()}`;
      await addDoc(collection(db, 'merch_requests'), {
        userUid: profile.uid,
        requesterName: profile.displayName,
        cadetName: profile.cadetName || profile.displayName,
        phone: profile.phone,
        items: cart,
        totalPrice: totalPrice(),
        paymentMethod,
        paymentStatus: 'pending',
        status: 'pending',
        requestId,
        createdAt: serverTimestamp(),
      });
      setCart([]);
      setOrderSuccess(true);
      showToast('Order submitted! We will contact you shortly.', 'success');
    } catch {
      showToast('Failed to submit order. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-16 bg-slate-50 dark:bg-darkbg">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-4xl font-black text-navy dark:text-white uppercase tracking-tight mb-2">Shop</h1>
              <p className="text-slate-500">OBJICC merchandise — available to members.</p>
            </div>
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 px-5 py-3 bg-navy text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-ocean transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              Cart
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-gold text-navy rounded-full text-xs font-black flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {[...Array(8)].map((_, i) => <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl h-64 animate-pulse" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-bold">Shop coming soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {items.map((item) => <ProductCard key={item.id} item={item} onAdd={addToCart} />)}
            </div>
          )}
        </div>
      </div>

      {/* Cart Drawer */}
      {cartOpen && (
        <>
          <div className="fixed inset-0 bg-navy/40 z-40" onClick={() => { setCartOpen(false); setCheckoutMode(false); setOrderSuccess(false); }} />
          <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-slate-900 z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-black text-navy dark:text-white uppercase tracking-tight">
                {orderSuccess ? 'Order Placed!' : checkoutMode ? 'Checkout' : `Cart (${totalItems})`}
              </h2>
              <button onClick={() => { setCartOpen(false); setCheckoutMode(false); setOrderSuccess(false); }}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {orderSuccess ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-black text-navy dark:text-white text-xl mb-2">Order Submitted!</h3>
                <p className="text-slate-400 text-sm">We'll contact you at {profile?.phone} to confirm and arrange payment.</p>
                <button onClick={() => { setCartOpen(false); setOrderSuccess(false); }}
                  className="mt-6 px-6 py-3 bg-navy text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-ocean transition-colors">
                  Continue Shopping
                </button>
              </div>
            ) : checkoutMode ? (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-300 font-medium">{item.name} × {item.quantity}</span>
                      <span className="font-bold text-navy dark:text-white">{item.price}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-100 dark:border-slate-700 pt-2 flex justify-between font-black text-navy dark:text-white">
                    <span>Total</span><span>{totalPrice()}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-2">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['walk-in', 'online'] as const).map((m) => (
                      <button key={m} onClick={() => setPaymentMethod(m)}
                        className={`py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${paymentMethod === m ? 'bg-navy text-white' : 'bg-slate-50 text-slate-400'}`}>
                        {m === 'walk-in' ? '🏢 Walk-in' : '💳 Online'}
                      </button>
                    ))}
                  </div>
                  {paymentMethod === 'walk-in' && (
                    <p className="text-xs text-slate-400 mt-2">Pay in person at our office. We'll confirm your order via WhatsApp.</p>
                  )}
                  {paymentMethod === 'online' && (
                    <p className="text-xs text-slate-400 mt-2">Online payment coming soon. We'll contact you with payment instructions.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5">
                {cart.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-bold text-sm">Your cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        {item.image && <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-navy dark:text-white text-sm truncate">{item.name}</p>
                          <p className="text-ocean font-black text-sm">{item.price}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-black text-navy dark:text-white">{item.quantity}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors">
                            <Plus className="w-3 h-3" />
                          </button>
                          <button onClick={() => removeFromCart(item.id)} className="ml-1 p-1 text-red-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-slate-100 dark:border-slate-700 pt-3 flex justify-between font-black text-navy dark:text-white text-sm">
                      <span>Total</span><span>{totalPrice()}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!orderSuccess && (
              <div className="p-5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                {checkoutMode ? (
                  <>
                    <button onClick={handleSubmitOrder} disabled={submitting}
                      className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                      {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                      Confirm Order
                    </button>
                    <button onClick={() => setCheckoutMode(false)} className="w-full py-2 text-slate-400 text-xs font-bold hover:text-navy transition-colors">
                      ← Back to cart
                    </button>
                  </>
                ) : (
                  <button onClick={() => setCheckoutMode(true)} disabled={cart.length === 0}
                    className="w-full py-3 bg-navy text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-ocean transition-colors disabled:opacity-40">
                    Proceed to Checkout
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
