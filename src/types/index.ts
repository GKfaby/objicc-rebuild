export type Role = 'super_admin'|'admin'|'staff'|'recruitment_officer'|'editor'|'cadet'|'parent'|'pending_cadet'|'pending_parent'|'visitor';
export const ROLE_LABELS: Record<Role,string> = {
  super_admin:'Super Admin',admin:'Admin',staff:'Staff',recruitment_officer:'Recruitment Officer',
  editor:'Editor',cadet:'Cadet',parent:'Parent',pending_cadet:'Pending Cadet',pending_parent:'Pending Parent',visitor:'Visitor',
};
export const SYSTEM_ROLES: Role[] = ['super_admin','admin','staff','recruitment_officer','editor','cadet','parent','pending_cadet','pending_parent'];
export const STAFF_ROLES: Role[] = ['super_admin','admin','staff','recruitment_officer','editor'];
export const MEMBER_ROLES: Role[] = ['cadet','parent','super_admin','admin','staff','recruitment_officer','editor'];

export interface RolePermissions {
  manageRoles:boolean;
  manageUsers:boolean;
  canViewUserUpdates:boolean;
  managePosts:boolean;
  manageMerchandise:boolean;
  manageRequests:boolean;
  manageOrders:boolean;        // ← NEW: undo/restore orders, manage recycle bin
  manageApplications:boolean;
  printPermissionSlips:boolean;
  viewAdminDashboard:boolean;
  manageSettings:boolean;
  managePaymentGateways:boolean;
}

const NONE: RolePermissions = {
  manageRoles:false,manageUsers:false,canViewUserUpdates:false,
  managePosts:false,manageMerchandise:false,manageRequests:false,
  manageOrders:false,manageApplications:false,printPermissionSlips:false,
  viewAdminDashboard:false,manageSettings:false,managePaymentGateways:false,
};

export const DEFAULT_PERMISSIONS: Record<string,RolePermissions> = {
  super_admin:{manageRoles:true,manageUsers:true,canViewUserUpdates:true,managePosts:true,manageMerchandise:true,manageRequests:true,manageOrders:true,manageApplications:true,printPermissionSlips:true,viewAdminDashboard:true,manageSettings:true,managePaymentGateways:true},
  admin:{manageRoles:true,manageUsers:true,canViewUserUpdates:true,managePosts:true,manageMerchandise:true,manageRequests:true,manageOrders:true,manageApplications:true,printPermissionSlips:true,viewAdminDashboard:true,manageSettings:true,managePaymentGateways:false},
  staff:{manageRoles:false,manageUsers:true,canViewUserUpdates:true,managePosts:true,manageMerchandise:true,manageRequests:true,manageOrders:false,manageApplications:true,printPermissionSlips:true,viewAdminDashboard:true,manageSettings:false,managePaymentGateways:false},
  recruitment_officer:{...NONE,manageApplications:true,printPermissionSlips:true,viewAdminDashboard:true},
  editor:{...NONE,managePosts:true,viewAdminDashboard:true},
  cadet:{...NONE},parent:{...NONE},pending_cadet:{...NONE},pending_parent:{...NONE},visitor:{...NONE},
};

export interface HeroStat { label:string; desc:string; }
export type AppTheme = 'default'|'midnight'|'forest'|'sunset'|'ocean';
export type ColorMode = 'light'|'dark'|'system';
export type A11yMode = 'normal'|'deuteranopia'|'protanopia'|'tritanopia'|'high-contrast';
export type FontSize = 'sm'|'md'|'lg'|'xl';

export interface SystemSettings {
  orgName:string; logoUrl:string; heroText:string; heroSubtext?:string;
  address:string; whatsappNumber:string; email?:string;
  heroStats:HeroStat[]; appTheme:AppTheme; defaultColorMode:ColorMode;
  defaultFontSize:FontSize; enableNarration:boolean;
  shopEnabled:boolean; suggestionsEnabled:boolean; eventsEnabled:boolean;
  maintenanceMode:boolean; maintenanceMessage?:string;
}
export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  orgName:'OBJICC', logoUrl:'/logo.png',
  heroText:'Empowering Future Generations',
  heroSubtext:'Building leaders through discipline, education, and community.',
  address:'7 Fort Street, Montego Bay', whatsappNumber:'18765850885',
  heroStats:[
    {label:'Est. 2015',desc:'Years of Excellence'},
    {label:'Youth Focused',desc:'Cadet Development'},
    {label:'Discipline',desc:'Leadership & Service'},
  ],
  appTheme:'default', defaultColorMode:'system', defaultFontSize:'md',
  enableNarration:false, shopEnabled:true, suggestionsEnabled:true, eventsEnabled:true,
  maintenanceMode:false,
};

export interface UserProfile {
  uid:string; email:string; firstName:string; lastName:string;
  middleInitial?:string; displayName:string; phone:string; role:Role;
  requestedRole?:'cadet'|'parent'; status:'pending'|'approved'|'rejected';
  school?:string; cadetName?:string; cadetFirstName?:string; cadetLastName?:string;
  cadetMiddleInitial?:string; cadetSchool?:string; avatarUrl?:string; createdAt:any;
}
export interface Post {
  id:string; title:string; type:'notice'|'event';
  category:'Announcements'|'Training'|'Events'; date:string; description:string;
  image?:string; hasPermissionSlip?:boolean; permissionSlipUrl?:string;
  isPrintable?:boolean; allowedRoles?:Role[]; likes?:number; createdAt:any;
}
export interface PricingOption { label:string; price:string; isActive:boolean; stock?:number; }
export interface Merchandise {
  id:string; name:string; description?:string; price:string; image?:string;
  category?:string; isPublished:boolean; pricingOptions?:PricingOption[];
  totalStock?:number; createdAt:any;
}
export interface CartItem { id:string; name:string; price:string; quantity:number; selectedSize?:string; image?:string; }
export interface Application {
  id:string; cadetName:string; school:string; grade:string; parentName:string;
  parentPhone:string; cadetPhone?:string; status:'pending'|'reviewed'|'accepted'|'rejected';
  createdAt:any; notes?:string;
}
export interface AppNotification { id:string; title:string; message:string; type?:'info'|'success'|'warning'|'error'; link?:string; read:boolean; createdAt:any; }
export interface Suggestion { id:string; content:string; category?:string; anonymous:boolean; submittedBy?:string; status:'pending'|'reviewed'|'actioned'; createdAt:any; }
export interface MerchRequest {
  id:string; userUid:string; requesterName:string; cadetName:string; phone:string;
  items:CartItem[]; totalPrice:string; paymentMethod:'online'|'walk-in';
  paymentStatus:'pending'|'paid'|'canceled'; status:'pending'|'completed'|'canceled';
  deleted?:boolean; deletedAt?:any; requestId?:string; createdAt:any;
}
export type ToastType = 'success'|'error'|'info'|'warning';
export interface Toast { id:string; message:string; type:ToastType; }