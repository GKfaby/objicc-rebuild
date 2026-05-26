// ─── Roles ────────────────────────────────────────────────────────────────────
export type Role =
  | 'super_admin'
  | 'admin'
  | 'staff'
  | 'recruitment_officer'
  | 'editor'
  | 'cadet'
  | 'parent'
  | 'pending_cadet'
  | 'pending_parent'
  | 'visitor';

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  staff: 'Staff',
  recruitment_officer: 'Recruitment Officer',
  editor: 'Editor',
  cadet: 'Cadet',
  parent: 'Parent',
  pending_cadet: 'Pending Cadet',
  pending_parent: 'Pending Parent',
  visitor: 'Visitor',
};

export const STAFF_ROLES: Role[] = ['super_admin', 'admin', 'staff', 'recruitment_officer', 'editor'];
export const MEMBER_ROLES: Role[] = ['cadet', 'parent', ...STAFF_ROLES];
export const PENDING_ROLES: Role[] = ['pending_cadet', 'pending_parent'];
export const APPROVED_USER_ROLES: Role[] = [...PENDING_ROLES, ...MEMBER_ROLES];

// ─── Permissions ──────────────────────────────────────────────────────────────
export interface RolePermissions {
  manageRoles: boolean;
  manageUsers: boolean;
  canViewUserUpdates: boolean;
  managePosts: boolean;
  manageMerchandise: boolean;
  manageRequests: boolean;
  manageApplications: boolean;
  printPermissionSlips: boolean;
  viewAdminDashboard: boolean;
  manageSettings: boolean;
  managePaymentGateways: boolean;
}

export const DEFAULT_PERMISSIONS: Record<string, RolePermissions> = {
  super_admin: {
    manageRoles: true, manageUsers: true, canViewUserUpdates: true,
    managePosts: true, manageMerchandise: true, manageRequests: true,
    manageApplications: true, printPermissionSlips: true, viewAdminDashboard: true,
    manageSettings: true, managePaymentGateways: true,
  },
  admin: {
    manageRoles: true, manageUsers: true, canViewUserUpdates: true,
    managePosts: true, manageMerchandise: true, manageRequests: true,
    manageApplications: true, printPermissionSlips: true, viewAdminDashboard: true,
    manageSettings: true, managePaymentGateways: false,
  },
  staff: {
    manageRoles: false, manageUsers: true, canViewUserUpdates: true,
    managePosts: true, manageMerchandise: true, manageRequests: true,
    manageApplications: true, printPermissionSlips: true, viewAdminDashboard: true,
    manageSettings: false, managePaymentGateways: false,
  },
  recruitment_officer: {
    manageRoles: false, manageUsers: false, canViewUserUpdates: false,
    managePosts: false, manageMerchandise: false, manageRequests: false,
    manageApplications: true, printPermissionSlips: true, viewAdminDashboard: true,
    manageSettings: false, managePaymentGateways: false,
  },
  editor: {
    manageRoles: false, manageUsers: false, canViewUserUpdates: false,
    managePosts: true, manageMerchandise: false, manageRequests: false,
    manageApplications: false, printPermissionSlips: false, viewAdminDashboard: true,
    manageSettings: false, managePaymentGateways: false,
  },
  cadet: { manageRoles: false, manageUsers: false, canViewUserUpdates: false, managePosts: false, manageMerchandise: false, manageRequests: false, manageApplications: false, printPermissionSlips: false, viewAdminDashboard: false, manageSettings: false, managePaymentGateways: false },
  parent: { manageRoles: false, manageUsers: false, canViewUserUpdates: false, managePosts: false, manageMerchandise: false, manageRequests: false, manageApplications: false, printPermissionSlips: false, viewAdminDashboard: false, manageSettings: false, managePaymentGateways: false },
  pending_cadet: { manageRoles: false, manageUsers: false, canViewUserUpdates: false, managePosts: false, manageMerchandise: false, manageRequests: false, manageApplications: false, printPermissionSlips: false, viewAdminDashboard: false, manageSettings: false, managePaymentGateways: false },
  pending_parent: { manageRoles: false, manageUsers: false, canViewUserUpdates: false, managePosts: false, manageMerchandise: false, manageRequests: false, manageApplications: false, printPermissionSlips: false, viewAdminDashboard: false, manageSettings: false, managePaymentGateways: false },
  visitor: { manageRoles: false, manageUsers: false, canViewUserUpdates: false, managePosts: false, manageMerchandise: false, manageRequests: false, manageApplications: false, printPermissionSlips: false, viewAdminDashboard: false, manageSettings: false, managePaymentGateways: false },
};

