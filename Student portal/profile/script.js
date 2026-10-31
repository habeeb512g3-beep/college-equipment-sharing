
(() => {
  "use strict";

  // CampusShare Profile & Settings: real authenticated-user data only.
  // The supplied schema has no certificate, notification-preference, phone,
  // device-session, account-strike, or borrowing-limit tables/columns.

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const state = {
    client: null,
    user: null,
    profile: null,
    requests: [],
    items: [],
    loans: [],
    notifications: [],
    activity: [],
    resources: new Map(),
    categories: new Map(),
    images: new Map(),
    toastTimer: null,
    action: null
  };

  const modal = $("#modalBackdrop");
  const modalTitle = $("#modalTitle");
  const modalBody = $("#modalBody");
  const modalSave = $("#modalSaveBtn");
  const toastEl = $("#toast");

  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);

  const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;

  const fmt = (v, time = false) => {
    if (!v || Number.isNaN(new Date(v).getTime())) {
      return "Not recorded";
    }

    return new Intl.DateTimeFormat(
      undefined,
      time
        ? { dateStyle: "medium", timeStyle: "short" }
        : { dateStyle: "medium" }
    ).format(new Date(v));
  };

  const initials = name =>
    String(name || "Student")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join("") || "ST";

  const meta = (...keys) => {
    const data = state.user?.user_metadata || {};

    for (const key of keys) {
      if (
        data[key] != null &&
        String(data[key]).trim()
      ) {
        return String(data[key]).trim();
      }
    }

    return "";
  };

  const name = () =>
    state.profile?.full_name ||
    meta("full_name", "fullName", "name") ||
    state.user?.email?.split("@")[0] ||
    "Student";

  const email = () =>
    state.profile?.email ||
    state.user?.email ||
    "";

  const department = () =>
    state.profile?.department ||
    meta("department") ||
    "";

  const role = () =>
    String(
      state.profile?.role ||
      meta("account_type", "role") ||
      "student"
    ).toLowerCase();

  const campusId = () =>
    meta("campus_id", "campusId", "student_id", "studentId");

  const cohort = () =>
    meta("cohort", "academic_year", "academicYear", "semester");

  function notify(message, error = false) {
    if (!toastEl) return;

    toastEl.textContent = message;
    toastEl.classList.toggle("error", !!error);
    toastEl.classList.add("show");

    clearTimeout(state.toastTimer);

    state.toastTimer = setTimeout(
      () => toastEl.classList.remove("show"),
      3200
    );
  }

  function identity() {
    const hero = $(".profile-hero");
    if (!hero) return;

    const n = name();
    const e = email();
    const d = department();
    const r = role();
    const id = campusId();
    const c = cohort();

    const photo = $(".profile-photo", hero);

    if (photo) {
      $("span", photo).textContent = initials(n);
      photo.setAttribute(
        "aria-label",
        `${n} profile initials`
      );
    }

    $(".name-line h1", hero).textContent = n;

    const idPill = $(".id-pill", hero);

    if (idPill) {
      idPill.textContent = id
        ? `#${id}`
        : "Student account";

      idPill.hidden = !id;
    }

    const badges = $$(".identity-badges", hero);

    if (badges[0]) {
      badges[0].textContent =
        `${state.user?.email_confirmed_at || state.user?.confirmed_at
          ? "● Verified account"
          : "● Signed-in account"} · ${r}`;
    }

    if (badges[1]) {
      badges[1].textContent = `CampusShare role: ${r}`;
    }

    const academic = $(".identity-copy > p", hero);

    if (academic) {
      academic.textContent =
        [d, c].filter(Boolean).join(" · ") ||
        "Academic details have not been provided.";
    }

    const identityMeta = $(".identity-meta", hero);

    if (identityMeta) {
      identityMeta.innerHTML = `
        <span>✉ ${esc(e || "Email not available")}</span>
        <span>♙ ${esc(id ? `Student ID: ${id}` : "Student ID not provided")}</span>
      `;
    }

    if ($(".user-name")) {
      $(".user-name").textContent = n;
    }

    if ($(".avatar-mini")) {
      $(".avatar-mini").textContent = initials(n);
    }

    const switchButton = $("#switchViewBtn");

    if (switchButton) {
      switchButton.hidden = r !== "owner";
    }

    const managerButton = $("#labManagerBtn");

    if (managerButton) {
      managerButton.hidden = r !== "owner";
    }

    const chip = $("#userMenuBtn");

    if (chip) {
      chip.title = e;
    }
  }

  function css() {
    if ($("#profile-live-css")) return;

    const style = document.createElement("style");

    style.id = "profile-live-css";

    style.textContent = `
      .profile-live-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }

      .profile-live-stat {
        padding: 12px;
        border: 1px solid #e8edf4;
        border-radius: 9px;
        background: #fbfcfe;
        min-width: 0;
      }

      .profile-live-stat small {
        display: block;
        color: #718096;
        font-size: 8px;
        line-height: 1.4;
      }

      .profile-live-stat strong {
        display: block;
        margin: 8px 0 3px;
        color: #17365f;
        font-size: 21px;
        overflow-wrap: anywhere;
      }

      .profile-live-stat p,
      .profile-live-small {
        margin: 0;
        color: #718096;
        font-size: 8px;
        line-height: 1.5;
      }

      .profile-live-list {
        display: grid;
        gap: 8px;
        margin-top: 11px;
      }

      .profile-live-row {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 9px;
        border: 1px solid #edf0f5;
        border-radius: 8px;
        background: #f9fbfe;
        min-width: 0;
      }

      .profile-live-row img,
      .profile-live-placeholder {
        width: 44px;
        height: 42px;
        flex: 0 0 44px;
        object-fit: cover;
        border-radius: 6px;
        background: #edf2f8;
      }

      .profile-live-placeholder {
        display: grid;
        place-items: center;
        color: #6380a5;
        font-size: 18px;
      }

      .profile-live-row > div {
        min-width: 0;
        flex: 1;
      }

      .profile-live-row strong,
      .profile-live-notice strong {
        display: block;
        font-size: 9px;
        color: #1d3b63;
        overflow-wrap: anywhere;
      }

      .profile-live-row small,
      .profile-live-notice small {
        display: block;
        margin-top: 3px;
        color: #708098;
        font-size: 8px;
        line-height: 1.4;
      }

      .profile-live-note,
      .profile-live-empty {
        margin-top: 10px;
        padding: 10px;
        border-radius: 7px;
        background: #f3f6fb;
        color: #6d7c91;
        font-size: 9px;
        line-height: 1.6;
      }

      .profile-live-empty {
        border: 1px dashed #dbe3ee;
        background: #fbfcfe;
      }

      .profile-live-empty strong {
        display: block;
        color: #29476e;
        font-size: 10px;
        margin-bottom: 3px;
      }

      .profile-live-notice {
        display: flex;
        gap: 9px;
        padding: 10px 0;
        border-bottom: 1px solid #eef1f5;
      }

      .profile-live-notice:last-child {
        border-bottom: 0;
      }

      .profile-live-notice .dot {
        width: 8px;
        height: 8px;
        margin-top: 4px;
        flex: 0 0 8px;
        border-radius: 50%;
        background: #94a3b8;
      }

      .profile-live-notice.unread .dot {
        background: #2878ef;
      }

      .profile-live-notice p {
        margin: 3px 0;
        color: #667991;
        font-size: 8px;
        line-height: 1.5;
        white-space: pre-wrap;
      }

      .profile-live-kv {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .profile-live-kv > div {
        padding: 9px;
        border: 1px solid #edf0f5;
        border-radius: 7px;
        min-width: 0;
      }

      .profile-live-kv small {
        display: block;
        font-size: 8px;
        color: #7c899c;
        margin-bottom: 4px;
      }

      .profile-live-kv strong {
        display: block;
        font-size: 9px;
        color: #27466d;
        overflow-wrap: anywhere;
      }

      .profile-live-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        margin-top: 12px;
      }

      .profile-live-actions button {
        border: 1px solid #dbe4f0;
        background: #fff;
        color: #245b9e;
        border-radius: 6px;
        padding: 8px 11px;
        font-size: 9px;
        font-weight: 650;
        cursor: pointer;
      }

      .profile-live-actions button.danger {
        color: #b83232;
        background: #fff3f2;
        border-color: #ffd9d5;
      }

      .profile-live-form {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .profile-live-form .full {
        grid-column: 1 / -1;
      }

      .profile-live-form label {
        display: grid;
        gap: 5px;
        color: #465d7d;
        font-size: 9px;
        font-weight: 650;
      }

      .profile-live-form input {
        width: 100%;
        border: 1px solid #dce4ef;
        border-radius: 6px;
        padding: 9px;
        font: inherit;
        font-size: 10px;
        color: #18365c;
        background: #fff;
      }

      .profile-live-form input:disabled {
        background: #f2f5f9;
        color: #7c899b;
      }

      @media(max-width:900px) {
        .profile-live-grid {
          grid-template-columns: 1fr 1fr;
        }
      }

      @media(max-width:620px) {
        .profile-live-grid,
        .profile-live-kv,
        .profile-live-form {
          grid-template-columns: 1fr;
        }

        .profile-live-form .full {
          grid-column: auto;
        }
      }
    `;

    document.head.append(style);
  }

  function panel(panelNode, title, subtitle, html) {
    if (!panelNode) return;

    panelNode.innerHTML = `
      <div class="section-heading">
        <div>
          <h2>
            <span class="heading-icon blue">♧</span>
            ${esc(title)}
          </h2>
          <p>${esc(subtitle)}</p>
        </div>
      </div>
      ${html}
    `;
  }

  function itemForLoan(loan) {
    return state.items.find(
      row => row.id === loan.request_item_id
    ) || null;
  }

  function requestForLoan(loan) {
    const item = itemForLoan(loan);

    return item
      ? state.requests.find(row => row.id === item.request_id) || null
      : null;
  }

  function resourceForLoan(loan) {
    const item = itemForLoan(loan);

    return item
      ? state.resources.get(item.resource_id) || null
      : null;
  }

  function outstanding(loan) {
    return Math.max(
      0,
      num(loan.quantity_borrowed) -
      num(loan.quantity_returned)
    );
  }

  function returned(loan) {
    const s = String(loan.return_status || "")
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    return (
      (num(loan.quantity_borrowed) > 0 &&
        outstanding(loan) === 0) ||
      !!loan.returned_at ||
      [
        "returned",
        "fully_returned",
        "complete",
        "completed",
        "closed"
      ].includes(s)
    );
  }

  function renderClearances() {
    panel(
      $(".left-column > .section-panel:first-child"),
      "Academic & Lab Clearances",
      "Clearance records are not connected to your current CampusShare database.",
      `
        <div class="profile-live-empty">
          <strong>No verified clearance records available</strong>
          Your current database has no certificate or lab-clearance table.
          This page cannot confirm electrical, laser, CNC, hazardous-material
          or other lab permissions. Contact your campus administrator for
          official verification.
        </div>
      `
    );
  }

  function renderBorrowing() {
    const box = $(".account-panel");

    const active = state.loans.filter(
      row => !returned(row) && outstanding(row) > 0
    );

    const closed = state.loans.filter(returned);

    const activeUnits = active.reduce(
      (sum, row) => sum + outstanding(row),
      0
    );

    const returnedUnits = closed.reduce(
      (sum, row) => sum + num(row.quantity_returned),
      0
    );

    const openRequests = state.requests.filter(row =>
      ![
        "rejected",
        "declined",
        "cancelled",
        "canceled",
        "completed",
        "closed"
      ].includes(String(row.status || "").toLowerCase())
    );

    const cards = `
      <div class="profile-live-grid">

        <div class="profile-live-stat">
          <small>Active borrow records</small>
          <strong>${active.length}</strong>
          <p>Records with a quantity outstanding</p>
        </div>

        <div class="profile-live-stat">
          <small>Units currently in custody</small>
          <strong>${activeUnits}</strong>
          <p>Borrowed quantity minus returned quantity</p>
        </div>

        <div class="profile-live-stat">
          <small>Returned units</small>
          <strong>${returnedUnits}</strong>
          <p>Recorded returned quantity</p>
        </div>

      </div>

      <div class="profile-live-note">
        ${openRequests.length} request record(s) are not marked rejected,
        cancelled or completed. The database does not store loan limits,
        account strikes or extension allowances, so these are not shown.
      </div>
    `;

    const loans = active.slice(0, 6).map(row => {
      const resource = resourceForLoan(row);

      const rawImage =
        resource?.image_url ||
        state.images.get(resource?.id) ||
        "";

      let image = `
        <span class="profile-live-placeholder">▣</span>
      `;

      try {
        const url = new URL(rawImage, location.href);

        if (
          rawImage &&
          ["http:", "https:"].includes(url.protocol)
        ) {
          image = `
            <img src="${esc(url.href)}"
              alt="${esc(resource?.name || "Equipment")}"
              loading="lazy">
          `;
        }
      } catch (_) {
        // Use the no-photo placeholder.
      }

      const due =
        row.due_date ||
        requestForLoan(row)?.due_date;

      return `
        <div class="profile-live-row">
          ${image}

          <div>
            <strong>
              ${esc(resource?.name || "Equipment details unavailable")}
            </strong>

            <small>
              ${esc(resource?.location || "Location not recorded")}
            </small>

            <small>
              ${outstanding(row)} unit(s) outstanding
              · Due: ${esc(fmt(due, true))}
            </small>
          </div>
        </div>
      `;
    }).join("");

    panel(
      box,
      "Borrowing Account Summary",
      "Calculated from your actual booking and borrowing records.",
      cards + `
        <div class="profile-live-list">
          ${loans || `
            <div class="profile-live-empty">
              <strong>No active borrowed equipment</strong>
              You currently have no outstanding borrowed quantities
              recorded in CampusShare.
            </div>
          `}
        </div>
      `
    );
  }

  function renderNotifications() {
    const box = $(".notification-panel");

    const notices = state.notifications.map(row => `
      <div class="profile-live-notice ${row.is_read ? "" : "unread"}">
        <span class="dot"></span>

        <div>
          <strong>
            ${esc(row.title || "CampusShare notification")}
          </strong>

          <p>${esc(row.message || "")}</p>

          <small>
            ${esc(row.type || "Notification")}
            · ${esc(fmt(row.created_at, true))}
            · ${row.is_read ? "Read" : "Unread"}
          </small>
        </div>
      </div>
    `).join("");

    panel(
      box,
      "Your Notifications",
      "Messages recorded for your signed-in account.",
      `
        <div class="profile-live-note">
          Account email:
          <strong>${esc(email() || "Not available")}</strong>
          <br>
          The database stores notification messages and read status,
          but does not store per-channel email, SMS or bulletin preferences.
        </div>

        <div class="profile-live-list">
          ${
            state.notificationError
              ? `
                <div class="profile-live-empty">
                  <strong>Notifications could not be loaded</strong>
                  ${esc(state.notificationError)}
                </div>
              `
              : notices || `
                <div class="profile-live-empty">
                  <strong>No notifications</strong>
                  There are no notification records for your account yet.
                </div>
              `
          }
        </div>
      `
    );
  }

  function renderSecurity() {
    const box = $(".security-panel");

    const providers = state.user?.app_metadata?.providers;

    const provider =
      Array.isArray(providers) && providers.length
        ? providers.join(", ")
        : state.user?.app_metadata?.provider || "Not provided";

    const verified = Boolean(
      state.user?.email_confirmed_at ||
      state.user?.confirmed_at
    );

    panel(
      box,
      "Security & Authentication",
      "Information returned by your active Supabase authentication session.",
      `
        <div class="profile-live-kv">

          <div>
            <small>Signed-in email</small>
            <strong>${esc(email() || "Not available")}</strong>
          </div>

          <div>
            <small>CampusShare role</small>
            <strong>${esc(role())}</strong>
          </div>

          <div>
            <small>Email verification</small>
            <strong>${verified ? "Verified" : "Not confirmed"}</strong>
          </div>

          <div>
            <small>Sign-in provider</small>
            <strong>${esc(provider)}</strong>
          </div>

          <div class="full">
            <small>Account ID</small>
            <strong>${esc(state.user?.id || "Not available")}</strong>
          </div>

          <div>
            <small>Account created</small>
            <strong>${esc(fmt(state.user?.created_at || state.profile?.created_at, true))}</strong>
          </div>

          <div>
            <small>Authentication state</small>
            <strong>Signed in</strong>
          </div>

        </div>

        <div class="profile-live-note">
          The current project does not contain a list of active device
          sessions, university SSO identity details or a device-revocation
          service. This page cannot display or revoke other workstation sessions.
        </div>

        <div class="profile-live-actions">
          <button type="button" id="profileChangePassword">
            Change password
          </button>

          <button type="button" class="danger" id="profileSignOut">
            Sign out
          </button>
        </div>
      `
    );

    $("#profileChangePassword")?.addEventListener(
      "click",
      openPasswordForm
    );

    $("#profileSignOut")?.addEventListener(
      "click",
      signOut
    );
  }

  function renderActivity() {
    const right = $(".right-column");

    if (!right) return;

    const section = document.createElement("section");
    section.className = "panel section-panel";

    const rows = state.activity.map(row => {
      let details = row.details;

      if (details && typeof details === "object") {
        details =
          details.message ||
          details.description ||
          JSON.stringify(details);
      }

      return `
        <div class="profile-live-notice">
          <span class="dot"></span>

          <div>
            <strong>
              ${esc(String(row.action || "Account activity")
                .replace(/[_-]+/g, " "))}
            </strong>

            <p>${esc(details || "No additional details recorded.")}</p>

            <small>${esc(fmt(row.created_at, true))}</small>
          </div>
        </div>
      `;
    }).join("");

    section.innerHTML = `
      <div class="section-heading">
        <div>
          <h2>
            <span class="heading-icon blue">◷</span>
            Recent Account Activity
          </h2>

          <p>Activity log entries linked to your user ID.</p>
        </div>
      </div>

      ${
        state.activityError
          ? `
            <div class="profile-live-empty">
              <strong>Activity could not be loaded</strong>
              ${esc(state.activityError)}
            </div>
          `
          : rows || `
            <div class="profile-live-empty">
              <strong>No activity recorded</strong>
              No activity log entries are available for your account.
            </div>
          `
      }
    `;

    right.append(section);
  }

  function openModal(title, body, action = null, label = "Save changes") {
    modalTitle.textContent = title;
    modalBody.innerHTML = body;
    state.action = action;
    modalSave.textContent = label;
    modalSave.hidden = !action;
    modal.hidden = false;

    $("input:not([disabled])", modalBody)?.focus();
  }

  function closeModal() {
    modal.hidden = true;
    modalBody.innerHTML = "";
    state.action = null;
  }

  function editProfile() {
    openModal(
      "Edit profile information",
      `
        <form class="profile-live-form" id="profileForm">

          <label class="full">
            Full name
            <input id="editFullName"
              maxlength="120"
              required
              value="${esc(name())}">
          </label>

          <label class="full">
            Email address
            <input disabled value="${esc(email())}">
          </label>

          <label>
            Department
            <input id="editDepartment"
              maxlength="160"
              value="${esc(department())}">
          </label>

          <label>
            Student ID
            <input disabled
              value="${esc(campusId() || "Not provided")}">
          </label>

          <label class="full">
            Cohort / semester
            <input disabled
              value="${esc(cohort() || "Not provided")}">
          </label>

        </form>

        <p class="profile-live-small">
          Only full name and department can be edited here.
          Email, student ID and cohort are not changed.
        </p>
      `,
      async () => {
        const form = $("#profileForm", modalBody);

        if (!form.reportValidity()) return false;

        const fullName =
          $("#editFullName", form).value.trim();

        const dept =
          $("#editDepartment", form).value.trim();

        if (!fullName) {
          notify("Enter your full name.", true);
          return false;
        }

        const { error } = await state.client
          .from("profiles")
          .update({
            full_name: fullName,
            department: dept
          })
          .eq("id", state.user.id);

        if (error) {
          throw new Error(`Profile update failed: ${error.message}`);
        }

        const { error: authError } =
          await state.client.auth.updateUser({
            data: {
              full_name: fullName,
              department: dept
            }
          });

        if (authError) {
          console.warn(
            "Auth metadata update:",
            authError.message
          );
        }

        state.profile.full_name = fullName;
        state.profile.department = dept;

        identity();

        notify("Your profile was updated.");

        return true;
      },
      "Save profile"
    );
  }

  function changePassword() {
    openModal(
      "Change account password",
      `
        <form class="profile-live-form" id="passwordForm">

          <label class="full">
            New password
            <input id="newPassword"
              type="password"
              minlength="8"
              autocomplete="new-password"
              required>
          </label>

          <label class="full">
            Confirm new password
            <input id="confirmPassword"
              type="password"
              minlength="8"
              autocomplete="new-password"
              required>
          </label>

        </form>

        <p class="profile-live-small">
          The new password is updated through your active Supabase
          authentication session. Do not share it.
        </p>
      `,
      async () => {
        const form = $("#passwordForm", modalBody);

        if (!form.reportValidity()) return false;

        const pass = $("#newPassword", form).value;
        const confirm = $("#confirmPassword", form).value;

        if (pass.length < 8) {
          notify("Use at least 8 characters.", true);
          return false;
        }

        if (pass !== confirm) {
          notify("Passwords do not match.", true);
          return false;
        }

        const { error } = await state.client.auth.updateUser({
          password: pass
        });

        if (error) {
          throw new Error(`Password update failed: ${error.message}`);
        }

        notify("Your password was updated successfully.");

        return true;
      },
      "Update password"
    );
  }

  function openPasswordForm() {
    changePassword();
  }

  async function signOut() {
    if (!confirm("Sign out of this CampusShare session?")) return;

    const { error } = await state.client.auth.signOut();

    if (error) {
      notify(`Sign out failed: ${error.message}`, true);
      return;
    }

    if (window.parent !== window) {
      window.parent.postMessage({
        source: "campusshare-page",
        type: "logout"
      }, "*");
    } else {
      window.location.href = "../login/index.html";
    }
  }

  function setupEvents() {
    $("#editProfileBtn")?.addEventListener(
      "click",
      editProfile
    );

    $("#userMenuBtn")?.addEventListener("click", () => {
      notify(`Signed in as ${email() || name()}`);
    });

    $(".notification-icon")?.addEventListener("click", () => {
      const unread = state.notifications.filter(
        row => !row.is_read
      ).length;

      notify(
        unread
          ? `${unread} unread notification(s).`
          : "No unread notifications."
      );
    });

    $("#switchViewBtn")?.addEventListener("click", () => {
      notify("Open the equipment owner portal from the main portal switcher.");
    });

    $("#labManagerBtn")?.addEventListener("click", () => {
      notify("Open the equipment owner portal from the main portal switcher.");
    });

    $("#closeModalBtn")?.addEventListener(
      "click",
      closeModal
    );

    $("#modalCancelBtn")?.addEventListener(
      "click",
      closeModal
    );

    modal?.addEventListener("click", e => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && modal && !modal.hidden) {
        closeModal();
      }
    });

    modalSave?.addEventListener("click", async () => {
      if (!state.action) return;

      modalSave.disabled = true;

      try {
        const result = await state.action();

        if (result !== false) closeModal();

      } catch (error) {
        console.error(error);

        notify(
          error.message || "Could not save change.",
          true
        );

      } finally {
        modalSave.disabled = false;
      }
    });
  }

  async function load() {
    const {
      data: auth,
      error: authError
    } = await state.client.auth.getUser();

    if (authError) throw authError;

    if (!auth?.user) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    state.user = auth.user;

    const {
      data: profile,
      error: profileError
    } = await state.client
      .from("profiles")
      .select("id, full_name, email, department, role, created_at")
      .eq("id", state.user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(`Could not load profile: ${profileError.message}`);
    }

    state.profile = profile || null;

    identity();

    const {
      data: requests,
      error: requestError
    } = await state.client
      .from("booking_requests")
      .select("*")
      .eq("student_id", state.user.id);

    if (requestError) {
      throw new Error(`Could not load requests: ${requestError.message}`);
    }

    state.requests = requests || [];

    const requestIds = state.requests
      .map(row => row.id)
      .filter(Boolean);

    state.items = [];
    state.loans = [];
    state.resources = new Map();
    state.categories = new Map();
    state.images = new Map();

    if (requestIds.length) {
      const {
        data: items,
        error: itemError
      } = await state.client
        .from("booking_request_items")
        .select("*")
        .in("request_id", requestIds);

      if (itemError) {
        throw new Error(`Could not load request items: ${itemError.message}`);
      }

      state.items = items || [];

      const itemIds = state.items
        .map(row => row.id)
        .filter(Boolean);

      if (itemIds.length) {
        const {
          data: loans,
          error: loanError
        } = await state.client
          .from("borrow_records")
          .select("*")
          .in("request_item_id", itemIds);

        if (loanError) {
          throw new Error(`Could not load borrowing records: ${loanError.message}`);
        }

        state.loans = loans || [];
      }
    }

    const resourceIds = [
      ...new Set(
        state.items
          .map(row => row.resource_id)
          .filter(Boolean)
      )
    ];

    if (resourceIds.length) {
      const {
        data: resources,
        error: resourceError
      } = await state.client
        .from("resources")
        .select("*")
        .in("id", resourceIds);

      if (resourceError) {
        throw new Error(`Could not load equipment: ${resourceError.message}`);
      }

      (resources || []).forEach(row => {
        state.resources.set(row.id, row);
      });

      const categoryIds = [
        ...new Set(
          (resources || [])
            .map(row => row.category_id)
            .filter(Boolean)
        )
      ];

      if (categoryIds.length) {
        const {
          data: categories,
          error
        } = await state.client
          .from("categories")
          .select("id, category_name")
          .in("id", categoryIds);

        if (error) {
          console.warn("Categories:", error.message);
        }

        (categories || []).forEach(row => {
          state.categories.set(row.id, row.category_name);
        });
      }

      const {
        data: images,
        error: imageError
      } = await state.client
        .from("resource_images")
        .select("resource_id, image_url, created_at")
        .in("resource_id", resourceIds)
        .order("created_at", { ascending: false });

      if (imageError) {
        console.warn("Images:", imageError.message);
      }

      (images || []).forEach(row => {
        if (!state.images.has(row.resource_id)) {
          state.images.set(row.resource_id, row.image_url);
        }
      });
    }

    const {
      data: notifications,
      error: notificationError
    } = await state.client
      .from("notifications")
      .select("id, user_id, title, message, type, is_read, created_at")
      .eq("user_id", state.user.id)
      .order("created_at", { ascending: false })
      .limit(15);

    state.notifications = notificationError
      ? []
      : (notifications || []);

    state.notificationError =
      notificationError?.message || "";

    const {
      data: activity,
      error: activityError
    } = await state.client
      .from("activity_logs")
      .select("id, user_id, action, details, created_at")
      .eq("user_id", state.user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    state.activity = activityError
      ? []
      : (activity || []);

    state.activityError =
      activityError?.message || "";
  }

  function init() {
    css();
    setupEvents();

    const heading = $(".identity-copy .name-line h1");

    if (heading) {
      heading.textContent = "Loading your profile…";
    }

    (async () => {
      try {
        for (let i = 0; i < 120; i++) {
          if (
            window.supabaseClient?.auth &&
            typeof window.supabaseClient.from === "function"
          ) {
            state.client = window.supabaseClient;
            break;
          }

          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (!state.client) {
          throw new Error(
            "Supabase did not initialize. Check the script tags in profile/index.html."
          );
        }

        await load();

        renderClearances();
        renderBorrowing();
        renderNotifications();
        renderSecurity();
        renderActivity();

      } catch (error) {
        console.error("Profile page failed:", error);

        if (heading) {
          heading.textContent = "Profile could not be loaded";
        }

        const left = $(".left-column");

        if (left) {
          const message = document.createElement("div");

          message.className = "profile-live-empty";

          message.innerHTML = `
            <strong>Unable to load account data</strong>
            ${esc(error.message || "Please sign in again.")}
          `;

          left.prepend(message);
        }

        notify(
          error.message || "Could not load your profile.",
          true
        );
      }
    })();
  }

  init();

})();
