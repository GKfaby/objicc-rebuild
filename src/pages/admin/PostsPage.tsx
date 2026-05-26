import { useState, useEffect, useRef } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, orderBy, query
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import {
  Plus, Edit2, Trash2, X, Image, Save, Calendar, Bell,
  FileText, Eye, EyeOff, Tag, Users, Printer, ChevronDown, ChevronUp
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { ROLE_LABELS, MEMBER_ROLES } from '../../types';
import type { Post, Role } from '../../types';

const CATEGORIES = ['Announcements', 'Training', 'Events'] as const;

const MEMBER_ROLE_OPTIONS: Role[] = ['cadet', 'parent', 'staff', 'admin', 'super_admin'];

const EMPTY: Partial<Post> = {
  title: '', type: 'notice', category: 'Announcements',
  date: '', description: '', image: '',
  hasPermissionSlip: false, permissionSlipUrl: '',
  isPrintable: false, allowedRoles: [],
};

function PostCard({ post, onEdit, onDelete }: {
  post: Post;
  onEdit: (p: Post) => void;
  onDelete: (p: Post) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4">
        {/* Thumbnail */}
        {post.image
          ? <img src={post.image} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
          : <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
              post.type === 'event' ? 'bg-gold/20' : 'bg-ocean/10'}`}>
              {post.type === 'event' ? <Calendar className="w-6 h-6 text-amber-600" /> : <Bell className="w-6 h-6 text-ocean" />}
            </div>
        }

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase tracking-widest ${
              post.type === 'event' ? 'bg-gold/20 text-amber-700' : 'bg-ocean/10 text-ocean'}`}>
              {post.type}
            </span>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-full text-xs font-bold">
              {post.category}
            </span>
            {post.isPrintable && <Printer className="w-3 h-3 text-slate-400" title="Printable" />}
            {post.hasPermissionSlip && <FileText className="w-3 h-3 text-slate-400" title="Has permission slip" />}
            {post.allowedRoles && post.allowedRoles.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Users className="w-3 h-3" /> Restricted
              </span>
            )}
          </div>
          <p className="font-black text-navy dark:text-white text-sm truncate">{post.title}</p>
          <p className="text-xs text-slate-400">{post.date}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setExpanded(!expanded)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          <button onClick={() => onEdit(post)}
            className="p-1.5 hover:bg-navy/10 rounded-lg transition-colors">
            <Edit2 className="w-4 h-4 text-navy dark:text-white" />
          </button>
          <button onClick={() => onDelete(post)}
            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      {/* Expanded preview */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-slate-50 dark:border-slate-700 pt-3">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{post.description}</p>
          {post.allowedRoles && post.allowedRoles.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              <span className="text-xs text-slate-400 font-bold">Visible to:</span>
              {post.allowedRoles.map((r) => (
                <span key={r} className="px-2 py-0.5 bg-navy/10 text-navy dark:text-white rounded-full text-xs font-bold">
                  {ROLE_LABELS[r]}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PostsPage() {
  const [posts, setPosts]       = useState<Post[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<Post | null>(null);
  const [form, setForm]         = useState<Partial<Post>>(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'notice' | 'event'>('all');
  const imageRef = useRef<HTMLInputElement>(null);
  const slipRef  = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setModalOpen(true);
  };

  const openEdit = (post: Post) => {
    setEditing(post);
    setForm({ ...EMPTY, ...post });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditing(null); setForm(EMPTY); };

  const set = (k: keyof Post, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const uploadFile = async (
    file: File, path: string,
    onProgress: (pct: number) => void
  ): Promise<string> => {
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file);
    return new Promise((resolve, reject) => {
      task.on('state_changed',
        (snap) => onProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
        reject,
        async () => resolve(await getDownloadURL(storageRef))
      );
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { showToast('Image must be under 8MB', 'error'); return; }
    setUploading(true);
    try {
      const url = await uploadFile(file, `posts/${Date.now()}-${file.name}`, setUploadPct);
      set('image', url);
      showToast('Image uploaded!', 'success');
    } catch { showToast('Upload failed', 'error'); }
    finally { setUploading(false); setUploadPct(0); }
  };

  const handleSlipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, `slips/${Date.now()}-${file.name}`, () => {});
      set('permissionSlipUrl', url);
      showToast('Permission slip uploaded!', 'success');
    } catch { showToast('Upload failed', 'error'); }
    finally { setUploading(false); }
  };

  const toggleRole = (role: Role) => {
    const current = form.allowedRoles || [];
    set('allowedRoles', current.includes(role)
      ? current.filter((r) => r !== role)
      : [...current, role]);
  };

  const validate = () => {
    if (!form.title?.trim())       throw new Error('Title is required.');
    if (!form.date?.trim())        throw new Error('Date is required.');
    if (!form.description?.trim()) throw new Error('Description is required.');
  };

  const handleSave = async () => {
    try { validate(); } catch (e: any) { showToast(e.message, 'error'); return; }
    setSaving(true);
    try {
      const data = {
        ...form,
        allowedRoles: form.allowedRoles?.length ? form.allowedRoles : [],
        updatedAt: serverTimestamp(),
      };
      if (editing) {
        await updateDoc(doc(db, 'posts', editing.id), data);
        showToast('Post updated!', 'success');
      } else {
        await addDoc(collection(db, 'posts'), { ...data, createdAt: serverTimestamp(), likes: 0 });
        showToast('Post created!', 'success');
      }
      closeModal();
    } catch { showToast('Failed to save. Please try again.', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (post: Post) => {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    await deleteDoc(doc(db, 'posts', post.id));
    showToast('Post deleted', 'info');
  };

  const filtered = filterType === 'all' ? posts : posts.filter((p) => p.type === filterType);
  const counts = { all: posts.length, notice: posts.filter(p => p.type === 'notice').length, event: posts.filter(p => p.type === 'event').length };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Posts & Events</h1>
          <p className="text-slate-500 text-sm mt-1">{posts.length} total posts</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-navy text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-ocean transition-colors">
          <Plus className="w-4 h-4" /> New Post
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'event', 'notice'] as const).map((t) => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              filterType === t ? 'bg-navy text-white' : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-navy dark:hover:text-white'}`}>
            {t === 'all' ? 'All' : t === 'event' ? 'Events' : 'Notices'} ({counts[t]})
          </button>
        ))}
      </div>

      {/* Post list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl h-20 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl py-16 text-center text-slate-400">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-bold text-sm">No posts yet. Create the first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => (
            <PostCard key={post.id} post={post} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* ── CREATE / EDIT MODAL ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <h2 className="font-black text-navy dark:text-white text-lg">
                {editing ? 'Edit Post' : 'New Post'}
              </h2>
              <button onClick={closeModal} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* ── Section 1: Type ── */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Post Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: 'notice', label: '📋 Notice', desc: 'Announcement or update' },
                    { value: 'event',  label: '📅 Event',  desc: 'Training or activity' },
                  ] as const).map(({ value, label, desc }) => (
                    <button key={value} type="button" onClick={() => set('type', value)}
                      className={`py-3 px-4 rounded-xl text-left border-2 transition-all ${
                        form.type === value
                          ? 'border-navy bg-navy/5 dark:border-gold dark:bg-gold/5'
                          : 'border-slate-100 dark:border-slate-700 hover:border-slate-300'}`}>
                      <p className={`font-black text-sm ${form.type === value ? 'text-navy dark:text-white' : 'text-slate-400'}`}>{label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Section 2: Basic details ── */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Category</label>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map((cat) => (
                    <button key={cat} type="button" onClick={() => set('category', cat)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        form.category === cat ? 'bg-navy text-white' : 'bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-navy dark:hover:text-white'}`}>
                      <Tag className="w-3 h-3" />{cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Title *</label>
                <input
                  value={form.title || ''} onChange={(e) => set('title', e.target.value)}
                  placeholder={form.type === 'event' ? 'e.g. Annual Drill Competition 2025' : 'e.g. Important Uniform Update'}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Date *</label>
                <input
                  value={form.date || ''} onChange={(e) => set('date', e.target.value)}
                  placeholder="e.g. Saturday, January 18, 2025 · 9:00 AM"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Description *</label>
                <textarea
                  rows={4} value={form.description || ''} onChange={(e) => set('description', e.target.value)}
                  placeholder="Full description of the post or event…"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm resize-none leading-relaxed"
                />
              </div>

              {/* ── Section 3: Image ── */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Cover Image</label>
                <div className="flex gap-2">
                  <input
                    value={form.image || ''} onChange={(e) => set('image', e.target.value)}
                    placeholder="Paste image URL…"
                    className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none text-sm"
                  />
                  <input ref={imageRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <button type="button" onClick={() => imageRef.current?.click()} disabled={uploading}
                    className="flex items-center gap-1 px-4 py-2.5 border-2 border-dashed border-slate-300 hover:border-navy dark:hover:border-gold rounded-xl text-xs font-black text-slate-500 hover:text-navy dark:hover:text-white transition-all disabled:opacity-50">
                    <Image className="w-4 h-4" />{uploading ? `${uploadPct}%` : 'Upload'}
                  </button>
                </div>
                {form.image && (
                  <div className="mt-2 relative">
                    <img src={form.image} alt="Preview" className="w-full h-36 object-cover rounded-xl" />
                    <button onClick={() => set('image', '')}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-lg">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* ── Section 4: Options / Toggles ── */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Options</label>
                <div className="space-y-2">
                  {[
                    { key: 'isPrintable',       label: '🖨️ Printable',         desc: 'Members can print this post as a PDF' },
                    { key: 'hasPermissionSlip', label: '📄 Permission Slip',    desc: 'Attach a permission slip for parents to sign' },
                  ].map(({ key, label, desc }) => (
                    <div key={key}
                      onClick={() => set(key as keyof Post, !(form as any)[key])}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        (form as any)[key]
                          ? 'border-navy bg-navy/5 dark:border-gold dark:bg-gold/5'
                          : 'border-slate-100 dark:border-slate-700 hover:border-slate-300'}`}>
                      <div>
                        <p className={`text-sm font-black ${(form as any)[key] ? 'text-navy dark:text-white' : 'text-slate-500'}`}>{label}</p>
                        <p className="text-xs text-slate-400">{desc}</p>
                      </div>
                      <div className={`ml-auto w-10 h-5 rounded-full transition-colors relative shrink-0 ${(form as any)[key] ? 'bg-navy dark:bg-gold' : 'bg-slate-200 dark:bg-slate-600'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(form as any)[key] ? 'left-5' : 'left-0.5'}`} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Permission slip upload */}
                {form.hasPermissionSlip && (
                  <div className="mt-3 pl-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Permission Slip File (PDF)</label>
                    <div className="flex gap-2">
                      <input
                        value={form.permissionSlipUrl || ''} onChange={(e) => set('permissionSlipUrl', e.target.value)}
                        placeholder="Paste PDF URL or upload…"
                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-700 rounded-xl text-sm text-navy dark:text-white font-bold outline-none"
                      />
                      <input ref={slipRef} type="file" accept=".pdf" onChange={handleSlipUpload} className="hidden" />
                      <button type="button" onClick={() => slipRef.current?.click()}
                        className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-500 hover:border-navy transition-colors">
                        Upload PDF
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Section 5: Visibility ── */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Visibility</label>
                <p className="text-xs text-slate-400 mb-3">Leave all unchecked to show to everyone. Check specific roles to restrict visibility.</p>
                <div className="grid grid-cols-2 gap-2">
                  {MEMBER_ROLE_OPTIONS.map((role) => {
                    const selected = (form.allowedRoles || []).includes(role);
                    return (
                      <div key={role} onClick={() => toggleRole(role)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                          selected ? 'border-navy bg-navy/5 dark:border-gold' : 'border-slate-100 dark:border-slate-700 hover:border-slate-300'}`}>
                        <div className={`w-4 h-4 rounded-lg border-2 flex items-center justify-center transition-colors ${
                          selected ? 'bg-navy border-navy dark:bg-gold dark:border-gold' : 'border-slate-300 dark:border-slate-500'}`}>
                          {selected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className={`text-xs font-bold ${selected ? 'text-navy dark:text-white' : 'text-slate-400'}`}>
                          {ROLE_LABELS[role]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
              <button onClick={handleSave} disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-navy text-white font-black rounded-xl text-sm uppercase tracking-widest hover:bg-ocean transition-colors disabled:opacity-60">
                {saving
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Save className="w-4 h-4" />}
                {saving ? 'Saving…' : editing ? 'Update Post' : 'Publish Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
