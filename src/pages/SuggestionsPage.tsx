import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { MessageSquare, Send, Eye, EyeOff } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';

const CATEGORIES = ['General', 'Training', 'Events', 'Facilities', 'Equipment', 'Communication', 'Other'];

export default function SuggestionsPage() {
  const { profile } = useUser();
  const { showToast } = useToast();
  const [form, setForm] = useState({ content: '', category: 'General', anonymous: false });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.content.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'suggestions'), {
        content: form.content,
        category: form.category,
        anonymous: form.anonymous,
        submittedBy: form.anonymous ? null : profile?.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
      showToast('Suggestion submitted! Thank you.', 'success');
    } catch {
      showToast('Failed to submit. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-16 bg-slate-50 dark:bg-darkbg">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-10">
          <h1 className="text-4xl font-black text-navy dark:text-white uppercase tracking-tight mb-2">Suggestion Box</h1>
          <p className="text-slate-500">Have an idea to improve OBJICC? We're listening. All suggestions are reviewed by leadership.</p>
        </div>

        {submitted ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-10 text-center shadow-sm">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="font-black text-navy dark:text-white text-2xl mb-2">Submitted!</h2>
            <p className="text-slate-500 text-sm mb-6">Your suggestion has been received. Thank you for helping us improve.</p>
            <button
              onClick={() => { setSubmitted(false); setForm({ content: '', category: 'General', anonymous: false }); }}
              className="px-6 py-3 bg-navy text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-ocean transition-colors"
            >
              Submit Another
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, category: cat }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        form.category === cat ? 'bg-navy text-white' : 'bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-navy dark:hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Your Suggestion</label>
                <textarea
                  required
                  rows={6}
                  value={form.content}
                  onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                  placeholder="Share your idea, concern, or feedback…"
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-700 rounded-2xl text-navy dark:text-white text-sm font-medium outline-none focus:ring-2 focus:ring-navy/20 resize-none leading-relaxed placeholder:text-slate-300"
                />
                <p className="text-xs text-slate-400 mt-1 text-right">{form.content.length} chars</p>
              </div>

              <div
                onClick={() => setForm((p) => ({ ...p, anonymous: !p.anonymous }))}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  form.anonymous ? 'border-navy bg-navy/5' : 'border-slate-100 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${form.anonymous ? 'bg-navy/10 text-navy dark:text-gold' : 'bg-slate-100 text-slate-400'}`}>
                  {form.anonymous ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </div>
                <div>
                  <p className={`font-black text-sm ${form.anonymous ? 'text-navy dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                    Submit Anonymously
                  </p>
                  <p className="text-xs text-slate-400">
                    {form.anonymous ? 'Your identity will be hidden from admins.' : 'Admins will see your name.'}
                  </p>
                </div>
                <div className={`ml-auto w-10 h-5 rounded-full transition-colors relative ${form.anonymous ? 'bg-navy' : 'bg-slate-200'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.anonymous ? 'left-5' : 'left-0.5'}`} />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !form.content.trim()}
                className="w-full flex items-center justify-center gap-2 py-4 bg-navy text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-ocean transition-colors disabled:opacity-60"
              >
                {submitting
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Send className="w-4 h-4" />
                }
                {submitting ? 'Submitting…' : 'Submit Suggestion'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
