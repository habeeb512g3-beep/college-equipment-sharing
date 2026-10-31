# CampusShare Admin Portal

This project combines the seven supplied Admin Console pages into one navigable portal.

## Pages

- `index.html` — Admin Dashboard
- `users.html` — View and Manage Users
- `owner-applications.html` — Approve or Reject Owner Applications
- `equipment.html` — Manage All Equipment
- `bookings.html` — Monitor Bookings and Borrowing
- `incidents.html` — Manage Incidents
- `activity-logs.html` — View Notifications and Activity Logs

## Run locally

1. Extract the ZIP.
2. Open the `campusshare-admin-portal` folder in VS Code.
3. Start Live Server from the root `index.html`.
4. Use the sidebar to navigate between the seven Admin Console pages.

No build step or package installation is required.

## What is connected

- All seven pages are in one folder and each sidebar link navigates to the corresponding page.
- Fixed sidebar scripts that previously cancelled navigation on the Users, Owner Applications and Activity Logs pages.
- Added shared navigation logic, active-page highlighting, keyboard-accessible dashboard shortcuts and global search routing across modules.
- Dashboard summary cards and major panels now open the relevant Admin module when selected.
- Each page keeps its own CSS and JavaScript file to prevent style and script collisions. `admin-navigation.js` is shared by all pages for cross-module navigation and global search.
- The dashboard is the portal entry point.
- Page-specific demo interactions remain available, including search, filtering, dialogs, CSV export and demo status actions where supplied.

## Important limitations

- This is a frontend prototype using sample/demo records.
- Some page actions save changes in browser `localStorage`; this is not a shared database.
- Admin authentication, real role/permission enforcement, server-side actions, official audit logging, identity verification, notifications and shared integration with the student/staff portals require a backend.
- The RFID/QR scanner is a demonstration interface unless connected to supported hardware and backend verification.
- External fonts and some images may require an internet connection.

## Suggested next integration step

Connect each page's existing demo data/actions to a shared backend API. Enforce admin permissions on the server, record all consequential actions in an append-only audit log, and test the complete workflows with separate student, owner and admin accounts.
