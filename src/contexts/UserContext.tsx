import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import {
  Role, UserProfile, RolePermissions, SystemSettings,
  DEFAULT_PERMISSIONS, DEFAULT_SYSTEM_SETTINGS, CartItem, APPROVED_USER_ROLES
} from '../types';
import { JAMAICAN_SCHOOLS } from '../constants';

interface UserContextType {
  // Auth
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  permissions: RolePermissions;
  loading: boolean;
  // Helpers
  isStaff: boolean;
  isMember: boolean;
  isPending: boolean;
  canAccess: (requiredRole: Role | Role[]) => boolean;
  refreshProfile: () => Promise<void>;
  // App data
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  schools: string[];
  // System
  systemSettings: SystemSettings;
  needsProfileCompletion: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const EMPTY_PERMISSIONS: RolePermissions = {
  manageRoles: false, manageUsers: false, canViewUserUpdates: false,
  managePosts: false, manageMerchandise: false, manageRequests: false,
  manageApplications: false, printPermissionSlips: false, viewAdminDashboard: false,
  manageSettings: false, managePaymentGateways: false,
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState<RolePermissions>(EMPTY_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [schools, setSchools] = useState<string[]>(JAMAICAN_SCHOOLS);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);

  // Load system settings (realtime)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        // Strip out any empty/null/undefined values so they never overwrite
        // working defaults (e.g. logoUrl: '' must not replace '/logo.png')
        const clean = Object.fromEntries(
          Object.entries(data).filter(([, v]) =>
            v !== null && v !== undefined && v !== ''
          )
        );
        setSystemSettings((prev) => ({ ...prev, ...clean }));
      }
    });
    return unsub;
  }, []);

  // Load schools list
  useEffect(() => {
    const loadSchools = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'schools'));
        if (snap.exists() && snap.data().list?.length) {
          setSchools(snap.data().list);
        } else {
          await setDoc(doc(db, 'settings', 'schools'), { list: JAMAICAN_SCHOOLS }, { merge: true });
        }
      } catch (e) {
        console.warn('Could not load schools list', e);
      }
    };
    loadSchools();
  }, []);

  const resolvePermissions = async (role: Role): Promise<RolePermissions> => {
    try {
      const roleSnap = await getDoc(doc(db, 'roles', role));
      if (roleSnap.exists()) return roleSnap.data().permissions as RolePermissions;
    } catch (_) {}
    return DEFAULT_PERMISSIONS[role] ?? EMPTY_PERMISSIONS;
  };

  const fetchProfile = useCallback(async (fbUser: FirebaseUser) => {
    const userSnap = await getDoc(doc(db, 'users', fbUser.uid));
    if (userSnap.exists()) {
      const data = { uid: fbUser.uid, ...userSnap.data() } as UserProfile;
      setProfile(data);
      setPermissions(await resolvePermissions(data.role));
      setNeedsProfileCompletion(false);
    } else {
      setProfile(null);
      setPermissions(EMPTY_PERMISSIONS);
      setNeedsProfileCompletion(true);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await fetchProfile(fbUser);
      } else {
        setProfile(null);
        setPermissions(EMPTY_PERMISSIONS);
        setNeedsProfileCompletion(false);
      }
      setLoading(false);
    });
    return unsub;
  }, [fetchProfile]);

  // Derived booleans
  const isStaff = profile ? ['super_admin', 'admin', 'staff', 'recruitment_officer', 'editor'].includes(profile.role) : false;
  const isMember = profile ? ['cadet', 'parent', ...(['super_admin', 'admin', 'staff', 'recruitment_officer', 'editor'] as Role[])].includes(profile.role) : false;
  const isPending = profile ? ['pending_cadet', 'pending_parent'].includes(profile.role) : false;

  const canAccess = useCallback((requiredRole: Role | Role[]): boolean => {
    if (!profile) return false;
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return roles.includes(profile.role);
  }, [profile]);

  const refreshProfile = useCallback(async () => {
    if (firebaseUser) await fetchProfile(firebaseUser);
  }, [firebaseUser, fetchProfile]);

  return (
    <UserContext.Provider value={{
      firebaseUser, profile, permissions, loading,
      isStaff, isMember, isPending,
      canAccess, refreshProfile,
      cart, setCart, schools,
      systemSettings, needsProfileCompletion,
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
};
