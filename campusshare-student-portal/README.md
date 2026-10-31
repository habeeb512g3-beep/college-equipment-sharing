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
