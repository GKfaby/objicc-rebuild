import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { FileText, Check, Eye, X, Clock } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import type { Application } from '../../types';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  reviewed: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  accepted: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'accepted' | 'rejected'>('pending');
  const [selected, setSelected] = useState<Application | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const q = query(collection(db, 'applications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setApplications(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Application)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const updateStatus = async (app: Application, status: Application['status']) => {
    await updateDoc(doc(db, 'applications', app.id), { status, reviewedBy: 'admin', updatedAt: serverTimestamp() });
    showToast(`Application ${status}`, status === 'accepted' ? 'success' : 'info');
    setSelected(null);
  };

  const filtered = filter === 'all' ? applications : applications.filter((a) => a.status === filter);
  const counts = { all: applications.length, pending: 0, reviewed: 0, accepted: 0, rejected: 0 };
  applications.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1; });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Applications</h1>
        <p className="text-slate-500 text-sm mt-1">Enrollment applications from the public form.</p>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'reviewed', 'accepted', 'rejected'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
              filter === s ? 'bg-navy text-white' : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-navy dark:hover:text-white'
            }`}
          >
            {s} <span className="opacity-60">({counts[s] ?? 0})</span>
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-slate-50 dark:bg-slate-700 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-bold text-sm">No {filter} applications.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                {['Cadet', 'School', 'Parent', 'Submitted', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-400 first:pl-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => (
                <tr key={app.id} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-6 py-3 font-bold text-navy dark:text-white">{app.cadetName}</td>
                  <td className="px-4 py-3 text-slate-500">{app.school}</td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{app.parentName}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 hidden lg:table-cell">
                    {app.createdAt?.toDate?.().toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-black uppercase ${STATUS_STYLES[app.status]}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelected(app)}
                      className="p-1.5 hover:bg-navy/10 rounded-lg transition-colors text-navy dark:text-white"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-start mb-5">
              <h2 className="font-black text-navy dark:text-white text-lg">{selected.cadetName}</h2>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm mb-6">
              {[
                ['School', selected.school],
                ['Grade', selected.grade],
                ['Parent/Guardian', selected.parentName],
                ['Parent Phone', selected.parentPhone],
                ...(selected.cadetPhone ? [['Cadet Phone', selected.cadetPhone]] : []),
                ['Submitted', selected.createdAt?.toDate?.().toLocaleString()],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-400 font-bold">{label}</span>
                  <span className="text-navy dark:text-white font-bold text-right">{val}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => updateStatus(selected, 'accepted')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-colors"
              >
                <Check className="w-4 h-4" /> Accept
              </button>
              <button
                onClick={() => updateStatus(selected, 'reviewed')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 font-black rounded-xl text-xs uppercase tracking-widest transition-colors"
              >
                <Clock className="w-4 h-4" /> Mark Reviewed
              </button>
              <button
                onClick={() => updateStatus(selected, 'rejected')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-black rounded-xl text-xs uppercase tracking-widest transition-colors"
              >
                <X className="w-4 h-4" /> Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