// ─── User ─────────────────────────────────────────────────────────────────────
export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  middleInitial?: string;
  displayName: string;
  phone: string;
  role: Role;
  requestedRole?: 'cadet' | 'parent';
  status: 'pending' | 'approved' | 'rejected';
  school?: string;
  cadetName?: string;
  cadetFirstName?: string;
  cadetLastName?: string;
  cadetMiddleInitial?: string;
  cadetSchool?: string;
  division?: string;
  avatarUrl?: string;
  createdAt: any;
  updatedAt?: any;
}

// ─── System Settings ──────────────────────────────────────────────────────────
export type AppTheme = 'default' | 'midnight' | 'forest' | 'sunset' | 'ocean';
export type ColorMode = 'light' | 'dark' | 'system';
export type A11yMode = 'normal' | 'deuteranopia' | 'protanopia' | 'tritanopia' | 'high-contrast';
export type FontSize = 'sm' | 'md' | 'lg' | 'xl';

export interface HeroStat {
  label: string;
  desc: string;
}

export interface SystemSettings {
  // Branding
  orgName: string;
  logoUrl: string;
  secondaryLogoUrl?: string;
  heroText: string;
  heroSubtext?: string;
  address: string;
  whatsappNumber: string;
  email?: string;
  // Hero stats strip
  heroStats: HeroStat[];
  // Appearance
  appTheme: AppTheme;
  defaultColorMode: ColorMode;
  // Accessibility
  defaultFontSize: FontSize;
  enableNarration: boolean;
  // Features
  shopEnabled: boolean;
  suggestionsEnabled: boolean;
  eventsEnabled: boolean;
  // Deployment
  maintenanceMode: boolean;
  maintenanceMessage?: string;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  orgName: 'OBJICC',
  logoUrl: '/logo.png',
  heroText: 'Empowering Future Generations',
  heroSubtext: 'Building leaders through discipline, education, and community.',
  address: '7 Fort Street, Montego Bay',
  whatsappNumber: '18765850885',
  heroStats: [
    { label: 'Est. 2015', desc: 'Years of Excellence' },
    { label: 'Youth Focused', desc: 'Cadet Development' },
    { label: 'Discipline', desc: 'Leadership & Service' },
  ],
  appTheme: 'default',
  defaultColorMode: 'system',
  defaultFontSize: 'md',
  enableNarration: false,
  shopEnabled: true,
  suggestionsEnabled: true,
  eventsEnabled: true,
  maintenanceMode: false,
};

// ─── Post / Notice / Event ────────────────────────────────────────────────────
export interface Post {
  id: string;
  title: string;
  type: 'notice' | 'event';
  category: 'Announcements' | 'Training' | 'Events';
  date: string;
  description: string;
  image?: string;
  hasPermissionSlip?: boolean;
  permissionSlipUrl?: string;
  isPrintable?: boolean;
  allowedRoles?: Role[];
  likes?: number;
  createdAt: any;
  createdBy?: string;
}

// ─── Merchandise ──────────────────────────────────────────────────────────────
export interface PricingOption {
  label: string;
  price: string;
  isActive: boolean;
  stock?: number;
}

export interface Merchandise {
  id: string;
  name: string;
  description?: string;
  price: string;
  image?: string;
  category?: string;
  isPublished: boolean;
  pricingOptions?: PricingOption[];
  totalStock?: number;
  createdAt: any;
}

export interface CartItem {
  id: string;
  name: string;
  price: string;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
  image?: string;
}

// ─── Application ──────────────────────────────────────────────────────────────
export interface Application {
  id: string;
  cadetName: string;
  school: string;
  grade: string;
  parentName: string;
  parentPhone: string;
  cadetPhone?: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  createdAt: any;
  notes?: string;
  reviewedBy?: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  read: boolean;
  createdAt: any;
}

// ─── Suggestion ───────────────────────────────────────────────────────────────
export interface Suggestion {
  id: string;
  content: string;
  category?: string;
  anonymous: boolean;
  submittedBy?: string;
  status: 'pending' | 'reviewed' | 'actioned';
  createdAt: any;
}

// ─── Merch Request ────────────────────────────────────────────────────────────
export interface MerchRequest {
  id: string;
  userUid: string;
  requesterName: string;
  cadetName: string;
  phone: string;
  items: CartItem[];
  totalPrice: string;
  paymentMethod: 'online' | 'walk-in';
  paymentStatus: 'pending' | 'paid' | 'canceled';
  status: 'pending' | 'completed' | 'canceled';
  refundRequested?: boolean;
  refundStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  refundReason?: string;
  requestId?: string;
  createdAt: any;
  canceledAt?: any;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'info' | 'warning';
export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// Canonical ordered role list — used by UsersPage & RolesPage
export const SYSTEM_ROLES: Role[] = [
  'super_admin','admin','staff','recruitment_officer',
  'editor','cadet','parent','pending_cadet','pending_parent',
];
