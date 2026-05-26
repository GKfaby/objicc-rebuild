import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Post } from '../../types';

export default function NoticeBoard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(6));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post)));
      setLoading(false);
    });
    return unsub;
  }, []);

  if (!loading && posts.length === 0) return null;

  return (
    <section className="py-20 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-ocean mb-2">Latest Updates</div>
            <h2 className="text-4xl font-black text-navy dark:text-white uppercase tracking-tight">
              Notices & Events
            </h2>
          </div>
          <Link
            to="/events"
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-ocean hover:text-navy dark:hover:text-gold transition-colors"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-2xl h-52 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <article
                key={post.id}
                className="group bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden hover:shadow-lg transition-all"
              >
                {post.image && (
                  <div className="aspect-video overflow-hidden">
                    <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                {!post.image && (
                  <div className="aspect-video bg-gradient-to-br from-navy to-ocean flex items-center justify-center">
                    <Calendar className="w-10 h-10 text-white/20" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase tracking-widest ${
                      post.type === 'event' ? 'bg-gold/20 text-amber-700 dark:text-amber-400' : 'bg-ocean/10 text-ocean'
                    }`}>
                      {post.type}
                    </span>
                  </div>
                  <h3 className="font-black text-navy dark:text-white text-base leading-tight mb-1 line-clamp-2">{post.title}</h3>
                  <p className="text-xs text-slate-400 mb-2">{post.date}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 leading-relaxed">{post.description}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
