import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Shield, Edit2, Save, X, Check, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useUser } from '../../contexts/UserContext';
import { DEFAULT_PERMISSIONS, ROLE_LABELS } from '../../types';
import type { Role, RolePermissions } from '../../types';

// Canonical system roles — single source of truth
const SYSTEM_ROLES: { id: Role; color: string; desc: string }[] = [
  { id: 'super_admin',         color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', desc: 'Full unrestricted access to everything' },
  { id: 'admin',               color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',        desc: 'Full administrative access' },
  { id: 'staff',               color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',        desc: 'Manage users, content and merchandise' },
  { id: 'recruitment_officer', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',       desc: 'Handle applications and enrollment' },
  { id: 'editor',              color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',    desc: 'Create and manage posts and events' },
  { id: 'cadet',               color: 'bg-gold/20 text-amber-700 dark:text-amber-400',                           desc: 'Approved cadet member' },
  { id: 'parent',              color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', desc: 'Approved parent or guardian' },
  { id: 'pending_cadet',       color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',       desc: 'Awaiting cadet approval' },
  { id: 'pending_parent',      color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',       desc: 'Awaiting parent approval' },
];

const PERMISSION_LABELS: { key: keyof RolePermissions; label: string; desc: string }[] = [
  { key: 'viewAdminDashboard',   label: 'Admin Dashboard',       desc: 'Access the admin panel' },
  { key: 'manageUsers',          label: 'Manage Users',          desc: 'View, edit and delete users' },
  { key: 'manageRoles',          label: 'Manage Roles',          desc: 'Edit role permissions' },
  { key: 'managePosts',          label: 'Manage Posts & Events', desc: 'Create, edit and delete posts' },
  { key: 'manageMerchandise',    label: 'Manage Merchandise',    desc: 'Add and edit shop items' },
  { key: 'manageApplications',   label: 'Manage Applications',   desc: 'Review enrollment applications' },
  { key: 'manageRequests',       label: 'Manage Requests',       desc: 'Handle merch and other requests' },
  { key: 'canViewUserUpdates',   label: 'View Activity Log',     desc: 'See site-wide activity' },
  { key: 'printPermissionSlips', label: 'Print Permission Slips',desc: 'Generate printable slips' },
  { key: 'manageSettings',       label: 'Manage Settings',       desc: 'Edit site settings and branding' },
  { key: 'managePaymentGateways',label: 'Payment Gateways',      desc: 'Configure Stripe / PayPal' },
];

export default function RolesPage() {
  const [roleData, setRoleData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<RolePermissions>({ ...DEFAULT_PERMISSIONS.cadet });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const { profile } = useUser();
  const isSuperAdmin = profile?.role === 'super_admin';

  // Seed any missing roles on load
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'roles'), async (snap) => {
      const fetched: Record<string, any> = {};
      snap.docs.forEach((d) => { fetched[d.id] = { id: d.id, ...d.data() }; });

      // Auto-seed missing system roles
      for (const { id } of SYSTEM_ROLES) {
        if (!fetched[id]) {
          await setDoc(doc(db, 'roles', id), {
            name: ROLE_LABELS[id],
            description: SYSTEM_ROLES.find(r => r.id === id)?.desc || '',
            permissions: DEFAULT_PERMISSIONS[id] || DEFAULT_PERMISSIONS.visitor,
            isSystem: true,
            createdAt: serverTimestamp(),
          });
        }
      }
      setRoleData(fetched);
      setLoading(false);
    });
    return unsub;
  }, []);

  const startEdit = (role: any) => {
    setEditingId(role.id);
    setEditPerms({ ...DEFAULT_PERMISSIONS.visitor, ...role.permissions });
    setExpandedId(role.id);
  };

  const cancelEdit = () => { setEditingId(null); };

  const savePerms = async (roleId: string) => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'roles', roleId), {
        ...roleData[roleId],
        permissions: editPerms,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      showToast(`${ROLE_LABELS[roleId as Role]} permissions updated!`, 'success');
      setEditingId(null);
    } catch {
      showToast('Failed to save permissions.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePerm = (key: keyof RolePermissions) => {
    setEditPerms((p) => ({ ...p, [key]: !p[key] }));
  };

  const activePerms = (role: any): RolePermissions =>
    editingId === role.id ? editPerms : { ...DEFAULT_PERMISSIONS.visitor, ...role.permissions };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-navy dark:text-white uppercase tracking-tight">Roles & Permissions</h1>
        <p className="text-slate-500 text-sm mt-1">
          {isSuperAdmin ? 'Click Edit on any role to change its permissions.' : 'View what each role can access.'}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl h-20 animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {SYSTEM_ROLES.map(({ id: roleId, color, desc }) => {
            const role = roleData[roleId] || { id: roleId, permissions: DEFAULT_PERMISSIONS[roleId] || {} };
            const isEditing = editingId === roleId;
            const isExpanded = expandedId === roleId || isEditing;
            const perms = activePerms(role);
            const isLocked = roleId === 'super_admin';
            const enabledCount = PERMISSION_LABELS.filter(p => perms[p.key]).length;

            return (
              <div key={roleId} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
                {/* Header row */}
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="p-2 bg-navy/5 dark:bg-white/5 rounded-xl shrink-0">
                    <Shield className="w-4 h-4 text-navy dark:text-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-navy dark:text-white text-sm">{ROLE_LABELS[roleId]}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-black ${color}`}>{roleId.replace(/_/g, ' ')}</span>
                      {isLocked && <Lock className="w-3 h-3 text-slate-400" title="Cannot edit Super Admin" />}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{desc} · {enabledCount}/{PERMISSION_LABELS.length} permissions</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isEditing ? (
                      <>
                        <button onClick={() => cancelEdit()}
                          className="flex items-center gap-1 px-3 py-1.5 text-slate-500 hover:text-navy rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-600">
                          <X className="w-3 h-3" /> Cancel
                        </button>
                        <button onClick={() => savePerms(roleId)} disabled={saving}
                          className="flex items-center gap-1 px-3 py-1.5 bg-navy text-white rounded-xl text-xs font-black hover:bg-ocean transition-colors disabled:opacity-60">
                          {saving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3 h-3" />}
                          Save
                        </button>
                      </>
                    ) : (
                      <>
                        {isSuperAdmin && !isLocked && (
                          <button onClick={() => startEdit(role)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-navy dark:text-white rounded-xl text-xs font-black hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                        )}
                        <button onClick={() => setExpandedId(isExpanded ? null : roleId)}
                          className="p-1.5 text-slate-400 hover:text-navy dark:hover:text-white transition-colors">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Permissions grid */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-50 dark:border-slate-700 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {PERMISSION_LABELS.map(({ key, label, desc: permDesc }) => {
                        const enabled = perms[key];
                        return (
                          <div
                            key={key}
                            onClick={() => isEditing && !isLocked && togglePerm(key)}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                              isEditing && !isLocked ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700' : ''
                            } ${enabled ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}
                          >
                            <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              enabled ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-600'
                            }`}>
                              {enabled
                                ? <Check className="w-3 h-3 text-white" />
                                : <X className="w-3 h-3 text-slate-400" />}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-xs font-bold ${enabled ? 'text-navy dark:text-white' : 'text-slate-400'}`}>{label}</p>
                              <p className="text-xs text-slate-400">{permDesc}</p>
                            </div>
                            {isEditing && !isLocked && (
                              <div className={`ml-auto w-8 h-4 rounded-full transition-colors relative shrink-0 ${enabled ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-600'}`}>
                                <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${enabled ? 'left-4' : 'left-0.5'}`} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {isEditing && (
                      <p className="text-xs text-slate-400 mt-3 text-center">Click any permission to toggle it on or off</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
