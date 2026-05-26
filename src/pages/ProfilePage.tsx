import { useState, useRef } from 'react';
import { User, Edit2, Save, X, Camera, School, Phone, Shield, Clock, ShoppingBag } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import { ROLE_LABELS } from '../types';
import RequestHistory from '../components/features/profile/RequestHistory';

export default function ProfilePage() {
  const { profile, refreshProfile, schools } = useUser();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'orders'>('info');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    phone: profile?.phone || '',
    school: profile?.school || '',
    cadetSchool: profile?.cadetSchool || '',
  });

  if (!profile) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: any = { phone: form.phone, updatedAt: serverTimestamp() };
      if (profile.role === 'cadet' || profile.requestedRole === 'cadet') updates.school = form.school;
      if (profile.role === 'parent' || profile.requestedRole === 'parent') updates.cadetSchool = form.cadetSchool;
      await updateDoc(doc(db, 'users', profile.uid), updates);
      await refreshProfile();
      showToast('Profile updated!', 'success');
      setEditing(false);
    } catch {
      showToast('Failed to save changes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { showToast('Image must be under 3MB', 'error'); return; }
    setUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${profile.uid}`);
      await uploadBytesResumable(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', profile.uid), { avatarUrl: url });
      await refreshProfile();
      showToast('Avatar updated!', 'success');
    } catch {
      showToast('Upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const roleLabel = ROLE_LABELS[profile.role] || profile.role;
  const isPending = ['pending_cadet', 'pending_parent'].includes(profile.role);

  return (
    <div className="min-h-screen pt-28 pb-16 bg-slate-50 dark:bg-darkbg">
      <div className="container mx-auto px-4 max-w-3xl">

        {/* Profile card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm overflow-hidden mb-6">
          {/* Banner */}
          <div className="h-28 bg-gradient-to-r from-navy via-ocean to-navy/70" />

          <div className="px-8 pb-8 -mt-14">
            {/* Avatar */}
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 rounded-2xl border-4 border-white dark:border-slate-800 overflow-hidden bg-navy flex items-center justify-center">
                {profile.avatarUrl
                  ? <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  : <User className="w-10 h-10 text-white/50" />}
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 p-1.5 bg-gold rounded-lg text-navy hover:bg-white transition-colors"
                title="Change photo"
              >
                <Camera className="w-3 h-3" />
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>

            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-black text-navy dark:text-white">{profile.displayName}</h1>
                <p className="text-slate-500 text-sm">{profile.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${
                    isPending ? 'bg-amber-100 text-amber-700' : 'bg-navy/10 text-navy dark:bg-navy/30 dark:text-gold'
                  }`}>
                    <Shield className="w-3 h-3" />
                    {roleLabel}
                  </span>
                  {isPending && (
                    <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold">
                      Awaiting Approval
                    </span>
                  )}
                </div>
              </div>

              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-navy dark:text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="flex items-center gap-1 px-3 py-2 text-slate-500 hover:text-navy rounded-xl text-xs font-bold"
                  >
                    <X className="w-3 h-3" /> Cancel
                  </button>
                  <button
                    onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-ocean transition-colors disabled:opacity-60"
                  >
                    {saving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3 h-3" />}
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl mb-6 shadow-sm">
          {[
            { id: 'info', label: 'My Info', icon: User },
            { id: 'orders', label: 'Order History', icon: ShoppingBag },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === id ? 'bg-navy text-white shadow' : 'text-slate-500 hover:text-navy dark:hover:text-white'
              }`}
            >
              <Icon className="w-3 h-3" /> {label}
            </button>
          ))}
        </div>

        {activeTab === 'info' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 space-y-5">
            <h2 className="font-black text-navy dark:text-white uppercase tracking-widest text-sm">Profile Details</h2>

            {/* Read-only fields */}
            {[
              { label: 'First Name', value: profile.firstName },
              { label: 'Last Name', value: profile.lastName },
              { label: 'Email', value: profile.email },
              ...(profile.cadetName ? [{ label: 'Cadet Name', value: profile.cadetName }] : []),
            ].map(({ label, value }) => (
              <div key={label}>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{label}</label>
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm">
                  {value || '—'}
                </div>
              </div>
            ))}

            {/* Editable phone */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Phone Number</label>
              {editing ? (
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel" value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold outline-none focus:ring-2 focus:ring-navy/20 text-sm"
                  />
                </div>
              ) : (
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm">
                  {profile.phone || '—'}
                </div>
              )}
            </div>

            {/* School (cadet) */}
            {(profile.role === 'cadet' || profile.requestedRole === 'cadet') && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">School</label>
                {editing ? (
                  <div className="relative">
                    <School className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={form.school}
                      onChange={(e) => setForm((p) => ({ ...p, school: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold appearance-none outline-none focus:ring-2 focus:ring-navy/20 text-sm"
                    >
                      {schools.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm">
                    {profile.school || '—'}
                  </div>
                )}
              </div>
            )}

            {/* Cadet info (parent) */}
            {(profile.role === 'parent' || profile.requestedRole === 'parent') && (
              <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-black text-navy dark:text-white uppercase tracking-widest">Cadet's Information</h3>
                {[
                  { label: "Cadet's First Name", value: profile.cadetFirstName },
                  { label: "Cadet's Last Name", value: profile.cadetLastName },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{label}</label>
                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm">{value || '—'}</div>
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Cadet's School</label>
                  {editing ? (
                    <select
                      value={form.cadetSchool}
                      onChange={(e) => setForm((p) => ({ ...p, cadetSchool: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold appearance-none outline-none text-sm"
                    >
                      {schools.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm">{profile.cadetSchool || '—'}</div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              Member since {profile.createdAt?.toDate?.().toLocaleDateString() || 'recently'}
            </div>
          </div>
        )}

        {activeTab === 'orders' && <RequestHistory />}
      </div>
    </div>
  );
}
