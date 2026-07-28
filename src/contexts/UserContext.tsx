import React,{createContext,useContext,useEffect,useState,useCallback} from 'react';
import{auth,db} from '../firebase';
import{onAuthStateChanged,signOut} from 'firebase/auth';
import{doc,onSnapshot,getDoc,setDoc,collection,serverTimestamp} from 'firebase/firestore';
import{Role,UserProfile,RolePermissions,SystemSettings,DEFAULT_PERMISSIONS,DEFAULT_SYSTEM_SETTINGS,CartItem} from '../types';
import{JAMAICAN_SCHOOLS} from '../constants';

interface UserContextType{
  firebaseUser:any;profile:UserProfile|null;permissions:RolePermissions;loading:boolean;
  isStaff:boolean;isMember:boolean;isPending:boolean;
  canAccess:(r:Role|Role[])=>boolean;refreshProfile:()=>Promise<void>;
  cart:CartItem[];setCart:React.Dispatch<React.SetStateAction<CartItem[]>>;
  schools:string[];systemSettings:SystemSettings;needsProfileCompletion:boolean;
}
const Ctx=createContext<UserContextType|undefined>(undefined);
const NONE:RolePermissions={manageRoles:false,manageUsers:false,canViewUserUpdates:false,managePosts:false,manageMerchandise:false,manageRequests:false,manageOrders:false,manageApplications:false,printPermissionSlips:false,viewAdminDashboard:false,manageSettings:false,managePaymentGateways:false};

export const UserProvider:React.FC<{children:React.ReactNode}>=({children})=>{
  const[firebaseUser,setFU]=useState<any>(null);
  const[profile,setProfile]=useState<UserProfile|null>(null);
  const[permissions,setPerms]=useState<RolePermissions>(NONE);
  const[loading,setLoading]=useState(true);
  const[cart,setCart]=useState<CartItem[]>([]);
  const[schools,setSchools]=useState<string[]>(JAMAICAN_SCHOOLS);
  const[needsProfileCompletion,setNPC]=useState(false);
  const[systemSettings,setSS]=useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);

  useEffect(()=>{
    const unsub=onSnapshot(doc(db,'settings','global'),(snap)=>{
      if(snap.exists()){
        const data=snap.data();
        const clean=Object.fromEntries(Object.entries(data).filter(([,v])=>v!==null&&v!==undefined&&v!==''));
        setSS(p=>({...p,...clean}));
      }
    });
    return unsub;
  },[]);

  useEffect(()=>{
    const load=async()=>{
      try{
        const snap=await getDoc(doc(db,'settings','schools'));
        if(snap.exists()&&snap.data().list?.length)setSchools(snap.data().list);
        else await setDoc(doc(db,'settings','schools'),{list:JAMAICAN_SCHOOLS},{merge:true});
      }catch(e){}
    };
    load();
  },[]);

  const resolvePerms=async(role:Role):Promise<RolePermissions>=>{
    if(role==='super_admin')return DEFAULT_PERMISSIONS.super_admin;
    try{const s=await getDoc(doc(db,'roles',role));if(s.exists())return s.data().permissions;}catch(_){}
    return DEFAULT_PERMISSIONS[role]??NONE;
  };

  const fetchProfile=useCallback(async(fbUser:any)=>{
    const snap=await getDoc(doc(db,'users',fbUser.uid));
    if(snap.exists()){
      const data={uid:fbUser.uid,...snap.data()} as UserProfile;
      setProfile(data);setPerms(await resolvePerms(data.role));setNPC(false);
    }else{setProfile(null);setPerms(NONE);setNPC(true);}
  },[]);

  useEffect(()=>{
    let unsubProfile:(()=>void)|undefined;
    const unsubAuth=onAuthStateChanged(auth,(fbUser)=>{
      setFU(fbUser);
      unsubProfile?.();unsubProfile=undefined;
      if(fbUser){
        unsubProfile=onSnapshot(doc(db,'users',fbUser.uid),async(snap)=>{
          if(snap.exists()){
            const data={uid:fbUser.uid,...snap.data()} as UserProfile;
            if(data.banned){
              // Kicks in instantly even for an already-open session —
              // no need to wait for the next login. The banned notice
              // is picked up by MaintenanceGate after sign-out completes.
              sessionStorage.setItem('objicc_banned_notice','1');
              setProfile(null);setPerms(NONE);setNPC(false);setLoading(false);
              signOut(auth);
              return;
            }
            setProfile(data);setPerms(await resolvePerms(data.role));setNPC(false);
          }else{setProfile(null);setPerms(NONE);setNPC(true);}
          setLoading(false);
        },()=>setLoading(false));
      }else{setProfile(null);setPerms(NONE);setNPC(false);setLoading(false);}
    });
    return()=>{unsubAuth();unsubProfile?.();};
  },[]);

  const STAFF:Role[]=['super_admin','admin','staff','recruitment_officer','editor'];
  const isStaff=profile?STAFF.includes(profile.role):false;
  const isMember=profile?[...STAFF,'cadet','parent'].includes(profile.role):false;
  const isPending=profile?['pending_cadet','pending_parent'].includes(profile.role):false;
  const canAccess=useCallback((r:Role|Role[])=>{if(!profile)return false;const rs=Array.isArray(r)?r:[r];return rs.includes(profile.role);},[profile]);
  const refreshProfile=useCallback(async()=>{const u=auth.currentUser;if(u)await fetchProfile(u);},[fetchProfile]);

  return<Ctx.Provider value={{firebaseUser,profile,permissions,loading,isStaff,isMember,isPending,canAccess,refreshProfile,cart,setCart,schools,systemSettings,needsProfileCompletion}}>{children}</Ctx.Provider>;
};
export const useUser=()=>{const c=useContext(Ctx);if(!c)throw new Error('useUser outside provider');return c;};