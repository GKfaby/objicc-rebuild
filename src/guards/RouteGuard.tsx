import React from 'react';
import{Navigate,useLocation} from 'react-router-dom';
import{useUser} from '../contexts/UserContext';
import type{Role} from '../types';
interface Props{children:React.ReactNode;allowedRoles?:Role|Role[];guestOnly?:boolean;redirectTo?:string}
export const RouteGuard:React.FC<Props>=({children,allowedRoles,guestOnly=false,redirectTo})=>{
  const{firebaseUser,profile,loading,needsProfileCompletion}=useUser();
  const location=useLocation();
  if(loading)return<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin"/></div>;
  if(guestOnly&&firebaseUser&&!needsProfileCompletion)return<Navigate to={redirectTo??'/'} replace/>;
  if(!guestOnly&&!firebaseUser)return<Navigate to="/login" state={{from:location}} replace/>;
  if(firebaseUser&&needsProfileCompletion&&!guestOnly&&location.pathname!=='/complete-profile')return<Navigate to="/complete-profile" replace/>;
  if(allowedRoles&&profile){const rs=Array.isArray(allowedRoles)?allowedRoles:[allowedRoles];if(!rs.includes(profile.role)){if(['pending_cadet','pending_parent'].includes(profile.role))return<Navigate to="/pending" replace/>;return<Navigate to={redirectTo??'/unauthorized'} replace/>;}}
  return<>{children}</>;
};
export const StaffOnly:React.FC<{children:React.ReactNode}>=({children})=><RouteGuard allowedRoles={['super_admin','admin','staff','recruitment_officer','editor']}>{children}</RouteGuard>;
export const MemberOnly:React.FC<{children:React.ReactNode}>=({children})=><RouteGuard allowedRoles={['super_admin','admin','staff','recruitment_officer','editor','cadet','parent']}>{children}</RouteGuard>;
export const AuthenticatedOnly:React.FC<{children:React.ReactNode}>=({children})=><RouteGuard allowedRoles={['super_admin','admin','staff','recruitment_officer','editor','cadet','parent','pending_cadet','pending_parent']}>{children}</RouteGuard>;