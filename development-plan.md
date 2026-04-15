
# **AI Agent Development Plan: "Friends Adda" (From Scratch)**

## **Project Context**
We are building "Friends Adda", a mobile-first web application for group event management. 
**Tech Stack:** TanStack Start (React, SSR, file-based routing), Tailwind CSS v4, Lucide React, and Supabase (PostgreSQL, Auth, RLS). 
**Aesthetic:** Dark mode, glassmorphism UI, premium mobile app feel.

### **Core Business Logic**
1. **Users:** Must register and await Global App-Admin approval. Profiles include a Blood Group.
2. **Roles:** Dual-layer permissions. 
   - *Global Level:* App-Admin (can bypass all rules, approve users) vs. Member.
   - *Event Level:* Captain (Creator), Co-Captain, and Event-Member.
3. **Events:** Can be `public` (anyone can join) or `private` (invite/admin add only).
4. **Modules:** Events have specific types like `fund_tracker` (collecting money) or `random_picker` (spin a wheel to see who pays).

---

### **Phase 0: Project Initialization**
**Goal:** Scaffold the base application.
1. Initialize a new TanStack Start project.
2. Install dependencies: `@supabase/supabase-js`, `lucide-react`, `clsx`, `tailwind-merge`.
3. Set up **Tailwind CSS v4** (ensure `app/styles/app.css` uses the `@theme` directive with a dark slate/indigo color palette and custom glassmorphism utility classes like `.glass-card`).
4. Set up environment variables for Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

### **Phase 1: Database Schema & Supabase Types**
**Goal:** Define the data layer with strict RLS (Row Level Security).
1. **Write the SQL Migration:**
   - `profiles`: `id` (uuid), `full_name`, `email`, `role` (`'admin'`, `'member'`), `is_approved` (boolean), `blood_group` (text), `created_at`.
   - `events`: `id`, `title`, `description`, `type` (`'fund_tracker'`, `'random_picker'`), `status` (`'open'`, `'active'`, `'completed'`), `visibility` (`'public'`, `'private'`), `created_by` (uuid), `created_at`.
   - `event_subscribers`: `event_id`, `user_id`, `event_role` (`'captain'`, `'co-captain'`, `'member'`), `joined_at`.
   - `event_funds`: `id`, `event_id`, `user_id`, `amount` (numeric), `status` (`'pending'`, `'paid'`).
   - `event_activities`: `id`, `event_id`, `activity_type`, `payload` (jsonb), `created_at`.
2. **Write RLS Policies:**
   - App-Admins have full `ALL` access to all tables.
   - `events`: Selectable if `visibility = 'public'` OR user is in `event_subscribers`.
   - Update/Delete on Events/Funds/Subscribers: Allowed if user is `captain` or `co-captain` for that `event_id`.
3. **TypeScript:** Create `app/utils/supabase.ts` and export the Supabase client and strict TypeScript interfaces for the schema.

### **Phase 2: Authentication & Global Layout**
**Goal:** Implement login, signup, and the mobile-first wrapper.
1. **Auth Utilities:** Create `app/utils/auth.ts` for Supabase auth functions (signIn, signUp, signOut).
2. **Auth Provider:** Create a React context to supply `user`, `profile`, and `isLoading`.
3. **Layout Component:** Create `MobileLayout.tsx` (max-width mobile constraint, gradient background).
   - *Crucial Check:* If `user` is logged in but `profile.is_approved` is false, render a "Pending Admin Approval" lock screen. Prevent access to all routes except `/settings`.
4. **Pages:** Build `/login` and `/signup` routes using TanStack Router.

### **Phase 3: Routing & Bottom Navigation**
**Goal:** Set up the core shell of the app.
1. **Bottom Nav:** Create a sticky bottom navigation bar with icons for: `Dashboard` (`/`), `Members` (`/members`), `History` (`/history`), and `Settings` (`/settings`).
2. Set up these empty route files using `@tanstack/react-router`.

### **Phase 4: Settings, Profile & Global Admin**
**Goal:** Allow profile updates and let Global Admins manage users.
1. **`/settings` Route:** 
   - User can view/edit their `full_name` and select their `blood_group` from a dropdown (A+, O-, etc.).
2. **App-Admin Section (Only visible if `profile.role === 'admin'`):**
   - List users needing approval. Admin can click "Approve".
   - Admin can promote other users to 'admin'.

### **Phase 5: The Dashboard & Event Creation**
**Goal:** View and create events.
1. **Data Fetching:** Use TanStack Router `loader` and `queryOptions` to fetch events server-side.
2. **UI Sections (`/` route):**
   - **My Events:** List active events the user is subscribed to. Show their event role (Captain badge).
   - **Discover:** List `public` events with `status = 'open'` where the user is NOT subscribed. Include a "Join" button.
3. **Create Event FAB:** Floating Action Button available to *all approved users*. Opens a drawer:
   - Inputs: Title, Description, Type (Fund/Random), Visibility (Public/Private).
   - On submission: Create the event, and immediately insert the creator into `event_subscribers` with `event_role = 'captain'`.

### **Phase 6: Event Detail & Hierarchy Management**
**Goal:** The shell for a specific event and member management.
1. **Dynamic Route (`/events/$eventId`):**
   - Header showing Event Title, Type, Privacy.
2. **Member Management Drawer:**
   - List all subscribers.
   - **Captain / App-Admin Actions:** Promote a member to `co-captain`, demote, or remove from the event entirely.
   - *Constraint:* `co-captains` cannot remove or demote the `captain`.

### **Phase 7: Event Modules (The Core Logic)**
**Goal:** Implement the specific features based on `event.type`.
1. **Module: Fund Tracker (`event.type === 'fund_tracker'`):**
   - Display total target vs total collected.
   - List members and their `event_funds` status (`pending`/`paid`).
   - "Mark as Paid" button: Visible *only* to Captain, Co-Captain, or App-Admin. Uses TanStack `createServerFn` to update the DB.
2. **Module: Random Picker (`event.type === 'random_picker'`):**
   - UI: An input for "Bill Amount" and a prominent "Spin / Pick" button (visible to Captain/Co-Captain/App-Admin).
   - Action: Server-side function randomly selects one user from `event_subscribers`. Records the result in `event_activities` (e.g., `{ winner: user_id, amount: 500 }`). 
   - Display: Read from `event_activities` to show the history of who had to pay.

### **Phase 8: Members & History Directories**
**Goal:** Finish the auxiliary tabs.
1. **Members Tab (`/members`):**
   - Fetch and display all approved users.
   - Distinctly display their **Blood Group** on their profile card. 
   - Search bar to filter by name or blood group.
2. **History Tab (`/history`):**
   - Fetch all events where `status === 'completed'` and the user was a subscriber.
   - Display them as a timeline/list.

***

### **Instructions for the AI Agent:**
1. You are an expert in TanStack Start, React, and Supabase.
2. We are starting entirely from scratch. Do not write React `useEffect` data-fetching. Use TanStack Router `loader` functions and `@tanstack/react-query` to ensure SSR compatibility.
3. We will execute this plan **one phase at a time**.
4. **Begin with Phase 0 and Phase 1.** Set up the project structure, generate the required Supabase SQL migration commands, and write the TypeScript interfaces. Do not move to Phase 2 until instructed. Provide the SQL block clearly so it can be run in the Supabase SQL editor.