import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Calendar, Clock, Tag, Image as ImageIcon } from 'lucide-react';
import type { Post } from '../types';
import { useUser } from '../contexts/UserContext';

function EventCard({ post }: { post: Post }) {
  return (
    <article className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {post.image && (
        <div className="aspect-video overflow-hidden bg-slate-100">
          <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
        </div>
      )}
      {!post.image && (
        <div className="aspect-video bg-gradient-to-br from-navy to-ocean flex items-center justify-center">
          <Calendar className="w-12 h-12 text-white/20" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-widest ${
            post.type === 'event' ? 'bg-gold/20 text-amber-700' : 'bg-ocean/10 text-ocean'
          }`}>
            {post.type}
          </span>
          {post.category && (
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full text-xs font-bold">
              {post.category}
            </span>
          )}
        </div>
        <h3 className="font-black text-navy dark:text-white text-lg leading-tight mb-2">{post.title}</h3>
        <div className="flex items-center gap-1 text-xs text-slate-400 mb-3">
          <Clock className="w-3 h-3" />
          {post.date}
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed line-clamp-3">{post.description}</p>
      </div>
    </article>
  );
}

export default function EventsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'notice' | 'event'>('all');
  const { profile } = useUser();

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post));
      // Filter by role visibility
      const visible = all.filter((p) => {
        if (!p.allowedRoles || p.allowedRoles.length === 0) return true;
        if (!profile) return false;
        return p.allowedRoles.includes(profile.role);
      });
      setPosts(visible);
      setLoading(false);
    });
    return unsub;
  }, [profile]);

  const filtered = filter === 'all' ? posts : posts.filter((p) => p.type === filter);

  return (
    <div className="min-h-screen pt-28 pb-16 bg-slate-50 dark:bg-darkbg">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10">
            <h1 className="text-4xl font-black text-navy dark:text-white uppercase tracking-tight mb-2">
              Events & Notices
            </h1>
            <p className="text-slate-500">Stay up to date with OBJICC announcements, training events, and activities.</p>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-8">
            {(['all', 'event', 'notice'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  filter === f ? 'bg-navy text-white' : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-navy dark:hover:text-white'
                }`}
              >
                {f === 'all' ? 'All' : f === 'event' ? 'Events' : 'Notices'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl h-64 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-bold">No {filter === 'all' ? 'posts' : filter + 's'} yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((p) => <EventCard key={p.id} post={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
