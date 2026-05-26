import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import type { Role } from '../types';

interface RouteGuardProps {
  children: React.ReactNode;
  /** Minimum role(s) allowed. If array, any of them grants access. */
  allowedRoles?: Role | Role[];
  /** If true, only unauthenticated users can access (e.g. login page) */
  guestOnly?: boolean;
  /** Custom redirect path */
  redirectTo?: string;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  allowedRoles,
  guestOnly = false,
  redirectTo,
}) => {
  const { firebaseUser, profile, loading, needsProfileCompletion } = useUser();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" />
      </div>
    );
  }

  // Guest-only routes (login, signup) — redirect authenticated users
  if (guestOnly && firebaseUser && !needsProfileCompletion) {
    return <Navigate to={redirectTo ?? '/'} replace />;
  }

  // Protected routes — must be authenticated
  if (!guestOnly && !firebaseUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Needs profile completion
  if (firebaseUser && needsProfileCompletion && !guestOnly) {
    return <Navigate to="/complete-profile" replace />;
  }

  // Role-based guard
  if (allowedRoles && profile) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(profile.role)) {
      // Redirect based on what the user actually is
      if (['pending_cadet', 'pending_parent'].includes(profile.role)) {
        return <Navigate to="/pending" replace />;
      }
      return <Navigate to={redirectTo ?? '/unauthorized'} replace />;
    }
  }

  return <>{children}</>;
};

// Convenience wrappers
export const StaffOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RouteGuard allowedRoles={['super_admin', 'admin', 'staff', 'recruitment_officer', 'editor']}>
    {children}
  </RouteGuard>
);

export const MemberOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RouteGuard allowedRoles={['super_admin', 'admin', 'staff', 'recruitment_officer', 'editor', 'cadet', 'parent']}>
    {children}
  </RouteGuard>
);

export const AuthenticatedOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RouteGuard allowedRoles={['super_admin', 'admin', 'staff', 'recruitment_officer', 'editor', 'cadet', 'parent', 'pending_cadet', 'pending_parent']}>
    {children}
  </RouteGuard>
);
