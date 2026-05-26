import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc,
         serverTimestamp, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Search, Check, X, Trash2, User, Shield,
         Mail, Phone, School, Calendar, Eye } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useUser } from '../../contexts/UserContext';
import { ROLE_LABELS, SYSTEM_ROLES } from '../../types';
import type { UserProfile, Role } from '../../types';

// Pull ordered role list from the same source as RolesPage
const ROLE_ORDER: Role[] = [
  'super_admin','admin','staff','recruitment_officer',
  'editor','cadet','parent','pending_cadet','pending_parent',
];

const ROLE_COLORS: Record<string, string> = {
  super_admin:         'bg-purple-100 text-purple-700',
  admin:               'bg-blue-100 text-blue-700',
  staff:               'bg-cyan-100 text-cyan-700',
  recruitment_officer: 'bg-teal-100 text-teal-700',
  editor:              'bg-green-100 text-green-700',
  cadet:               'bg-amber-100 text-amber-700',
  parent:              'bg-orange-100 text-orange-700',
  pending_cadet:       'bg-slate-100 text-slate-600',
  pending_parent:      'bg-slate-100 text-slate-600',
};

export default function UsersPage() {
  const [users, setUsers]         = useState<UserProfile[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [selected, setSelected]   = useState<UserProfile | null>(null);
  const { showToast }             = useToast();
  const { profile: myProfile }    = useUser();

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile)));
      setLoading(false);
    });
    return unsub;
  }, []);

  /* ── helpers ── */
  const notify = async (uid: string, title: string, message: string, type = 'info') => {
    await addDoc(collection(db, 'users', uid, 'notifications'), {
      title, message, type, read: false, createdAt: serverTimestamp(),
    });
  };

  const approveRole = async (u: UserProfile) => {
    const newRole: Role = u.requestedRole === 'cadet' ? 'cadet' : 'parent';
    await updateDoc(doc(db, 'users', u.uid), {
      role: newRole, status: 'approved', updatedAt: serverTimestamp(),
    });
    await notify(u.uid, 'Role Approved!',
      `Your role has been updated to ${ROLE_LABELS[newRole]}. Welcome aboard!`, 'success');
    showToast(`${u.displayName} approved as ${ROLE_LABELS[newRole]}`, 'success');
    setSelected(null);
  };

  const rejectRole = async (u: UserProfile) => {
    await updateDoc(doc(db, 'users', u.uid), {
      status: 'rejected', updatedAt: serverTimestamp(),
    });
    await notify(u.uid, 'Role Request Declined',
      'Your role request was not approved. Please contact us for more information.', 'warning');
    showToast(`${u.displayName}'s request rejected`, 'warning');
    setSelected(null);
  };

  const changeRole = async (u: UserProfile, newRole: Role) => {
    if (u.uid === myProfile?.uid && newRole !== 'super_admin') {
      if (!window.confirm('You are changing your own role. You may lose access to this page. Continue?')) return;
    }
    await updateDoc(doc(db, 'users', u.uid), {
      role: newRole, updatedAt: serverTimestamp(),
    });
    await notify(u.uid, 'Role Updated',
      `Your role has been changed to ${ROLE_LABELS[newRole]}.`, 'info');
    showToast(`${u.displayName} → ${ROLE_LABELS[newRole]}`, 'success');
  };

  const deleteUser = async (u: UserProfile) => {
    if (u.uid === myProfile?.uid) { showToast("You can't delete yourself.", 'error'); return; }
    if (!window.confirm(`Permanently delete ${u.displayName}? This cannot be undone.`)) return;
    await deleteDoc(doc(db, 'users', u.uid));
    showToast(`${u.displayName} deleted`, 'info');
    setSelected(null);
  };

  /* ── filtering ── */
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !q || [u.displayName, u.email, u.firstName, u.lastName, u.school, u.cadetSchool]
      .some((v) => v?.toLowerCase().includes(q));
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const pendingUsers = filtered.filter((u) => ['pending_cadet','pending_parent'].includes(u.role));
  const otherUsers   = filtered.filter((u) => !['pending_cadet','pending_parent'].includes(u.role));

  const counts: Record<string, number> = { all: users.length };
  ROLE_ORDER.forEach((r) => { counts[r] = users.filter((u) => u.role === r).length; });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Users</h1>
          <p className="text-slate-500 text-sm mt-1">{users.length} total members</p>
        </div>
      </div>

      {/* Search + role filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, school…"
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-navy dark:text-white outline-none focus:ring-2 focus:ring-navy/20"
          />
        </div>
        <select
          value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)}
          className="px-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-navy dark:text-white outline-none"
        >
          <option value="all">All roles ({users.length})</option>
          {ROLE_ORDER.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]} ({counts[r] || 0})</option>
          ))}
        </select>
      </div>

      {/* Pending approvals banner */}
      {pendingUsers.length > 0 && (
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-amber-600 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block" />
            Pending Approvals ({pendingUsers.length})
          </h2>
          <div className="space-y-2">
            {pendingUsers.map((u) => (
              <div key={u.uid}
                className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="font-black text-navy dark:text-white">{u.displayName}</p>
                  <p className="text-xs text-slate-500">{u.email} · {u.phone}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    Requesting: <strong>{u.requestedRole}</strong>
                    {u.school        && ` · School: ${u.school}`}
                    {u.cadetSchool   && ` · Cadet school: ${u.cadetSchool}`}
                    {u.cadetFirstName && ` · Cadet: ${u.cadetFirstName} ${u.cadetLastName}`}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setSelected(u)}
                    className="p-2 hover:bg-amber-100 rounded-xl transition-colors" title="View details">
                    <Eye className="w-4 h-4 text-amber-700" />
                  </button>
                  <button onClick={() => approveRole(u)}
                    className="flex items-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors">
                    <Check className="w-3 h-3" /> Approve
                  </button>
                  <button onClick={() => rejectRole(u)}
                    className="flex items-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">
                    <X className="w-3 h-3" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main users table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40">
              <th className="text-left px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-400">User</th>
              <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hidden md:table-cell">Role</th>
              <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hidden lg:table-cell">Info</th>
              <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hidden lg:table-cell">Joined</th>
              <th className="text-right px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-5 py-3">
                    <div className="h-8 bg-slate-50 dark:bg-slate-700 rounded-lg animate-pulse" />
                  </td>
                </tr>
              ))
            ) : otherUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-slate-400 text-sm">
                  No users found.
                </td>
              </tr>
            ) : (
              otherUsers.map((u) => (
                <tr key={u.uid}
                  className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  {/* Avatar + name */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {u.avatarUrl
                        ? <img src={u.avatarUrl} className="w-9 h-9 rounded-xl object-cover shrink-0" alt="" />
                        : <div className="w-9 h-9 rounded-xl bg-navy/10 dark:bg-navy/40 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-navy/40 dark:text-white/30" />
                          </div>
                      }
                      <div className="min-w-0">
                        <p className="font-bold text-navy dark:text-white truncate">{u.displayName}</p>
                        <p className="text-xs text-slate-400 truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role selector — matches exactly the Roles page */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value as Role)}
                      disabled={u.uid === myProfile?.uid && u.role === 'super_admin'}
                      className={`px-2 py-1.5 rounded-lg text-xs font-black outline-none border-none cursor-pointer ${ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-600'}`}
                    >
                      {ROLE_ORDER.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </td>

                  {/* Extra info */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="text-xs text-slate-400 space-y-0.5">
                      {u.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{u.phone}</div>}
                      {u.school && <div className="flex items-center gap-1"><School className="w-3 h-3" />{u.school}</div>}
                      {u.cadetSchool && <div className="flex items-center gap-1"><School className="w-3 h-3" />Cadet: {u.cadetSchool}</div>}
                    </div>
                  </td>

                  {/* Joined date */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {u.createdAt?.toDate?.().toLocaleDateString()}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setSelected(u)}
                        className="p-1.5 hover:bg-navy/10 rounded-lg transition-colors" title="View details">
                        <Eye className="w-4 h-4 text-navy/40 dark:text-white/40 hover:text-navy dark:hover:text-white" />
                      </button>
                      <button onClick={() => deleteUser(u)}
                        className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete user">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* User detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              {selected.avatarUrl
                ? <img src={selected.avatarUrl} className="w-10 h-10 rounded-xl object-cover" alt="" />
                : <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-navy/40" />
                  </div>
              }
              <div className="flex-1 min-w-0">
                <p className="font-black text-navy dark:text-white truncate">{selected.displayName}</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-black ${ROLE_COLORS[selected.role] || 'bg-slate-100 text-slate-600'}`}>
                  {ROLE_LABELS[selected.role]}
                </span>
              </div>
              <button onClick={() => setSelected(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Details */}
            <div className="px-6 py-4 space-y-3">
              {[
                { icon: Mail,     label: 'Email',         value: selected.email },
                { icon: Phone,    label: 'Phone',         value: selected.phone },
                { icon: School,   label: 'School',        value: selected.school },
                { icon: School,   label: "Cadet's School",value: selected.cadetSchool },
                { icon: User,     label: 'Cadet Name',    value: selected.cadetFirstName ? `${selected.cadetFirstName} ${selected.cadetLastName}` : null },
                { icon: Calendar, label: 'Joined',        value: selected.createdAt?.toDate?.().toLocaleDateString() },
                { icon: Shield,   label: 'Status',        value: selected.status },
              ].filter((r) => r.value).map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg shrink-0">
                    <Icon className="w-3 h-3 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{label}</p>
                    <p className="text-sm text-navy dark:text-white font-bold">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pending actions */}
            {['pending_cadet','pending_parent'].includes(selected.role) && (
              <div className="px-6 pb-4 flex gap-2">
                <button onClick={() => approveRole(selected)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-colors">
                  <Check className="w-4 h-4" /> Approve
                </button>
                <button onClick={() => rejectRole(selected)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-black rounded-xl text-xs uppercase tracking-widest transition-colors">
                  <X className="w-4 h-4" /> Reject
                </button>
              </div>
            )}

            {/* Change role */}
            <div className="px-6 pb-5 border-t border-slate-100 dark:border-slate-700 pt-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Change Role</p>
              <select
                value={selected.role}
                onChange={(e) => { changeRole(selected, e.target.value as Role); setSelected({ ...selected, role: e.target.value as Role }); }}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-navy dark:text-white font-bold text-sm outline-none"
              >
                {ROLE_ORDER.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>

            {/* Delete */}
            <div className="px-6 pb-5">
              <button onClick={() => deleteUser(selected)}
                className="w-full py-2.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold rounded-xl text-xs uppercase tracking-widest transition-colors">
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
