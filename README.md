# CampusShare Student Portal (Frontend Demo)

This project combines the eight supplied page bundles into one navigable student portal:

- Login and student registration
- Student dashboard
- Browse Equipment + Equipment Details
- My Requests
- Borrowed Equipment
- Transaction History
- Profile & Settings

## Run locally

1. Extract this folder.
2. Open it in VS Code.
3. Start **Live Server** from the root `index.html` file (recommended).
4. The app opens at the CampusShare login page.
5. Sign in with any valid-looking email address and a password of at least 6 characters. The login page uses institutional email and password only; the Campus SSO / NetID login option has been removed. This is a **demo-only sign-in**, not real authentication.

You can also register a student profile first. Registration validates the fields and stores profile details (never the password) in this browser for the demo.

## Navigation and demo flow

The same portal frame routes between all student pages. The Browse Equipment and Dashboard reservation forms save demo requests in browser `localStorage`; the resulting request appears at the top of **My Requests**. Existing sample content on the other pages is retained.

## Important limitations

- No backend or real authentication is connected.
- Data is local to the browser/device and can be cleared by clearing site storage.
- Equipment inventory, borrowing history, profile clearances, and borrowed-item details still contain sample/demo records.
- Requests created in this demo appear in My Requests but are not sent to staff, approved, or persisted to a server.
- University SSO, email verification, custody handoff, return verification, QR validation, and notifications require backend/service integration.
- The Equipment Owner / Staff Portal is intentionally not included yet; staff navigation is disabled or shows a notice.
- Several screens load externally hosted equipment photos and Google Fonts, so those visuals need an internet connection.

## Folder structure

```text
campusshare-student-portal/
  index.html                 # Single portal entry point
  portal.css / portal.js     # Route shell and iframe navigation
  portal-bridge.js           # Shared navigation/profile bridge
  pages/
    login/
    registration/
    dashboard/
    browse/
    requests/
    borrowed/
    history/
    profile/
```

Each page keeps its own stylesheet and JavaScript in its folder so its original design remains isolated from the other pages.


## Shared student/admin login (Supabase Auth)

The login page now authenticates with Supabase Auth and reads the signed-in account's role from `public.user_roles`. Students go to the Student Portal; accounts with the `admin` role go to the Admin Portal. Admin pages each run an authorization guard, so typing an admin page URL does not grant access. The admin navigation is not shown in the student interface.

### One-time Supabase setup

1. In Supabase Dashboard → SQL Editor, run `SUPABASE_ADMIN_SETUP.sql`.
2. In Supabase Authentication settings, enable Email/Password and configure the allowed redirect/site URLs for your deployment.
3. Create the administrator account through Supabase Auth (invite it or create it in the dashboard).
4. In the SQL file, uncomment the promotion statement and replace the email with the exact trusted admin email; run that statement in SQL Editor. Do not make admin role assignment available to public signup.
5. Keep the Supabase anon/publishable key in the frontend only. Never put the service-role key in this project.

### Security boundary

The frontend guard protects navigation and prevents ordinary users from opening the admin UI through the app. It is not a substitute for database authorization: apply RLS to every sensitive table and restrict write policies to verified admins (or trusted server-side functions). Static HTML files can still be downloaded if the site is publicly hosted, so sensitive records must never be embedded in those files. The `user_roles` table allows each authenticated user to read only their own role.

### Important

The portal's data modules still contain browser/demo data in places. This change connects sign-in and role-based routing; it does not automatically migrate the existing sample data or protect other tables until their RLS policies are configured.
