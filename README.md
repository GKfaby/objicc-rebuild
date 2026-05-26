# OBJICC Portal v2.0

A full rebuild of the OBJICC member portal — clean architecture, proper RBAC, 8 roles, settings panel, dark/accessibility modes, React Router v6.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Routing | React Router v6 |
| Styling | Tailwind CSS v4 |
| Backend | Firebase (Auth, Firestore, Storage) |
| Animations | Motion |
| Phone input | react-phone-number-input |

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Firebase
Copy `.env.example` to `.env` and fill in your Firebase project values:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 3. Enable Firebase services
In your Firebase console:
- **Authentication** → Enable Email/Password and Google providers
- **Firestore** → Create database (start in test mode, then deploy rules)
- **Storage** → Enable

### 4. Deploy Firestore rules
```bash
firebase deploy --only firestore:rules
```

### 5. Run dev server
```bash
npm run dev
```

Open http://localhost:3000

---

## First-Time Setup

1. **Register the first account** → it automatically becomes `super_admin`
2. All default roles are seeded to Firestore on first registration
3. Go to `/admin/settings` to upload your logo and configure branding

---

## Role Hierarchy

| Role | Access |
|---|---|
| `super_admin` | Everything — first user auto-assigned |
| `admin` | All except payment gateways |
| `staff` | Users, posts, merch, applications |
| `recruitment_officer` | Applications + print slips only |
| `editor` | Posts/notices only |
| `cadet` | Full member — shop, suggestions, profile |
| `parent` | Full member — shop, suggestions, profile |
| `pending_cadet` | Profile + notifications only (awaiting approval) |
| `pending_parent` | Profile + notifications only (awaiting approval) |
| `visitor` | Home, Events, Contact only |

---

## Registration Flow

1. User signs up → selects **Cadet** or **Parent**
2. Role set to `pending_cadet` or `pending_parent`
3. Admin goes to `/admin/users` → clicks **Approve**
4. Role upgraded to `cadet` or `parent`
5. User receives in-app notification
6. Full member access unlocked

---

## Settings Panel (`/admin/settings`)

Available to `super_admin` and `admin`:

- **Appearance** — Light/Dark/System mode, App theme (5 built-in themes), Font size
- **Branding** — Logo upload, org name, hero text, address, WhatsApp, email
- **Accessibility** — Colour-blind modes (Deuteranopia, Protanopia, Tritanopia, High Contrast), Audio narration toggle
- **Features** — Enable/disable Shop, Suggestions, Events
- **Deployment** — Maintenance mode with custom message

---

## Project Structure

```
src/
  App.tsx                  ← Router + providers
  main.tsx
  index.css                ← Themes + animations
  constants.ts             ← Schools, divisions
  firebase.ts              ← Firebase config
  types/index.ts           ← All TypeScript types

  contexts/
    UserContext.tsx         ← Auth, profile, permissions, cart
    ThemeContext.tsx        ← Dark mode, a11y, fonts, themes
    ToastContext.tsx        ← Global toasts

  guards/
    RouteGuard.tsx          ← RBAC route protection

  components/
    layout/
      Navbar.tsx
      Footer.tsx
      AdminLayout.tsx       ← Collapsible sidebar
    auth/
      AuthForm.tsx          ← Login + Signup + Complete Profile
    features/
      NoticeBoard.tsx
      settings/SettingsPanel.tsx
      profile/RequestHistory.tsx

  pages/
    HomePage.tsx
    EventsPage.tsx
    ContactPage.tsx
    PendingPage.tsx
    ProfilePage.tsx
    NotificationsPage.tsx
    ShopPage.tsx
    SuggestionsPage.tsx
    ErrorPages.tsx
    admin/
      DashboardPage.tsx
      UsersPage.tsx
      ApplicationsPage.tsx
      PostsPage.tsx
      MerchandisePage.tsx
      RolesPage.tsx
      SuggestionsPage.tsx
      ActivityPage.tsx
      PaymentsPage.tsx
      SettingsPage.tsx
```

---

## Adding a New Theme

1. Open `src/index.css`
2. Add a new `[data-theme="yourtheme"]` block:
```css
[data-theme="yourtheme"] {
  --navy:  #your-primary;
  --ocean: #your-secondary;
  --gold:  #your-accent;
}
```
3. Add it to the `THEMES` array in `src/components/features/settings/SettingsPanel.tsx`

---

## Build for Production

```bash
npm run build
```

Output goes to `dist/`. Deploy to Vercel, Netlify, or Firebase Hosting.

### Firebase Hosting deploy
```bash
firebase deploy --only hosting
```
