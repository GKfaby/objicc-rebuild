import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';
import { ShoppingBag, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useUser } from '../../../contexts/UserContext';
import type { MerchRequest } from '../../../types';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700',
  canceled: 'bg-red-50 text-red-700',
};

export default function RequestHistory() {
  const { firebaseUser } = useUser();
  const [requests, setRequests] = useState<MerchRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    const q = query(
      collection(db, 'merch_requests'),
      where('userUid', '==', firebaseUser.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MerchRequest)));
      setLoading(false);
    });
    return unsub;
  }, [firebaseUser]);

  if (loading) return <div className="h-40 bg-white dark:bg-slate-800 rounded-2xl animate-pulse" />;

  if (requests.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center text-slate-400">
        <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-bold text-sm">No orders yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((req) => (
        <div key={req.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Order #{req.requestId || req.id.slice(0, 6).toUpperCase()}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {req.createdAt?.toDate?.().toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-black uppercase ${STATUS_STYLES[req.status] || STATUS_STYLES.pending}`}>
                {req.status}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-black uppercase ${STATUS_STYLES[req.paymentStatus] || STATUS_STYLES.pending}`}>
                {req.paymentStatus}
              </span>
            </div>
          </div>
          <div className="space-y-1 mb-3">
            {req.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  {item.name} {item.selectedSize ? `(${item.selectedSize})` : ''} × {item.quantity}
                </span>
                <span className="font-bold text-navy dark:text-white">{item.price}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-700">
            <span className="text-xs text-slate-400 capitalize">{req.paymentMethod}</span>
            <span className="font-black text-navy dark:text-white text-sm">Total: {req.totalPrice}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
