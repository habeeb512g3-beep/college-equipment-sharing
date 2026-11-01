CampusShare Owner Portal — updated prototype

Run:
1. Extract the ZIP to a folder.
2. Open dashboard.html in a modern browser (Chrome, Edge or Firefox).
3. Navigate using the left menu.
4. Equipment and booking changes are saved in browser localStorage and survive refreshes in the same browser profile.

Implemented:
- Removed the Dashboard Add Equipment action/modal.
- Equipment add/edit/delete with Name, Description, Image and Location only.
- Local image upload (image/*, max 2 MB) stored as a data URL in localStorage.
- Persistent booking status actions (approve, decline, waiting list) and usage timer.
- Completed timer sessions / return sign-offs recorded in History.
- Calendar section shows approved bookings and any date supplied by the original booking record.
- History search/reset and CSV export for completed sessions; PDF export invokes browser print.
- Shared localStorage data model across all portal pages.

Important scope notes:
- This is a front-end static ZIP. Persistence is local to one browser profile/device; it is not a server database and does not synchronize across users or devices.
- The original sample booking data does not contain a complete, reliable date for every request. The Calendar therefore shows “Date not specified in request” where the source data did not provide a date; it does not invent dates.
- External assets (Tailwind CDN, Google Fonts and hosted images) still require internet access.
- The original portal contains some demo-only controls and sample content. This update wires core workflows and common inline actions, but does not provide real email/SMS, institutional authentication, server-side audit signatures, or backend exports.


Dashboard consistency update:
- Dashboard KPI cards are recalculated from the shared localStorage records on every load.
- Dashboard Accept/Reject actions update the same request record used by Requests, Calendar and History.
- Approved and declined decisions are written to History immediately with decision timestamp and status.
- Data is browser-local (localStorage) and persists across refreshes in the same browser profile; it is not shared across devices/users.
