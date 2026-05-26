import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Bell, Check, Trash2, CheckCheck } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import type { AppNotification } from '../types';

export default function NotificationsPage() {
  const { firebaseUser } = useUser();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    const q = query(
      collection(db, 'users', firebaseUser.uid, 'notifications'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification)));
      setLoading(false);
    });
    return unsub;
  }, [firebaseUser]);

  const markRead = async (id: string) => {
    if (!firebaseUser) return;
    await updateDoc(doc(db, 'users', firebaseUser.uid, 'notifications', id), { read: true });
  };

  const markAllRead = async () => {
    if (!firebaseUser) return;
    await Promise.all(
      notifications.filter((n) => !n.read).map((n) =>
        updateDoc(doc(db, 'users', firebaseUser.uid, 'notifications', n.id), { read: true })
      )
    );
  };

  const deleteNotif = async (id: string) => {
    if (!firebaseUser) return;
    await deleteDoc(doc(db, 'users', firebaseUser.uid, 'notifications', id));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen pt-28 pb-16 bg-slate-50 dark:bg-darkbg">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-navy dark:text-white uppercase tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-slate-500 mt-1">{unreadCount} unread</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 px-4 py-2 bg-navy/10 hover:bg-navy/20 text-navy dark:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
            >
              <CheckCheck className="w-3 h-3" /> Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl h-20 animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-bold">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm flex items-start gap-4 transition-all ${
                  !n.read ? 'border-l-4 border-navy' : ''
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${
                  n.type === 'success' ? 'bg-green-50 text-green-600'
                  : n.type === 'warning' ? 'bg-amber-50 text-amber-600'
                  : n.type === 'error' ? 'bg-red-50 text-red-600'
                  : 'bg-navy/5 text-navy dark:text-white'
                }`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-navy dark:text-white text-sm">{n.title}</h3>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-slate-300 dark:text-slate-600 text-xs mt-1">
                    {n.createdAt?.toDate?.().toLocaleString() || ''}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {!n.read && (
                    <button onClick={() => markRead(n.id)} className="p-1.5 hover:bg-navy/10 rounded-lg transition-colors" title="Mark as read">
                      <Check className="w-3 h-3 text-navy dark:text-white" />
                    </button>
                  )}
                  <button onClick={() => deleteNotif(n.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
