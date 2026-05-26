import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase';
import { MessageSquare, Check, Trash2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import type { Suggestion } from '../../types';

export default function AdminSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const q = query(collection(db, 'suggestions'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setSuggestions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Suggestion)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const markActioned = async (id: string) => {
    await updateDoc(doc(db, 'suggestions', id), { status: 'actioned' });
    showToast('Marked as actioned', 'success');
  };
  const deleteSuggestion = async (id: string) => {
    await deleteDoc(doc(db, 'suggestions', id));
    showToast('Deleted', 'info');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Suggestions</h1>
      {loading ? <div className="h-40 bg-white dark:bg-slate-800 rounded-2xl animate-pulse" /> :
        suggestions.length === 0 ? (
          <div className="text-center py-16 text-slate-400"><MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No suggestions yet.</p></div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((s) => (
              <div key={s.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{s.content}</p>
                  <div className="flex gap-2 mt-2">
                    {s.category && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-full text-xs font-bold">{s.category}</span>}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.status === 'actioned' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{s.status}</span>
                    {s.anonymous && <span className="text-xs text-slate-400">Anonymous</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {s.status !== 'actioned' && <button onClick={() => markActioned(s.id)} className="p-1.5 hover:bg-green-50 text-green-500 rounded-lg transition-colors"><Check className="w-4 h-4" /></button>}
                  <button onClick={() => deleteSuggestion(s.id)} className="p-1.5 hover:bg-red-50 text-red-400 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}
