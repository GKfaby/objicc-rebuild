import{useState,useEffect} from 'react';
import{collection,query,where,onSnapshot,addDoc,serverTimestamp} from 'firebase/firestore';
import{db} from '../firebase';
import{ShoppingBag,Plus,Minus,Trash2,ShoppingCart,X,Check,PackageX,Store,CreditCard} from 'lucide-react';
import{useUser} from '../contexts/UserContext';
import{useToast} from '../contexts/ToastContext';
import type{Merchandise,CartItem,PricingOption} from '../types';

const priceNum=(p:string)=>parseFloat(p.replace(/[^0-9.]/g,''))||0;
const lineKey=(id:string,size?:string)=>`${id}__${size||'base'}`;

export default function ShopPage(){
  const[items,setItems]=useState<Merchandise[]>([]);
  const[loading,setLoading]=useState(true);
  const[cartOpen,setCartOpen]=useState(false);
  const[detailItem,setDetailItem]=useState<Merchandise|null>(null);
  const[detailVariant,setDetailVariant]=useState<PricingOption|null>(null);
  const[detailQty,setDetailQty]=useState(1);
  const[paymentMethod,setPaymentMethod]=useState<"online"|"walk-in"|null>(null);
  const[submitting,setSubmitting]=useState(false);
  const[orderSuccess,setOrderSuccess]=useState(false);
  const{cart,setCart,profile}=useUser();
  const{showToast}=useToast();

  useEffect(()=>{const q=query(collection(db,'merchandise'),where('isPublished','==',true));return onSnapshot(q,snap=>{setItems(snap.docs.map(d=>({id:d.id,...d.data()} as Merchandise)));setLoading(false);});},[]);

  const openDetail=(item:Merchandise)=>{
    setDetailItem(item);
    const activeOpts=(item.pricingOptions||[]).filter(o=>o.isActive);
    setDetailVariant(activeOpts.length>0?activeOpts.find(o=>(o.stock??1)>0)||activeOpts[0]:null);
    setDetailQty(1);
  };
  const closeDetail=()=>{setDetailItem(null);setDetailVariant(null);setDetailQty(1);};

  const addToCart=(item:Merchandise,opts:{variant:PricingOption|null;qty:number})=>{
    const size=opts.variant?.label;
    const price=opts.variant?opts.variant.price:item.price;
    const key=lineKey(item.id,size);
    setCart(prev=>{
      const ex=prev.find(c=>(c.lineKey||lineKey(c.id,c.selectedSize))===key);
      if(ex)return prev.map(c=>(c.lineKey||lineKey(c.id,c.selectedSize))===key?{...c,quantity:c.quantity+opts.qty}:c);
      return[...prev,{id:item.id,name:item.name,price,quantity:opts.qty,selectedSize:size,image:item.image,lineKey:key}];
    });
    showToast(`${item.name}${size?` (${size})`:''} added to cart`,'success');
    setCartOpen(true);
  };

  const quickAdd=(item:Merchandise,e:React.MouseEvent)=>{
    e.stopPropagation();
    const activeOpts=(item.pricingOptions||[]).filter(o=>o.isActive);
    if(activeOpts.length>0){openDetail(item);return;} // variant required -- open detail instead of guessing
    addToCart(item,{variant:null,qty:1});
  };

  const updateQty=(key:string,delta:number)=>setCart(prev=>prev.map(c=>(c.lineKey||lineKey(c.id,c.selectedSize))===key?{...c,quantity:c.quantity+delta}:c).filter(c=>c.quantity>0));
  const removeLine=(key:string)=>setCart(p=>p.filter(c=>(c.lineKey||lineKey(c.id,c.selectedSize))!==key));

  const totalItems=cart.reduce((s,c)=>s+c.quantity,0);
  const totalPrice=()=>{const sum=cart.reduce((s,c)=>s+priceNum(c.price)*c.quantity,0);return`JMD $${sum.toFixed(2)}`;};

  const submitOrder=async()=>{if(!profile||!cart.length||!paymentMethod){showToast('Please select how you\'ll pay.','error');return;}setSubmitting(true);
    try{const requestId=`ORD-${Date.now().toString(36).toUpperCase()}`;
      await addDoc(collection(db,'merch_requests'),{userUid:profile.uid,requesterName:profile.displayName,cadetName:profile.cadetName||profile.displayName,phone:profile.phone,items:cart,totalPrice:totalPrice(),paymentMethod,paymentStatus:'pending',status:'pending',requestId,createdAt:serverTimestamp()});
      setCart([]);setOrderSuccess(true);setPaymentMethod(null);showToast('Order submitted!','success');
    }catch{showToast('Failed to submit order.','error');}finally{setSubmitting(false);}};

  const activeOpts=(detailItem?.pricingOptions||[]).filter(o=>o.isActive);
  const detailPrice=detailVariant?detailVariant.price:detailItem?.price||'';
  const detailStock=detailVariant?.stock;
  const detailMaxed=detailStock!==undefined&&detailQty>=detailStock;
  const detailOutOfStock=detailStock!==undefined&&detailStock<=0;

  return(<div className="min-h-screen pt-28 pb-16 bg-slate-50 dark:bg-darkbg">
    <div className="container mx-auto px-4"><div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div><h1 className="text-4xl font-black text-navy dark:text-white uppercase tracking-tight mb-2">Shop</h1><p className="text-slate-500">OBJICC merchandise — available to members.</p></div>
        <button onClick={()=>setCartOpen(true)} className="relative flex items-center gap-2 px-5 py-3 bg-navy text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-ocean transition-colors">
          <ShoppingCart className="w-4 h-4"/>Cart
          {totalItems>0&&<span className="absolute -top-2 -right-2 w-5 h-5 bg-gold text-navy rounded-full text-xs font-black flex items-center justify-center">{totalItems}</span>}
        </button>
      </div>
      {loading?<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">{[...Array(8)].map((_,i)=><div key={i} className="bg-white dark:bg-slate-800 rounded-2xl h-64 animate-pulse"/>)}</div>
      :items.length===0?<div className="text-center py-20 text-slate-400"><ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-30"/><p className="font-bold">Shop coming soon!</p></div>
      :<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">{items.map(item=>{
        const hasVariants=(item.pricingOptions||[]).some(o=>o.isActive);
        const allOutOfStock=hasVariants&&(item.pricingOptions||[]).filter(o=>o.isActive).every(o=>(o.stock??1)<=0);
        return(
        <article key={item.id} onClick={()=>openDetail(item)}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-all group cursor-pointer hover:-translate-y-0.5">
          <div className="aspect-square overflow-hidden bg-slate-100 dark:bg-slate-700 relative">
            {item.image?<img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>:<div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-12 h-12 text-slate-300"/></div>}
            {allOutOfStock&&<div className="absolute inset-0 bg-navy/60 flex items-center justify-center"><span className="px-3 py-1.5 bg-white/90 text-navy rounded-full text-xs font-black uppercase tracking-widest">Out of Stock</span></div>}
          </div>
          <div className="p-4">
            <h3 className="font-black text-navy dark:text-white text-sm leading-tight mb-1">{item.name}</h3>
            {item.description&&<p className="text-slate-400 text-xs mb-3 line-clamp-2">{item.description}</p>}
            <div className="flex items-center justify-between gap-2">
              <span className="font-black text-ocean text-base">{hasVariants?`From ${item.price}`:item.price}</span>
              <button onClick={e=>quickAdd(item,e)} disabled={allOutOfStock}
                className="flex items-center gap-1 px-3 py-1.5 bg-navy text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-ocean transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
                <Plus className="w-3 h-3"/>Add
              </button>
            </div>
          </div>
        </article>
      );})}</div>}
    </div></div>

    {/* Product detail modal */}
    {detailItem&&<div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm" onClick={closeDetail}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col sm:flex-row" onClick={e=>e.stopPropagation()}>
        <div className="sm:w-1/2 aspect-square sm:aspect-auto bg-slate-100 dark:bg-slate-700 shrink-0 relative">
          {detailItem.image?<img src={detailItem.image} alt={detailItem.name} className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-16 h-16 text-slate-300"/></div>}
          <button onClick={closeDetail} className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-slate-800/90 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors sm:hidden"><X className="w-4 h-4 text-navy dark:text-white"/></button>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <div className="hidden sm:flex items-start justify-between px-6 pt-6"><span/>
            <button onClick={closeDetail} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"><X className="w-4 h-4 text-slate-400"/></button>
          </div>
          <div className="px-6 sm:pt-2 pt-5 pb-4 overflow-y-auto flex-1">
            {detailItem.category&&<span className="text-xs font-black text-ocean uppercase tracking-widest">{detailItem.category}</span>}
            <h2 className="text-2xl font-black text-navy dark:text-white mt-1 mb-2 leading-tight">{detailItem.name}</h2>
            {detailItem.description&&<p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-5">{detailItem.description}</p>}

            {activeOpts.length>0&&<div className="mb-5">
              <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Choose an option</p>
              <div className="flex flex-wrap gap-2">
                {activeOpts.map(o=>{
                  const out=(o.stock??1)<=0;
                  const sel=detailVariant?.label===o.label;
                  return(<button key={o.label} disabled={out} onClick={()=>{setDetailVariant(o);setDetailQty(1);}}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${out?'opacity-40 cursor-not-allowed border-slate-100 dark:border-slate-700 text-slate-400':sel?'border-navy dark:border-gold bg-navy/5 dark:bg-gold/10 text-navy dark:text-white':'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-navy/40'}`}>
                    {o.label} — {o.price}{out?' (Out of stock)':''}
                  </button>);
                })}
              </div>
            </div>}

            {detailStock!==undefined&&!detailOutOfStock&&<p className="text-xs text-slate-400 mb-4">{detailStock} in stock</p>}

            <div className="flex items-center gap-4 mb-2">
              <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Quantity</p>
              <div className="flex items-center gap-2">
                <button onClick={()=>setDetailQty(q=>Math.max(1,q-1))} className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"><Minus className="w-3.5 h-3.5 text-navy dark:text-white"/></button>
                <span className="w-8 text-center font-black text-navy dark:text-white">{detailQty}</span>
                <button onClick={()=>setDetailQty(q=>detailMaxed?q:q+1)} disabled={detailMaxed} className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-40"><Plus className="w-3.5 h-3.5 text-navy dark:text-white"/></button>
              </div>
            </div>
          </div>
          <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-700 shrink-0">
            {detailOutOfStock?(
              <div className="flex items-center justify-center gap-2 py-3 text-slate-400 font-bold text-sm"><PackageX className="w-4 h-4"/>Out of stock</div>
            ):(
              <button onClick={()=>{addToCart(detailItem,{variant:detailVariant,qty:detailQty});closeDetail();}}
                className="w-full py-3.5 bg-navy text-white font-black rounded-xl text-sm uppercase tracking-widest hover:bg-ocean transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4"/>Add to Cart — JMD ${(priceNum(detailPrice)*detailQty).toFixed(2)}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>}

    {cartOpen&&<>
      <div className="fixed inset-0 bg-navy/40 z-40" onClick={()=>{setCartOpen(false);setOrderSuccess(false);}}/>
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-slate-900 z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-black text-navy dark:text-white uppercase tracking-tight">{orderSuccess?'Order Placed!':`Cart (${totalItems})`}</h2>
          <button onClick={()=>{setCartOpen(false);setOrderSuccess(false);}}><X className="w-5 h-5 text-slate-400"/></button>
        </div>
        {orderSuccess?<div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"><Check className="w-8 h-8 text-green-600"/></div>
          <h3 className="font-black text-navy dark:text-white text-xl mb-2">Order Submitted!</h3>
          <p className="text-slate-400 text-sm">We will contact you to confirm and arrange payment.</p>
          <button onClick={()=>{setCartOpen(false);setOrderSuccess(false);}} className="mt-6 px-6 py-3 bg-navy text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-ocean transition-colors">Continue Shopping</button>
        </div>:<>
          <div className="flex-1 overflow-y-auto p-5 min-h-0">
            {cart.length===0?<div className="text-center py-16 text-slate-400"><ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30"/><p className="font-bold text-sm">Your cart is empty</p></div>
            :<div className="space-y-4">{cart.map(item=>{
              const key=item.lineKey||lineKey(item.id,item.selectedSize);
              return(
              <div key={key} className="flex items-center gap-3">
                {item.image&&<img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0"/>}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-navy dark:text-white text-sm truncate">{item.name}</p>
                  {item.selectedSize&&<p className="text-xs text-slate-400">{item.selectedSize}</p>}
                  <p className="text-ocean font-black text-sm">{item.price}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={()=>updateQty(key,-1)} className="w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center"><Minus className="w-3 h-3"/></button>
                  <span className="w-6 text-center text-sm font-black text-navy dark:text-white">{item.quantity}</span>
                  <button onClick={()=>updateQty(key,1)} className="w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center"><Plus className="w-3 h-3"/></button>
                  <button onClick={()=>removeLine(key)} className="ml-1 p-1 text-red-300 hover:text-red-500"><Trash2 className="w-3 h-3"/></button>
                </div>
              </div>
            );})}<div className="border-t border-slate-100 dark:border-slate-700 pt-3 flex justify-between font-black text-navy dark:text-white text-sm"><span>Total</span><span>{totalPrice()}</span></div></div>}
          </div>
          {cart.length>0&&<div className="p-5 border-t border-slate-100 dark:border-slate-800 space-y-3 shrink-0">
            <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">How will you pay?</p>
            <div className="space-y-2">
              {([
                {id:'walk-in' as const,icon:Store,title:'Walk-in',desc:'Pay in person at the OBJICC office'},
                {id:'online' as const,icon:CreditCard,title:'Online',desc:'Make your payment online'},
              ]).map(opt=>{
                const Icon=opt.icon;const sel=paymentMethod===opt.id;
                return(
                  <button key={opt.id} onClick={()=>setPaymentMethod(opt.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${sel?'border-navy dark:border-gold bg-navy/5 dark:bg-gold/10':'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'}`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${sel?'bg-navy dark:bg-gold text-white dark:text-navy':'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}><Icon className="w-4 h-4"/></div>
                    <div className="min-w-0 flex-1"><p className={`text-sm font-black ${sel?'text-navy dark:text-white':'text-slate-600 dark:text-slate-300'}`}>{opt.title}</p><p className="text-xs text-slate-400">{opt.desc}</p></div>
                    {sel&&<Check className="w-4 h-4 text-navy dark:text-gold shrink-0"/>}
                  </button>
                );
              })}
            </div>
            <button onClick={submitOrder} disabled={submitting||!paymentMethod} title={!paymentMethod?'Select a payment method first':''}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<Check className="w-4 h-4"/>}Confirm Order
            </button>
          </div>}
        </>}
      </div>
    </>}
  </div>);
}
