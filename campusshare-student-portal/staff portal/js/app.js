(() => {
  "use strict";

  /*
   * CampusShare Staff Portal
   * Shared layout and Supabase-backed data for all staff pages.
   * Tables used:
   * profiles, categories, resources, booking_requests,
   * booking_request_items, borrow_records, activity_logs.
   */

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const db = () => window.supabaseClient;
  const page = () => decodeURIComponent(location.pathname.split("/").pop() || "").toLowerCase();

  const state = {
    user: null,
    profile: null,
    equipment: [],
    categories: [],
    requests: [],
    history: [],
    selectedImage: null,
    editingEquipmentId: null,
    requestFilter: "all",
    requestSearch: "",
    errors: {}
  };

  // Same SVG logo used in the Student Portal.
  const logoMarkup = `
    <span class="cs-brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M4.5 8.5h15v11h-15z"
          stroke="currentColor" stroke-width="1.8"
          stroke-linejoin="round"/>
        <path d="M8 8.5V6.7A2.7 2.7 0 0 1 10.7 4h2.6A2.7 2.7 0 0 1 16 6.7v1.8"
          stroke="currentColor" stroke-width="1.8"
          stroke-linecap="round"/>
        <path d="M9 13h6"
          stroke="currentColor" stroke-width="1.8"
          stroke-linecap="round"/>
      </svg>
    </span>
    <span>Campus<span class="cs-brand-light">Share</span></span>
  `;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

  const norm = value =>
    String(value || "pending")
      .toLowerCase()
      .replace(/[ _]+/g, "-");

  function toast(message) {
    let element =
      $("#appToast") ||
      $("#toast-notification") ||
      $("#toastNotification");

    if (!element) {
      element = document.createElement("div");
      element.id = "appToast";
      document.body.append(element);
    }

    element.className =
      "fixed bottom-6 right-6 z-[99999] rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl";

    element.textContent = message;
    element.hidden = false;

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
      element.hidden = true;
    }, 3500);
  }

  window.showToast = toast;

  function dateText(value, includeTime = true) {
    if (!value) return "Not specified";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString(
      [],
      includeTime
        ? { dateStyle: "medium", timeStyle: "short" }
        : { dateStyle: "medium" }
    );
  }

  function durationText(start, end) {
    if (!start || !end) return "Not returned";

    const minutes = Math.max(
      0,
      Math.floor((new Date(end) - new Date(start)) / 60000)
    );

    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  function setText(selector, value) {
    const element = $(selector);

    if (element) {
      element.textContent = String(value ?? "");
    }
  }

  // ============================================================
  // COMMON STAFF PORTAL THEME
  // ============================================================

  function installStyles() {
    if ($("#campusshare-staff-theme")) return;

    const style = document.createElement("style");
    style.id = "campusshare-staff-theme";

    style.textContent = `
      :root {
        --cs-navy: #213145;
        --cs-teal: #00685f;
        --cs-bg: #f6f8fc;
        --cs-ink: #0b1c30;
        --cs-muted: #58657b;
        --cs-line: #e5eaf2;
      }

      body {
        margin: 0;
        background: var(--cs-bg);
        color: var(--cs-ink);
        font-family: Inter, Arial, sans-serif;
      }

      .cs-sidebar {
        position: fixed;
        inset: 0 auto 0 0;
        width: 270px;
        background: var(--cs-navy);
        color: #fff;
        z-index: 50;
        display: flex;
        flex-direction: column;
        box-shadow: 0 1px 8px #0002;
      }

      .cs-brand {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #fff;
        text-decoration: none;
        font-size: 21px;
        font-weight: 800;
        letter-spacing: -.7px;
        padding: 22px 18px 12px;
      }

      .cs-brand-mark {
        width: 32px;
        height: 32px;
        flex: 0 0 32px;
        display: grid;
        place-items: center;
        background: #102b57;
        border-radius: 9px;
        color: #fff;
      }

      .cs-brand-mark svg {
        width: 22px;
        height: 22px;
      }

      .cs-brand-light {
        font-weight: 600;
      }

      .cs-sidebar-tag {
        margin: 0 18px 20px;
        padding: 6px 9px;
        border-radius: 5px;
        background: #ffffff18;
        color: #89f5e7;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .08em;
        text-transform: uppercase;
        width: max-content;
      }

      .cs-nav {
        padding: 0 12px;
        display: grid;
        gap: 5px;
      }

      .cs-nav-label {
        padding: 10px 9px 7px;
        color: #aebbc7;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .09em;
        text-transform: uppercase;
      }

      .cs-nav a {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 13px 14px;
        border-radius: 9px;
        color: #c4d0d9;
        text-decoration: none;
        font-size: 14px;
        font-weight: 600;
      }

      .cs-nav a:hover {
        background: #ffffff12;
        color: white;
      }

      .cs-nav a.active {
        background: #008378;
        color: white;
      }

      .cs-nav .material-symbols-outlined {
        font-size: 21px;
      }

      .cs-sidebar-footer {
        margin-top: auto;
        border-top: 1px solid #ffffff20;
        padding: 17px 18px;
        color: #aebbc7;
        font-size: 12px;
      }

      .cs-shell {
        margin-left: 270px;
        min-height: 100vh;
      }

      .cs-header {
        position: fixed;
        z-index: 40;
        top: 0;
        left: 270px;
        right: 0;
        min-height: 70px;
        padding: 12px 26px;
        background: #ffffffed;
        backdrop-filter: blur(14px);
        box-shadow: 0 1px 8px #0000000a;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .cs-crumb {
        font-size: 14px;
        color: #58657b;
      }

      .cs-crumb strong {
        color: #0b1c30;
      }

      .cs-profile {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }

      .cs-avatar {
        height: 38px;
        width: 38px;
        flex: 0 0 38px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: #89f5e7;
        color: #00685f;
        font-weight: 800;
      }

      .cs-profile-copy {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .cs-profile-copy strong,
      .cs-profile-copy span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .cs-profile-copy strong {
        font-size: 13px;
      }

      .cs-profile-copy span {
        font-size: 11px;
        color: #58657b;
        margin-top: 2px;
      }

      #staffLogoutButton {
        border: 1px solid #bcc9c6;
        background: #fff;
        color: #213145;
        padding: 9px 14px;
        border-radius: 9px;
        font: 600 13px Inter, sans-serif;
        cursor: pointer;
        white-space: nowrap;
      }

      #staffLogoutButton:hover {
        background: #eff4ff;
      }

      #staffLogoutButton:disabled {
        opacity: .6;
        cursor: wait;
      }

      .cs-main {
        padding: 96px 26px 42px;
        max-width: 1800px;
        margin: 0 auto;
      }

      .cs-hero {
        background: #fff;
        border: 1px solid var(--cs-line);
        border-radius: 18px;
        padding: 25px 28px;
        margin-bottom: 22px;
        box-shadow: 0 1px 2px #0b1c3008;
      }

      .cs-kicker {
        font-size: 11px;
        letter-spacing: .09em;
        text-transform: uppercase;
        font-weight: 700;
        color: var(--cs-teal);
      }

      .cs-title {
        font-size: 28px;
        line-height: 1.2;
        font-weight: 750;
        letter-spacing: -.7px;
        margin: 8px 0 7px;
      }

      .cs-subtitle {
        font-size: 14px;
        line-height: 1.55;
        color: var(--cs-muted);
        margin: 0;
      }

      .cs-grid {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 14px;
        margin-bottom: 22px;
      }

      .cs-grid-4 {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
        margin-bottom: 22px;
      }

      .cs-card {
        background: #fff;
        border: 1px solid var(--cs-line);
        border-radius: 14px;
        padding: 17px;
        box-shadow: 0 1px 2px #0b1c3008;
        min-width: 0;
      }

      .cs-card-label {
        font-size: 11px;
        letter-spacing: .07em;
        text-transform: uppercase;
        font-weight: 700;
        color: var(--cs-muted);
      }

      .cs-card-value {
        font-size: 29px;
        font-weight: 750;
        letter-spacing: -.8px;
        margin-top: 11px;
        color: var(--cs-ink);
      }

      .cs-card-note {
        font-size: 12px;
        color: var(--cs-muted);
        margin-top: 5px;
      }

      .cs-panel {
        background: #fff;
        border: 1px solid var(--cs-line);
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 1px 2px #0b1c3008;
        margin-bottom: 18px;
      }

      .cs-panel-title {
        font-size: 18px;
        font-weight: 700;
        margin: 0;
      }

      .cs-muted {
        color: var(--cs-muted);
      }

      .cs-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        border-radius: 9px;
        padding: 9px 13px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        border: 1px solid transparent;
      }

      .cs-btn-primary {
        background: var(--cs-teal);
        color: #fff;
      }

      .cs-btn-primary:hover {
        background: #008378;
      }

      .cs-btn-light {
        background: #fff;
        color: var(--cs-ink);
        border-color: #bcc9c6;
      }

      .cs-btn-danger {
        background: #ffdad6;
        color: #93000a;
      }

      .cs-input,
      .cs-select {
        min-height: 42px;
        width: 100%;
        border: 1px solid #cbd5e1;
        border-radius: 9px;
        padding: 9px 12px;
        background: #f8faff;
        color: #0b1c30;
        font: 400 14px Inter, sans-serif;
      }

      .cs-input:focus,
      .cs-select:focus {
        outline: 2px solid #89f5e7;
        border-color: #00685f;
      }

      .cs-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }

      .cs-status {
        display: inline-flex;
        align-items: center;
        padding: 5px 10px;
        border-radius: 99px;
        background: #eff4ff;
        color: #213145;
        font-size: 11px;
        font-weight: 700;
      }

      .cs-list {
        display: grid;
        gap: 10px;
      }

      .cs-item {
        background: #fff;
        border: 1px solid var(--cs-line);
        border-radius: 12px;
        padding: 15px;
      }

      .cs-empty {
        border: 1px dashed #bcc9c6;
        border-radius: 12px;
        padding: 32px 18px;
        text-align: center;
        color: var(--cs-muted);
        font-size: 13px;
        background: #fbfcff;
      }

      .cs-error {
        padding: 12px 14px;
        border-radius: 10px;
        background: #fff4e5;
        color: #704214;
        font-size: 13px;
        margin: 10px 0;
      }

      .cs-table-wrap {
        overflow-x: auto;
      }

      .cs-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }

      .cs-table th {
        text-align: left;
        padding: 12px;
        background: #eff4ff;
        color: #58657b;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: .05em;
      }

      .cs-table td {
        padding: 13px 12px;
        border-bottom: 1px solid #e5eaf2;
        vertical-align: top;
      }

      .cs-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        margin: 14px 0;
      }

      .cs-tab {
        padding: 8px 11px;
        border: 1px solid #d5dde8;
        background: #fff;
        color: #58657b;
        border-radius: 9px;
        font-size: 12px;
        font-weight: 650;
      }

      .cs-tab.active {
        background: #00685f;
        border-color: #00685f;
        color: #fff;
      }

      .cs-two-col {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }

      .cs-form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .cs-label {
        display: block;
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 6px;
      }

      .cs-equipment-img {
        width: 100%;
        height: 155px;
        object-fit: cover;
        background: #eff4ff;
        border-radius: 9px;
      }

      #addEquipmentModal {
        z-index: 1000;
      }

      #addEquipmentModal.hidden {
        display: none !important;
      }

      #addEquipmentModal:not(.hidden) {
        display: flex !important;
      }

      #addEquipmentModal .cs-extra-field {
        display: grid;
        gap: 6px;
        margin-top: 14px;
      }

      #addEquipmentModal .cs-extra-field label {
        font-size: 12px;
        font-weight: 700;
      }

      #addEquipmentModal .cs-extra-field input,
      #addEquipmentModal .cs-extra-field select {
        width: 100%;
        height: 42px;
        border: 1px solid #bcc9c6;
        border-radius: 8px;
        padding: 8px 10px;
        background: #f8faff;
      }

      @media (max-width: 1250px) {
        .cs-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }

      @media (max-width: 850px) {
        .cs-sidebar {
          width: 220px;
        }

        .cs-shell {
          margin-left: 220px;
        }

        .cs-header {
          left: 220px;
        }

        .cs-grid,
        .cs-grid-4 {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 620px) {
        .cs-sidebar {
          position: relative;
          width: 100%;
          height: auto;
        }

        .cs-nav {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .cs-sidebar-footer {
          display: none;
        }

        .cs-shell {
          margin-left: 0;
        }

        .cs-header {
          position: relative;
          left: auto;
          flex-wrap: wrap;
          padding: 12px 16px;
        }

        .cs-main {
          padding: 20px 14px;
        }

        .cs-grid,
        .cs-grid-4,
        .cs-two-col,
        .cs-form-grid {
          grid-template-columns: 1fr;
        }

        .cs-title {
          font-size: 24px;
        }

        .cs-hero {
          padding: 20px;
        }
      }
    `;

    document.head.append(style);
  }

  // ============================================================
  // NAVIGATION AND LOGOUT
  // ============================================================

  function postToParent(type, extra = {}) {
    if (window.parent !== window) {
      window.parent.postMessage(
        { source: "campusshare-page", type, ...extra },
        window.location.origin
      );
      return true;
    }

    return false;
  }

  async function logout() {
    const button = $("#staffLogoutButton");

    if (button) {
      button.disabled = true;
      button.textContent = "Signing out…";
    }

    try {
      const { error } = await db().auth.signOut();

      if (error) throw error;

      if (!postToParent("staff-logout")) {
        location.href = "../index.html";
      }

    } catch (error) {
      console.error("Staff logout failed:", error);

      toast(error.message || "Could not log out.");

      if (button) {
        button.disabled = false;
        button.textContent = "Log out";
      }
    }
  }

  function renderShell() {
    const current = page();

    const active =
      current === "equipment.html" ? "equipment" :
      current === "requests.html" ? "requests" :
      current === "calendar.html" ? "calendar" :
      current === "history.html" ? "history" :
      "dashboard";

    const aside = $("aside");

    if (aside) {
      aside.className = "cs-sidebar";

      aside.innerHTML = `
        <a class="cs-brand" href="dashboard.html" aria-label="CampusShare home">
          ${logoMarkup}
        </a>

        <div class="cs-sidebar-tag">Staff Portal</div>

        <nav class="cs-nav" aria-label="Staff navigation">

          <div class="cs-nav-label">Main Menu</div>

          <a href="dashboard.html" class="${active === "dashboard" ? "active" : ""}">
            <span class="material-symbols-outlined">grid_view</span>
            Dashboard
          </a>

          <a href="equipment.html" class="${active === "equipment" ? "active" : ""}">
            <span class="material-symbols-outlined">inventory_2</span>
            My Equipment
          </a>

          <a href="requests.html" class="${active === "requests" ? "active" : ""}">
            <span class="material-symbols-outlined">event_available</span>
            Booking Requests
          </a>

          <a href="calendar.html" class="${active === "calendar" ? "active" : ""}">
            <span class="material-symbols-outlined">calendar_month</span>
            Calendar
          </a>

          <a href="history.html" class="${active === "history" ? "active" : ""}">
            <span class="material-symbols-outlined">history</span>
            Equipment History
          </a>

        </nav>

        <div class="cs-sidebar-footer">
          CampusShare · Staff Workspace
        </div>
      `;
    }

    const header = $("header");

    if (header) {
      const title =
        active === "equipment" ? "My Equipment" :
        active === "requests" ? "Booking Requests" :
        active === "calendar" ? "Calendar" :
        active === "history" ? "Equipment History" :
        "Staff Dashboard";

      header.className = "cs-header";

      header.innerHTML = `
        <div class="cs-crumb">
          CampusShare <span class="mx-2">/</span>
          <strong>${title}</strong>
        </div>

        <div class="cs-row" style="justify-content:flex-end;flex-wrap:nowrap">

          <div class="cs-profile">
            <span class="cs-avatar" id="staffProfileInitial">—</span>

            <span class="cs-profile-copy">
              <strong id="staffDisplayName">Loading profile…</strong>
              <span id="staffDepartment">Loading department…</span>
              <span id="staffEmail"></span>
            </span>
          </div>

          <button id="staffLogoutButton" type="button">
            Log out
          </button>

        </div>
      `;

      $("#staffLogoutButton")?.addEventListener("click", logout);
    }

    const shell = $(".pl-72") || $("body > div");

    if (shell) {
      shell.className = "cs-shell";
    }

    const main = $("main");

    if (main) {
      main.className = "cs-main";
    }

    return main;
  }

  // ============================================================
  // STAFF AUTHENTICATION AND PROFILE
  // ============================================================

  async function authenticateStaff() {
    if (!db()) {
      throw new Error(
        "Supabase is not initialized. Check the Supabase script order."
      );
    }

    const { data, error } = await db().auth.getUser();

    if (error) throw error;

    if (!data?.user) {
      postToParent("navigate", { route: "login" });

      if (window.parent === window) {
        location.href = "../index.html";
      }

      throw new Error(
        "Your session has expired. Please sign in again."
      );
    }

    state.user = data.user;

    // Temporary values from authenticated metadata while profile loads.
    const metadata = state.user.user_metadata || {};

    state.profile = {
      id: state.user.id,
      full_name:
        metadata.full_name ||
        metadata.name ||
        state.user.email ||
        "Staff member",
      email: state.user.email || "",
      department: metadata.department || "Department not provided",
      role: state.user.app_metadata?.role || ""
    };

    renderProfile();

    const {
      data: profile,
      error: profileError
    } = await db()
      .from("profiles")
      .select("id, full_name, email, department, role")
      .eq("id", state.user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(
        `Could not load your staff profile: ${profileError.message}`
      );
    }

    if (!profile) {
      throw new Error("Your CampusShare profile was not found.");
    }

    const role = String(profile.role || "").toLowerCase();

    if (!["owner", "admin"].includes(role)) {
      await db().auth.signOut();
      postToParent("staff-logout");

      throw new Error(
        "This account does not have approved staff access."
      );
    }

    state.profile = profile;
    renderProfile();
  }

  function renderProfile() {
    const name =
      state.profile?.full_name ||
      state.user?.email ||
      "Staff member";

    const email =
      state.profile?.email ||
      state.user?.email ||
      "";

    const department =
      state.profile?.department ||
      "Department not provided";

    const initials = name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0])
      .join("")
      .toUpperCase() || "S";

    setText("#staffDisplayName", name);
    setText("#staffDepartment", department);
    setText("#staffEmail", email);
    setText("#staffProfileInitial", initials);
  }

  // ============================================================
  // LOAD CATEGORIES AND EQUIPMENT
  // ============================================================

  async function loadCategories() {
    const { data, error } = await db()
      .from("categories")
      .select("id, category_name")
      .order("category_name", { ascending: true });

    if (error) throw error;

    state.categories = data || [];
  }

  async function loadEquipment() {
    const { data, error } = await db()
      .from("resources")
      .select(
        "id, name, description, category_id, total_quantity, available_quantity, owner_id, condition, status, created_at, location, image_url"
      )
      .eq("owner_id", state.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const categoryMap = new Map(
      state.categories.map(row => [row.id, row.category_name])
    );

    state.equipment = (data || []).map(row => ({
      id: row.id,
      name: row.name || "Unnamed equipment",
      description: row.description || "",
      categoryId: row.category_id || "",
      category: categoryMap.get(row.category_id) || "Uncategorized",
      total: Number(row.total_quantity || 0),
      available: Number(row.available_quantity || 0),
      ownerId: row.owner_id,
      condition: row.condition || "Not specified",
      status: row.status || "available",
      location: row.location || "",
      image: row.image_url || ""
    }));
  }

  // ============================================================
  // LOAD BOOKING REQUESTS
  // ============================================================

  function displayStatus(value) {
    const key = norm(value);

    if (["approved", "ready"].includes(key)) return "approved";

    if (["rejected", "declined", "cancelled"].includes(key)) {
      return "rejected";
    }

    if (["waitlist", "waitlisted"].includes(key)) {
      return "waitlist";
    }

    if (["borrowed", "issued", "in-use"].includes(key)) {
      return "borrowed";
    }

    if (["returned", "completed"].includes(key)) {
      return "returned";
    }

    return "pending";
  }

  async function loadRequests() {
    state.requests = [];
    state.errors.students = null;

    const ids = state.equipment
      .map(item => item.id)
      .filter(Boolean);

    if (!ids.length) return;

    const {
      data: items,
      error: itemError
    } = await db()
      .from("booking_request_items")
      .select(
        "id, request_id, resource_id, requested_quantity, approved_quantity, item_status"
      )
      .in("resource_id", ids);

    if (itemError) throw itemError;

    if (!items?.length) return;

    const requestIds = [
      ...new Set(
        items.map(item => item.request_id).filter(Boolean)
      )
    ];

    const [
      bookingResult,
      resourceResult
    ] = await Promise.all([
      db()
        .from("booking_requests")
        .select(
          "id, student_id, request_date, start_date, due_date, status, created_at"
        )
        .in("id", requestIds),

      db()
        .from("resources")
        .select("id, name, owner_id")
        .in("id", ids)
        .eq("owner_id", state.user.id)
    ]);

    if (bookingResult.error) throw bookingResult.error;
    if (resourceResult.error) throw resourceResult.error;

    const bookingMap = new Map(
      (bookingResult.data || []).map(row => [row.id, row])
    );

    const resourceMap = new Map(
      (resourceResult.data || []).map(row => [row.id, row])
    );

    const studentIds = [
      ...new Set(
        (bookingResult.data || [])
          .map(row => row.student_id)
          .filter(Boolean)
      )
    ];

    let students = new Map();

    if (studentIds.length) {
      const profileResult = await db()
        .from("profiles")
        .select("id, full_name, email, department")
        .in("id", studentIds);

      if (profileResult.error) {
        state.errors.students = profileResult.error.message;
      } else {
        students = new Map(
          (profileResult.data || []).map(row => [row.id, row])
        );
      }
    }

    state.requests = items
      .filter(item => resourceMap.has(item.resource_id))
      .map(item => {
        const booking = bookingMap.get(item.request_id) || {};
        const resource = resourceMap.get(item.resource_id) || {};
        const student = students.get(booking.student_id) || {};

        return {
          id: item.id,
          requestId: booking.id || item.request_id,
          studentId: booking.student_id || null,
          studentName:
            student.full_name ||
            "Student details restricted",
          studentEmail: student.email || "",
          studentDepartment: student.department || "",
          resourceId: item.resource_id,
          equipmentName:
            resource.name ||
            "Equipment details unavailable",
          requestedQuantity: Number(item.requested_quantity || 1),
          approvedQuantity: Number(item.approved_quantity || 0),
          startDate: booking.start_date || "",
          dueDate: booking.due_date || "",
          createdAt: booking.created_at || booking.request_date || "",
          status: displayStatus(
            item.item_status || booking.status
          ),
          rawItemStatus: item.item_status || "pending"
        };
      })
      .sort((a, b) =>
        new Date(b.createdAt || 0) -
        new Date(a.createdAt || 0)
      );
  }

  // ============================================================
  // LOAD BORROWING AND RETURN HISTORY
  // ============================================================

  async function loadHistory() {
    state.history = [];

    const itemIds = state.requests
      .map(row => row.id)
      .filter(Boolean);

    if (!itemIds.length) return;

    const { data, error } = await db()
      .from("borrow_records")
      .select(
        "id, request_item_id, quantity_borrowed, quantity_returned, borrowed_at, due_date, returned_at, return_status, handed_over_by, received_by"
      )
      .in("request_item_id", itemIds)
      .order("borrowed_at", { ascending: false });

    if (error) throw error;

    const requestMap = new Map(
      state.requests.map(row => [row.id, row])
    );

    state.history = (data || []).map(record => {
      const request =
        requestMap.get(record.request_item_id) || {};

      const returned =
        Boolean(record.returned_at) ||
        norm(record.return_status) === "returned";

      const borrowed = Number(record.quantity_borrowed || 0);
      const returnedQuantity = Number(record.quantity_returned || 0);

      return {
        id: record.id,
        requestItemId: record.request_item_id,
        requestId: request.requestId || record.request_item_id,
        resourceId: request.resourceId || null,
        equipmentName:
          request.equipmentName ||
          "Equipment details unavailable",
        studentName:
          request.studentName ||
          "Student details restricted",
        borrowedAt: record.borrowed_at,
        dueDate: record.due_date,
        returnedAt: record.returned_at,
        status: returned ? "Returned" : "Borrowed",
        quantity: borrowed,
        returnedQuantity,
        outstandingQuantity: Math.max(
          0,
          borrowed - returnedQuantity
        ),
        duration: durationText(
          record.borrowed_at,
          record.returned_at
        )
      };
    });
  }

  // ============================================================
  // ACTIVITY LOGS
  // ============================================================

  async function logActivity(action, details) {
    try {
      const { error } = await db()
        .from("activity_logs")
        .insert({
          user_id: state.user.id,
          action,
          details: details || {}
        });

      if (error) {
        console.warn(
          "Activity log not saved:",
          error.message
        );
      }
    } catch (error) {
      console.warn("Activity log not saved:", error);
    }
  }

  // ============================================================
  // REFRESH ALL LIVE DATA
  // ============================================================

  async function refreshData() {
    state.errors = {};

    try {
      await loadCategories();
    } catch (error) {
      state.errors.categories = error.message;
      console.warn(error);
    }

    try {
      await loadEquipment();
    } catch (error) {
      state.errors.equipment = error.message;
      state.equipment = [];
      console.error(error);
    }

    try {
      await loadRequests();
    } catch (error) {
      state.errors.requests = error.message;
      state.requests = [];
      console.error(error);
    }

    try {
      await loadHistory();
    } catch (error) {
      state.errors.history = error.message;
      state.history = [];
      console.error(error);
    }

    ensureEquipmentFormFields();
    renderPage();
  }

  // Automatically refresh when a student submits a request.
let bookingRefreshTimer = null;

function subscribeToBookingChanges() {
  const client = db();

  if (!client || !state.user) return;

  const scheduleRefresh = () => {
    clearTimeout(bookingRefreshTimer);

    bookingRefreshTimer = setTimeout(() => {
      refreshData().catch(error => {
        console.error("Booking refresh failed:", error);
      });
    }, 400);
  };

  client
    .channel("campusshare-staff-booking-updates")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "booking_requests"
      },
      scheduleRefresh
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "booking_request_items"
      },
      scheduleRefresh
    )
    .subscribe();
}

  // ============================================================
  // REAL DATABASE COUNTS
  // ============================================================

  function counts() {
    const total = state.equipment.reduce(
      (sum, row) => sum + row.total,
      0
    );

    const available = state.equipment.reduce(
      (sum, row) => sum + row.available,
      0
    );

    const maintenance = state.equipment.reduce((sum, row) => {
      if (norm(row.status) !== "maintenance") return sum;

      return sum + Math.max(
        0,
        row.total - row.available
      );
    }, 0);

    const borrowedUnits = state.history.reduce(
      (sum, row) =>
        sum + (
          row.status === "Borrowed"
            ? row.outstandingQuantity
            : 0
        ),
      0
    );

    const inUse =
      borrowedUnits ||
      Math.max(0, total - available - maintenance);

    const overdue = state.history.filter(row =>
      row.status === "Borrowed" &&
      row.dueDate &&
      new Date(row.dueDate) < new Date()
    ).length;

    const returned = state.history.filter(
      row => row.status === "Returned"
    ).length;

    const pending = state.requests.filter(
      row => row.status === "pending"
    ).length;

    const approved = state.requests.filter(
      row => row.status === "approved"
    ).length;

    return {
      total,
      available,
      maintenance,
      inUse,
      overdue,
      returned,
      pending,
      approved
    };
  }

  const statusName = status => ({
    pending: "Pending review",
    approved: "Approved",
    waitlist: "Waitlisted",
    rejected: "Declined",
    borrowed: "Currently borrowed",
    returned: "Returned"
  })[status] || status;

  function errorBlock(key) {
    return state.errors[key]
      ? `
        <div class="cs-error">
          ${esc(key[0].toUpperCase() + key.slice(1))}
          could not be loaded:
          ${esc(state.errors[key])}.
          Check the relevant Supabase RLS policy.
        </div>
      `
      : "";
  }

  // ============================================================
  // DASHBOARD
  // ============================================================

  function renderDashboard(main) {
    const c = counts();
    const recent = state.requests.slice(0, 5);

    main.innerHTML = `
      <section class="cs-hero">
        <div class="cs-kicker">Staff Workspace</div>

        <h1 class="cs-title">
          Welcome back,
          ${esc(state.profile?.full_name || "Staff member")}
        </h1>

        <p class="cs-subtitle">
          Manage your equipment inventory, review student booking
          requests, and track borrowing and returns.
        </p>

        <p class="cs-subtitle" style="margin-top:6px">
          ${esc(state.profile?.department || "Department not provided")}
          ·
          ${esc(state.profile?.email || state.user?.email || "")}
        </p>
      </section>

      <section class="cs-grid" aria-label="Staff dashboard statistics">

        ${metric(
          "Total Inventory",
          c.total,
          "Equipment units in your inventory",
          "inventory_2"
        )}

        ${metric(
          "Available",
          c.available,
          "Units available to book",
          "check_circle"
        )}

        ${metric(
          "Pending Requests",
          c.pending,
          "Awaiting staff review",
          "pending_actions"
        )}

        ${metric(
          "Approved",
          c.approved,
          "Approved booking items",
          "task_alt"
        )}

        ${metric(
          "Currently Borrowed",
          c.inUse,
          "Units currently in use",
          "play_circle"
        )}

        ${metric(
          "Returned",
          c.returned,
          "Completed return records",
          "assignment_turned_in"
        )}

      </section>

      <section class="cs-panel">

        <div class="cs-row">

          <div>
            <h2 class="cs-panel-title">
              Recent Booking Requests
            </h2>

            <p class="cs-muted text-sm mt-1">
              Actual student requests for resources assigned to your account.
            </p>
          </div>

          <a class="cs-btn cs-btn-primary" href="requests.html">
            View Requests
            <span class="material-symbols-outlined">arrow_forward</span>
          </a>

        </div>

        ${errorBlock("requests")}
        ${errorBlock("students")}

        <div class="cs-list mt-4">

          ${
            recent.length
              ? recent.map(requestCardCompact).join("")
              : `
                <div class="cs-empty">
                  No booking requests have been submitted for your equipment.
                </div>
              `
          }

        </div>

      </section>

      <section class="cs-two-col">

        ${quickLink(
          "My Equipment",
          "Add and manage the equipment assigned to your staff account.",
          "inventory_2",
          "equipment.html"
        )}

        ${quickLink(
          "Booking Calendar",
          "Review the dates of real booking requests.",
          "calendar_month",
          "calendar.html"
        )}

        ${quickLink(
          "Equipment History",
          "Review actual borrowing and return records.",
          "history",
          "history.html"
        )}

        ${quickLink(
          "Booking Requests",
          "Approve, waitlist or decline student requests.",
          "event_available",
          "requests.html"
        )}

      </section>
    `;
  }

  function metric(label, value, note, icon) {
    return `
      <article class="cs-card">
        <div class="cs-row">
          <span class="cs-card-label">${esc(label)}</span>
          <span class="material-symbols-outlined" style="color:#00685f">
            ${esc(icon)}
          </span>
        </div>

        <div class="cs-card-value">
          ${Number(value) || 0}
        </div>

        <p class="cs-card-note">
          ${esc(note)}
        </p>
      </article>
    `;
  }

  function quickLink(title, description, icon, href) {
    return `
      <a
        class="cs-card"
        href="${esc(href)}"
        style="text-decoration:none;color:inherit"
      >
        <span
          class="material-symbols-outlined"
          style="color:#00685f;font-size:25px"
        >
          ${esc(icon)}
        </span>

        <h3 class="font-semibold mt-3">
          ${esc(title)}
        </h3>

        <p class="cs-card-note">
          ${esc(description)}
        </p>
      </a>
    `;
  }

  function requestCardCompact(request) {
    return `
      <article class="cs-item">

        <div class="cs-row">

          <div>
            <strong>${esc(request.equipmentName)}</strong>

            <p class="cs-muted text-sm mt-1">
              ${esc(request.studentName)}
              ·
              ${esc(dateText(request.startDate, false))}
            </p>
          </div>

          <span class="cs-status">
            ${esc(statusName(request.status))}
          </span>

        </div>

      </article>
    `;
  }

  // ============================================================
  // EQUIPMENT PAGE
  // ============================================================

  function renderEquipmentPage(main) {
    const c = counts();

    main.innerHTML = `
      <section class="cs-hero">

        <div class="cs-row">

          <div>
            <div class="cs-kicker">
              Equipment Management
            </div>

            <h1 class="cs-title">
              My Equipment
            </h1>

            <p class="cs-subtitle">
              Add and manage the equipment you make available to students.
            </p>
          </div>

          <button
            id="openAddModalBtn"
            type="button"
            class="cs-btn cs-btn-primary"
          >
            <span class="material-symbols-outlined">add</span>
            Add Equipment
          </button>

        </div>

      </section>

      <section class="cs-grid-4">

        ${metric(
          "Total Equipment Units",
          c.total,
          "Units in your resources",
          "inventory_2"
        )}

        ${metric(
          "Available",
          c.available,
          "Units available to book",
          "check_circle"
        )}

        ${metric(
          "Currently In Use",
          c.inUse,
          "Units currently borrowed",
          "play_circle"
        )}

        ${metric(
          "Maintenance",
          c.maintenance,
          "Units under maintenance",
          "build"
        )}

      </section>

      <section class="cs-panel">

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">

          <input
            id="equipmentSearchInput"
            class="cs-input"
            type="search"
            placeholder="Search equipment name, ID or location"
          >

          <select id="categoryFilter" class="cs-select">
            <option value="all">All Categories</option>

            ${
              state.categories.map(cat => `
                <option value="${esc(cat.category_name)}">
                  ${esc(cat.category_name)}
                </option>
              `).join("")
            }

          </select>

          <select id="statusFilter" class="cs-select">
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="in-use">In Use</option>
            <option value="maintenance">Maintenance</option>
          </select>

        </div>

        <div class="cs-row mt-3">

          <span id="visibleCount" class="text-xs cs-muted">
            ${state.equipment.length} equipment items
          </span>

          <button
            id="clearFiltersBtn"
            class="text-sm font-semibold"
            style="color:#00685f"
            type="button"
          >
            Reset Filters
          </button>

          <div class="ml-auto flex gap-2">

            <button
              id="gridToggleBtn"
              class="cs-btn cs-btn-primary"
              type="button"
            >
              Grid
            </button>

            <button
              id="tableToggleBtn"
              class="cs-btn cs-btn-light"
              type="button"
            >
              Table
            </button>

          </div>

        </div>

      </section>

      ${errorBlock("equipment")}

      <section
        id="equipmentGridContainer"
        class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      ></section>

      <section
        id="equipmentTableContainer"
        class="cs-panel hidden"
      >

        <div class="cs-table-wrap">

          <table class="cs-table">

            <thead>
              <tr>
                <th>Equipment</th>
                <th>Category</th>
                <th>Location</th>
                <th>Status</th>
                <th>Quantity</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody id="equipmentTableBody"></tbody>

          </table>

        </div>

      </section>
    `;

    bindEquipmentMainControls(main);
    renderEquipmentCards();
  }

  function bindEquipmentMainControls(main) {
    if (main.dataset.equipmentEvents === "true") return;

    main.dataset.equipmentEvents = "true";

    main.addEventListener("input", event => {
      if (event.target.id === "equipmentSearchInput") {
        renderEquipmentCards();
      }
    });

    main.addEventListener("change", event => {
      if (
        ["categoryFilter", "statusFilter"].includes(event.target.id)
      ) {
        renderEquipmentCards();
      }
    });

    main.addEventListener("click", event => {
      if (event.target.closest("#openAddModalBtn")) {
        openEquipmentModal();
      }

      if (event.target.closest("#clearFiltersBtn")) {
        if ($("#equipmentSearchInput")) {
          $("#equipmentSearchInput").value = "";
        }

        if ($("#categoryFilter")) {
          $("#categoryFilter").value = "all";
        }

        if ($("#statusFilter")) {
          $("#statusFilter").value = "all";
        }

        renderEquipmentCards();
      }

      if (event.target.closest("#gridToggleBtn")) {
        $("#equipmentGridContainer")?.classList.remove("hidden");
        $("#equipmentTableContainer")?.classList.add("hidden");
      }

      if (event.target.closest("#tableToggleBtn")) {
        $("#equipmentGridContainer")?.classList.add("hidden");
        $("#equipmentTableContainer")?.classList.remove("hidden");
      }

      const edit = event.target.closest("[data-equip-edit]");

      if (edit) {
        const record = state.equipment.find(
          item => String(item.id) === edit.dataset.equipEdit
        );

        if (record) openEquipmentModal(record);
      }

      const remove = event.target.closest("[data-equip-delete]");

      if (remove) {
        deleteEquipment(remove.dataset.equipDelete);
      }
    });
  }

  function renderEquipmentCards() {
    const grid = $("#equipmentGridContainer");

    if (!grid) return;

    const query =
      ($("#equipmentSearchInput")?.value || "")
        .toLowerCase()
        .trim();

    const category = $("#categoryFilter")?.value || "all";
    const status = $("#statusFilter")?.value || "all";

    const filtered = state.equipment.filter(item => {
      const matchesText =
        !query ||
        `${item.name} ${item.id} ${item.location}`
          .toLowerCase()
          .includes(query);

      const matchesCategory =
        category === "all" ||
        item.category === category;

      const matchesStatus =
        status === "all" ||
        norm(item.status) === norm(status);

      return matchesText && matchesCategory && matchesStatus;
    });

    grid.innerHTML = filtered.length
      ? filtered.map(item => `
          <article class="cs-card">

            ${
              item.image
                ? `
                  <img
                    class="cs-equipment-img mb-3"
                    src="${esc(item.image)}"
                    alt="${esc(item.name)}"
                    loading="lazy"
                  >
                `
                : `
                  <div class="cs-equipment-img mb-3 grid place-items-center text-sm text-slate-500">
                    No image
                  </div>
                `
            }

            <div class="cs-row">
              <h2 class="font-semibold">
                ${esc(item.name)}
              </h2>

              <span class="cs-status">
                ${esc(item.status)}
              </span>
            </div>

            <p class="text-sm cs-muted mt-2">
              ${esc(item.description)}
            </p>

            <div class="text-sm mt-3">
              Category: ${esc(item.category)}
            </div>

            <div class="text-sm mt-1">
              Location: ${esc(item.location || "Not specified")}
            </div>

            <div class="text-sm mt-1">
              Available: ${item.available} of ${item.total}
            </div>

            <div class="flex gap-2 mt-4">

              <button
                type="button"
                data-equip-edit="${esc(item.id)}"
                class="cs-btn cs-btn-light"
              >
                Edit
              </button>

              <button
                type="button"
                data-equip-delete="${esc(item.id)}"
                class="cs-btn cs-btn-danger"
              >
                Delete
              </button>

            </div>

          </article>
        `).join("")
      : `
        <div class="cs-empty col-span-full">
          ${
            state.equipment.length
              ? "No equipment matches these filters."
              : "No equipment has been added to your inventory yet."
          }
        </div>
      `;

    const tbody = $("#equipmentTableBody");

    if (tbody) {
      tbody.innerHTML = filtered.length
        ? filtered.map(item => `
            <tr>

              <td>
                <strong>${esc(item.name)}</strong>
                <div class="text-xs text-slate-500">
                  ${esc(item.id)}
                </div>
              </td>

              <td>${esc(item.category)}</td>
              <td>${esc(item.location)}</td>
              <td>${esc(item.status)}</td>
              <td>${item.available}/${item.total}</td>

              <td>
                <button
                  class="cs-btn cs-btn-light"
                  data-equip-edit="${esc(item.id)}"
                >
                  Edit
                </button>

                <button
                  class="cs-btn cs-btn-danger"
                  data-equip-delete="${esc(item.id)}"
                >
                  Delete
                </button>
              </td>

            </tr>
          `).join("")
        : `
            <tr>
              <td colspan="6">No equipment available.</td>
            </tr>
          `;
    }

    setText(
      "#visibleCount",
      `${filtered.length} equipment items`
    );
  }

  // ============================================================
  // ADD CATEGORY AND QUANTITY INPUTS TO THE EXISTING FORM
  // ============================================================

  function ensureEquipmentFormFields() {
    const form = $("#equipmentFormBody");

    if (!form) return;

    if (!$("#equipmentCategoryField")) {
      const wrapper = document.createElement("div");

      wrapper.className = "cs-extra-field";

      wrapper.innerHTML = `
        <label for="equipmentCategoryField">
          Equipment Category
        </label>

        <select id="equipmentCategoryField">
          <option value="">Uncategorized</option>
        </select>
      `;

      form.append(wrapper);
    }

    if (!$("#equipmentQuantityField")) {
      const wrapper = document.createElement("div");

      wrapper.className = "cs-extra-field";

      wrapper.innerHTML = `
        <label for="equipmentQuantityField">
          Total Quantity
        </label>

        <input
          id="equipmentQuantityField"
          type="number"
          min="1"
          step="1"
          value="1"
          required
        >
      `;

      form.append(wrapper);
    }

    const category = $("#equipmentCategoryField");

    if (category) {
      const previous = category.value;

      category.innerHTML =
        `<option value="">Uncategorized</option>` +
        state.categories.map(item => `
          <option value="${esc(item.id)}">
            ${esc(item.category_name)}
          </option>
        `).join("");

      if (
        [...category.options].some(option =>
          option.value === previous
        )
      ) {
        category.value = previous;
      }
    }
  }

  function openEquipmentModal(item = null) {
    const modal = $("#addEquipmentModal");

    if (!modal) {
      return toast("The equipment form is missing from equipment.html.");
    }

    ensureEquipmentFormFields();

    state.editingEquipmentId = item?.id || null;
    state.selectedImage = item?.image || null;

    if ($("#equipmentNameField")) {
      $("#equipmentNameField").value = item?.name || "";
    }

    if ($("#equipmentDescriptionField")) {
      $("#equipmentDescriptionField").value =
        item?.description || "";
    }

    if ($("#equipmentLocationField")) {
      $("#equipmentLocationField").value =
        item?.location || "";
    }

    if ($("#equipmentCategoryField")) {
      $("#equipmentCategoryField").value =
        item?.categoryId || "";
    }

    if ($("#equipmentQuantityField")) {
      $("#equipmentQuantityField").value =
        String(item?.total ?? 1);
    }

    const preview = $("#equipmentImagePreview");

    if (preview) {
      preview.src = state.selectedImage || "";
      preview.classList.toggle(
        "hidden",
        !state.selectedImage
      );
    }

    const heading = $("#addEquipmentModal h2");

    if (heading) {
      heading.textContent = item
        ? "Edit Equipment"
        : "Add Equipment";
    }

    const button = $("#publishEquipmentBtn");

    if (button) {
      button.textContent = item
        ? "Save Changes"
        : "Save Equipment";
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");

    document.body.style.overflow = "hidden";
  }

  function closeEquipmentModal() {
    const modal = $("#addEquipmentModal");

    if (!modal) return;

    modal.classList.add("hidden");
    modal.classList.remove("flex");

    document.body.style.overflow = "";

    state.editingEquipmentId = null;
    state.selectedImage = null;

    [
      "#equipmentNameField",
      "#equipmentDescriptionField",
      "#equipmentLocationField"
    ].forEach(selector => {
      const element = $(selector);

      if (element) element.value = "";
    });

    if ($("#equipmentCategoryField")) {
      $("#equipmentCategoryField").value = "";
    }

    if ($("#equipmentQuantityField")) {
      $("#equipmentQuantityField").value = "1";
    }

    if ($("#equipmentImageField")) {
      $("#equipmentImageField").value = "";
    }

    const preview = $("#equipmentImagePreview");

    if (preview) {
      preview.src = "";
      preview.classList.add("hidden");
    }
  }

  function bindEquipmentModal() {
    if (
      !$("#addEquipmentModal") ||
      $("#addEquipmentModal").dataset.csBound === "true"
    ) {
      return;
    }

    const modal = $("#addEquipmentModal");

    modal.dataset.csBound = "true";

    ensureEquipmentFormFields();

    $("#closeAddModalBtn")?.addEventListener(
      "click",
      closeEquipmentModal
    );

    $("#cancelModalBtn")?.addEventListener(
      "click",
      closeEquipmentModal
    );

    $("#modalOverlay")?.addEventListener(
      "click",
      closeEquipmentModal
    );

    document.addEventListener("keydown", event => {
      if (
        event.key === "Escape" &&
        !modal.classList.contains("hidden")
      ) {
        closeEquipmentModal();
      }
    });

    $("#equipmentImageField")?.addEventListener("change", () => {
      const file = $("#equipmentImageField").files?.[0];

      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast("Choose an image file.");
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        toast("Image must be 2 MB or smaller.");
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        state.selectedImage = String(reader.result || "");

        const preview = $("#equipmentImagePreview");

        if (preview) {
          preview.src = state.selectedImage;
          preview.classList.remove("hidden");
        }
      };

      reader.onerror = () => {
        toast("Could not read the selected image.");
      };

      reader.readAsDataURL(file);
    });

    $("#publishEquipmentBtn")?.addEventListener(
      "click",
      saveEquipment
    );

    $("#saveDraftBtn")?.addEventListener(
      "click",
      saveEquipment
    );
  }

  // ============================================================
  // SAVE EQUIPMENT TO SUPABASE
  // ============================================================

  async function saveEquipment(event) {
    event?.preventDefault();

    if (!state.user) {
      return toast("Please wait for staff authentication to finish.");
    }

    const name =
      $("#equipmentNameField")?.value.trim() || "";

    const description =
      $("#equipmentDescriptionField")?.value.trim() || "";

    const location =
      $("#equipmentLocationField")?.value.trim() || "";

    const categoryId =
      $("#equipmentCategoryField")?.value || null;

    const total = Number(
      $("#equipmentQuantityField")?.value || 1
    );

    if (!name || !location) {
      return toast("Equipment name and location are required.");
    }

    if (!Number.isInteger(total) || total < 1) {
      return toast("Enter a whole-number quantity of at least 1.");
    }

    const button = $("#publishEquipmentBtn");

    if (button) button.disabled = true;

    try {
      const existing = state.equipment.find(
        item =>
          String(item.id) ===
          String(state.editingEquipmentId)
      );

      const unavailable = existing
        ? Math.max(0, existing.total - existing.available)
        : 0;

      if (total < unavailable) {
        throw new Error(
          `Quantity cannot be lower than ${unavailable} units currently unavailable.`
        );
      }

      const payload = {
        name,
        description,
        category_id: categoryId,
        total_quantity: total,
        available_quantity: existing
          ? total - unavailable
          : total,
        owner_id: state.user.id,
        condition: existing?.condition || "good",
        status: existing?.status || "available",
        location,
        image_url: state.selectedImage || null
      };

      if (existing) {
        const { data, error } = await db()
          .from("resources")
          .update(payload)
          .eq("id", existing.id)
          .eq("owner_id", state.user.id)
          .select("id");

        if (error) throw error;

        if (!data?.length) {
          throw new Error(
            "Equipment was not updated. Check ownership and database permissions."
          );
        }

        toast("Equipment updated.");

      } else {
        const { error } = await db()
          .from("resources")
          .insert(payload);

        if (error) throw error;

        toast("Equipment added to your inventory.");
      }

      closeEquipmentModal();
      await refreshData();

    } catch (error) {
      console.error("Equipment save failed:", error);

      toast(error.message || "Could not save equipment.");

    } finally {
      if (button) button.disabled = false;
    }
  }

  async function deleteEquipment(id) {
    if (!state.user) {
      return toast("Please sign in again.");
    }

    const item = state.equipment.find(
      row => String(row.id) === String(id)
    );

    const active = state.history.some(
      row =>
        String(row.resourceId) === String(id) &&
        row.status === "Borrowed"
    );

    if (active) {
      return toast(
        "This equipment has an active borrowing record and cannot be deleted."
      );
    }

    if (
      !window.confirm(
        `Delete ${item?.name || "this equipment"}?`
      )
    ) {
      return;
    }

    try {
      const { data, error } = await db()
        .from("resources")
        .delete()
        .eq("id", id)
        .eq("owner_id", state.user.id)
        .select("id");

      if (error) throw error;

      if (!data?.length) {
        throw new Error(
          "No equipment was deleted. Check ownership and permissions."
        );
      }

      toast("Equipment deleted.");
      await refreshData();

    } catch (error) {
      console.error("Equipment delete failed:", error);

      toast(
        error.message ||
        "Could not delete equipment. Existing booking records may reference it."
      );
    }
  }

  // ============================================================
  // BOOKING APPROVAL, WAITLIST AND DECLINE
  // ============================================================

  async function updateDecision(request, value, reason = "") {
    const changes = {
      item_status: value
    };

    if (value === "approved") {
      changes.approved_quantity = request.requestedQuantity;
    }

    const {
      data,
      error
    } = await db()
      .from("booking_request_items")
      .update(changes)
      .eq("id", request.id)
      .select("id");

    if (error) throw error;

    if (!data?.length) {
      throw new Error(
        "Booking item was not updated. Check Supabase RLS."
      );
    }

    const {
      data: headerRows,
      error: headerError
    } = await db()
      .from("booking_requests")
      .update({ status: value })
      .eq("id", request.requestId)
      .select("id");

    if (headerError || !headerRows?.length) {
      await db()
        .from("booking_request_items")
        .update({
          item_status: request.rawItemStatus || request.status,
          approved_quantity: request.approvedQuantity || 0
        })
        .eq("id", request.id);

      if (headerError) throw headerError;

      throw new Error(
        "The booking summary status was not updated. Check booking_requests RLS."
      );
    }

    await logActivity(
      `Booking ${value}`,
      {
        request_item_id: request.id,
        booking_request_id: request.requestId,
        resource_id: request.resourceId,
        reason
      }
    );

    await refreshData();
  }

  // ============================================================
  // CHECK OUT EQUIPMENT
  // ============================================================

  async function checkoutRequest(request) {
    const equipment = state.equipment.find(
      row => String(row.id) === String(request.resourceId)
    );

    if (!equipment) {
      throw new Error("Equipment record was not found.");
    }

    const quantity = Math.max(
      1,
      Number(
        request.approvedQuantity ||
        request.requestedQuantity ||
        1
      )
    );

    if (equipment.available < quantity) {
      throw new Error(
        `Only ${equipment.available} units are available.`
      );
    }

    const { data: borrow, error } = await db()
      .from("borrow_records")
      .insert({
        request_item_id: request.id,
        quantity_borrowed: quantity,
        quantity_returned: 0,
        borrowed_at: new Date().toISOString(),
        due_date: request.dueDate || null,
        return_status: "borrowed",
        handed_over_by: state.user.id
      })
      .select("id")
      .single();

    if (error) throw error;

    try {
      const {
        data: changed,
        error: resourceError
      } = await db()
        .from("resources")
        .update({
          available_quantity: equipment.available - quantity,
          status:
            equipment.available - quantity > 0
              ? "available"
              : "in-use"
        })
        .eq("id", equipment.id)
        .eq("owner_id", state.user.id)
        .select("id");

      if (resourceError) throw resourceError;

      if (!changed?.length) {
        throw new Error(
          "Equipment quantity could not be updated."
        );
      }

      const {
        data: itemRows,
        error: itemError
      } = await db()
        .from("booking_request_items")
        .update({
          item_status: "borrowed",
          approved_quantity: quantity
        })
        .eq("id", request.id)
        .select("id");

      if (itemError) throw itemError;

      if (!itemRows?.length) {
        throw new Error(
          "Booking status could not be updated."
        );
      }

      const {
        data: headerRows,
        error: headerError
      } = await db()
        .from("booking_requests")
        .update({ status: "borrowed" })
        .eq("id", request.requestId)
        .select("id");

      if (headerError) throw headerError;

      if (!headerRows?.length) {
        throw new Error(
          "Booking summary status could not be updated."
        );
      }

    } catch (error) {
      // Best-effort rollback if a linked checkout update fails.
      await db()
        .from("resources")
        .update({
          available_quantity: equipment.available,
          status: equipment.status
        })
        .eq("id", equipment.id)
        .eq("owner_id", state.user.id);

      await db()
        .from("booking_request_items")
        .update({
          item_status: "approved",
          approved_quantity: quantity
        })
        .eq("id", request.id);

      await db()
        .from("booking_requests")
        .update({ status: "approved" })
        .eq("id", request.requestId);

      await db()
        .from("borrow_records")
        .delete()
        .eq("id", borrow.id);

      throw error;
    }

    await logActivity(
      "Equipment checked out",
      {
        request_item_id: request.id,
        booking_request_id: request.requestId,
        resource_id: equipment.id,
        quantity
      }
    );

    await refreshData();
    toast("Borrowing started.");
  }

  // ============================================================
  // RETURN EQUIPMENT
  // ============================================================

  async function returnRequest(request) {
    const equipment = state.equipment.find(
      row => String(row.id) === String(request.resourceId)
    );

    if (!equipment) {
      throw new Error("Equipment record was not found.");
    }

    const {
      data: records,
      error
    } = await db()
      .from("borrow_records")
      .select("id,quantity_borrowed,quantity_returned")
      .eq("request_item_id", request.id)
      .is("returned_at", null)
      .order("borrowed_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    const record = records?.[0];

    if (!record) {
      throw new Error(
        "No active borrowing record was found."
      );
    }

    const quantity = Math.max(
      0,
      Number(record.quantity_borrowed || 0) -
      Number(record.quantity_returned || 0)
    );

    const condition = window.prompt(
      "Return condition? Enter good, damaged or maintenance:",
      "good"
    );

    if (condition === null) return;

    const conditionKey = norm(condition) || "good";

    if (!["good", "damaged", "maintenance"].includes(conditionKey)) {
      throw new Error(
        "Enter one of these conditions: good, damaged or maintenance."
      );
    }

    const good = conditionKey === "good";

    const available = good
      ? Math.min(
          equipment.total,
          equipment.available + quantity
        )
      : equipment.available;

    const returnedAt = new Date().toISOString();

    const {
      data: updated,
      error: returnError
    } = await db()
      .from("borrow_records")
      .update({
        quantity_returned: Number(record.quantity_borrowed || 0),
        returned_at: returnedAt,
        return_status: "returned",
        received_by: state.user.id
      })
      .eq("id", record.id)
      .select("id");

    if (returnError) throw returnError;

    if (!updated?.length) {
      throw new Error(
        "Borrow record could not be marked returned."
      );
    }

    try {
      const {
        data: resourceRows,
        error: resourceError
      } = await db()
        .from("resources")
        .update({
          available_quantity: available,
          condition: conditionKey,
          status: good
            ? (available > 0 ? "available" : "in-use")
            : "maintenance"
        })
        .eq("id", equipment.id)
        .eq("owner_id", state.user.id)
        .select("id");

      if (resourceError) throw resourceError;

      if (!resourceRows?.length) {
        throw new Error(
          "Equipment availability was not updated."
        );
      }

      const {
        data: itemRows,
        error: itemError
      } = await db()
        .from("booking_request_items")
        .update({ item_status: "returned" })
        .eq("id", request.id)
        .select("id");

      if (itemError) throw itemError;

      if (!itemRows?.length) {
        throw new Error(
          "Booking item status was not updated."
        );
      }

      const {
        data: headerRows,
        error: headerError
      } = await db()
        .from("booking_requests")
        .update({ status: "completed" })
        .eq("id", request.requestId)
        .select("id");

      if (headerError) throw headerError;

      if (!headerRows?.length) {
        throw new Error(
          "Booking summary status could not be updated."
        );
      }

    } catch (error) {
      // Best-effort rollback keeps the records consistent.
      await db()
        .from("resources")
        .update({
          available_quantity: equipment.available,
          condition: equipment.condition,
          status: equipment.status
        })
        .eq("id", equipment.id)
        .eq("owner_id", state.user.id);

      await db()
        .from("booking_request_items")
        .update({ item_status: "borrowed" })
        .eq("id", request.id);

      await db()
        .from("booking_requests")
        .update({ status: "borrowed" })
        .eq("id", request.requestId);

      await db()
        .from("borrow_records")
        .update({
          quantity_returned: Number(record.quantity_returned || 0),
          returned_at: null,
          return_status: "borrowed",
          received_by: null
        })
        .eq("id", record.id);

      throw error;
    }

    await logActivity(
      "Equipment returned",
      {
        request_item_id: request.id,
        booking_request_id: request.requestId,
        resource_id: equipment.id,
        quantity,
        condition: conditionKey
      }
    );

    await refreshData();
    toast("Return recorded.");
  }

  // ============================================================
  // BOOKING REQUESTS PAGE
  // ============================================================

  function renderRequests(main) {
    const c = counts();
    const currentFilter = state.requestFilter || "all";
    const query = state.requestSearch || "";

    const visibleRows = state.requests.filter(row =>
      (currentFilter === "all" || row.status === currentFilter) &&
      [
        row.studentName,
        row.studentEmail,
        row.equipmentName,
        row.requestId
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );

    main.innerHTML = `
      <section class="cs-hero">

        <div class="cs-kicker">
          Student Bookings
        </div>

        <h1 class="cs-title">
          Booking Requests
        </h1>

        <p class="cs-subtitle">
          Review requests for equipment assigned to your staff account.
          Student and booking information is read from CampusShare.
        </p>

      </section>

      <section class="cs-grid-4">

        ${metric(
          "Total Requests",
          state.requests.length,
          "Request items for your equipment",
          "event_available"
        )}

        ${metric(
          "Pending",
          c.pending,
          "Awaiting review",
          "pending_actions"
        )}

        ${metric(
          "Approved",
          c.approved,
          "Approved request items",
          "task_alt"
        )}

        ${metric(
          "Borrowed",
          state.requests.filter(x => x.status === "borrowed").length,
          "Currently checked out",
          "inventory"
        )}

      </section>

      <section class="cs-panel">

        ${errorBlock("requests")}
        ${errorBlock("students")}

        <div class="cs-row">

          <h2 class="cs-panel-title">
            All Booking Requests
          </h2>

          <input
            id="requestSearch"
            class="cs-input"
            style="max-width:340px"
            value="${esc(query)}"
            placeholder="Search student or equipment"
          >

        </div>

        <div class="cs-tabs" id="requestTabs">

          ${
            ["all", "pending", "approved", "waitlist", "rejected", "borrowed", "returned"]
              .map(key => `
                <button
                  type="button"
                  class="cs-tab ${key === currentFilter ? "active" : ""}"
                  data-request-filter="${key}"
                >
                  ${key === "all" ? "All" : statusName(key)}
                  (${
                    key === "all"
                      ? state.requests.length
                      : state.requests.filter(x => x.status === key).length
                  })
                </button>
              `).join("")
          }

        </div>

        <div id="requestRows" class="cs-list">

          ${
            visibleRows.length
              ? visibleRows.map(row => `
                <article
                  class="cs-item"
                  data-request-id="${esc(row.id)}"
                >

                  <div class="cs-row">

                    <div>
                      <strong>
                        ${esc(row.studentName)}
                      </strong>

                      <p class="cs-muted text-xs mt-1">
                        ${esc(row.studentEmail || "Student contact details unavailable")}
                      </p>
                    </div>

                    <span class="cs-status">
                      ${esc(statusName(row.status))}
                    </span>

                  </div>

                  <div class="cs-two-col mt-3">

                    <div>
                      <span class="cs-muted text-xs">
                        Equipment
                      </span>

                      <p class="font-semibold">
                        ${esc(row.equipmentName)}
                      </p>

                      <span class="text-xs cs-muted">
                        Quantity: ${row.requestedQuantity}
                      </span>
                    </div>

                    <div>
                      <span class="cs-muted text-xs">
                        Booking period
                      </span>

                      <p class="font-semibold">
                        ${esc(dateText(row.startDate, false))}
                        –
                        ${esc(dateText(row.dueDate, false))}
                      </p>

                      <span class="text-xs cs-muted">
                        Submitted ${esc(dateText(row.createdAt, false))}
                      </span>
                    </div>

                  </div>

                  <div class="flex flex-wrap gap-2 mt-3">

                    ${
                      ["pending", "waitlist"].includes(row.status)
                        ? `
                          <button class="cs-btn cs-btn-primary" data-request-action="approve">
                            Approve
                          </button>

                          <button class="cs-btn cs-btn-light" data-request-action="waitlist">
                            Waitlist
                          </button>

                          <button class="cs-btn cs-btn-danger" data-request-action="reject">
                            Decline
                          </button>
                        `
                        : ""
                    }

                    ${
                      row.status === "approved"
                        ? `
                          <button class="cs-btn cs-btn-primary" data-request-action="borrow">
                            Start borrowing
                          </button>
                        `
                        : ""
                    }

                    ${
                      row.status === "borrowed"
                        ? `
                          <button class="cs-btn cs-btn-primary" data-request-action="return">
                            Complete return
                          </button>
                        `
                        : ""
                    }

                    ${
                      ["rejected", "returned"].includes(row.status)
                        ? `
                          <button class="cs-btn cs-btn-light" data-request-action="reopen">
                            Reopen review
                          </button>
                        `
                        : ""
                    }

                  </div>

                </article>
              `).join("")
              : `
                <div class="cs-empty">
                  No booking requests match this view.
                </div>
              `
          }

        </div>

      </section>
    `;

    if (main.dataset.requestEvents !== "true") {
      main.dataset.requestEvents = "true";

      main.addEventListener("input", event => {
        if (event.target.id !== "requestSearch") return;

        state.requestSearch =
          event.target.value.toLowerCase().trim();

        renderPage();

        const input = $("#requestSearch");

        input?.focus();

        input?.setSelectionRange(
          state.requestSearch.length,
          state.requestSearch.length
        );
      });

      main.addEventListener("click", async event => {
        const tab = event.target.closest("[data-request-filter]");

        if (tab) {
          state.requestFilter = tab.dataset.requestFilter;
          renderPage();
          return;
        }

        const button = event.target.closest("[data-request-action]");

        if (!button) return;

        const card = button.closest("[data-request-id]");

        const request = state.requests.find(
          row => row.id === card?.dataset.requestId
        );

        if (!request) return;

        button.disabled = true;

        try {
          const action = button.dataset.requestAction;

          if (action === "approve") {
            await updateDecision(request, "approved");
          }

          if (action === "waitlist") {
            await updateDecision(request, "waitlist");
          }

          if (action === "reject") {
            const reason = window.prompt(
              "Reason for declining this booking:"
            );

            if (reason === null) return;

            if (!reason.trim()) {
              return toast("A decline reason is required.");
            }

            await updateDecision(
              request,
              "rejected",
              reason.trim()
            );
          }

          if (action === "borrow") {
            await checkoutRequest(request);
          }

          if (action === "return") {
            await returnRequest(request);
          }

          if (action === "reopen") {
            await updateDecision(request, "pending");
          }

        } catch (error) {
          console.error("Booking update failed:", error);

          toast(
            error.message ||
            "Could not update the booking."
          );

        } finally {
          button.disabled = false;
        }
      });
    }
  }

  // ============================================================
  // CALENDAR PAGE
  // ============================================================

  function renderCalendar(main) {
    const events = state.requests
      .filter(row =>
        ["pending", "approved", "borrowed", "waitlist"]
          .includes(row.status)
      )
      .sort((a, b) =>
        new Date(a.startDate || 0) -
        new Date(b.startDate || 0)
      );

    const groups = new Map();

    events.forEach(row => {
      const key = row.startDate
        ? new Date(row.startDate).toLocaleDateString()
        : "Date not specified";

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key).push(row);
    });

    main.innerHTML = `
      <section class="cs-hero">

        <div class="cs-kicker">
          Equipment Schedule
        </div>

        <h1 class="cs-title">
          Calendar
        </h1>

        <p class="cs-subtitle">
          Booking dates and schedule information linked to your actual equipment requests.
        </p>

      </section>

      <section class="cs-panel">

        <div class="cs-row">

          <div>
            <h2 class="cs-panel-title">
              Upcoming and Active Bookings
            </h2>

            <p class="cs-muted text-sm mt-1">
              No preset calendar dates or sample bookings are used.
            </p>
          </div>

          <button id="refreshCalendar" class="cs-btn cs-btn-light">
            Refresh
          </button>

        </div>

        ${errorBlock("requests")}

        ${
          groups.size
            ? [...groups.entries()].map(([date, rows]) => `
              <div class="mt-5">

                <h3 class="font-bold mb-2">
                  ${esc(date)}
                </h3>

                <div class="cs-list">

                  ${
                    rows.map(row => `
                      <article class="cs-item">

                        <div class="cs-row">
                          <strong>
                            ${esc(row.equipmentName)}
                          </strong>

                          <span class="cs-status">
                            ${esc(statusName(row.status))}
                          </span>
                        </div>

                        <p class="text-sm mt-2">
                          ${esc(row.studentName)}
                        </p>

                        <p class="text-xs cs-muted mt-1">
                          ${esc(dateText(row.startDate))}
                          –
                          ${esc(dateText(row.dueDate))}
                          · Quantity ${row.requestedQuantity}
                        </p>

                      </article>
                    `).join("")
                  }

                </div>

              </div>
            `).join("")
            : `
              <div class="cs-empty mt-4">
                No bookings are scheduled for your equipment.
              </div>
            `
        }

      </section>
    `;

    $("#refreshCalendar")?.addEventListener(
      "click",
      refreshData
    );
  }

  // ============================================================
  // HISTORY PAGE AND CSV EXPORT
  // ============================================================

  function exportHistoryCsv(rows) {
    const values = [
      [
        "Equipment",
        "Student",
        "Borrowed at",
        "Due date",
        "Returned at",
        "Status",
        "Quantity borrowed",
        "Quantity returned"
      ],

      ...rows.map(row => [
        row.equipmentName,
        row.studentName,
        row.borrowedAt,
        row.dueDate,
        row.returnedAt,
        row.status,
        row.quantity,
        row.returnedQuantity
      ])
    ];

    const csv = values
      .map(row =>
        row.map(value =>
          `"${String(value ?? "").replace(/"/g, '""')}"`
        ).join(",")
      )
      .join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], {
        type: "text/csv;charset=utf-8"
      })
    );

    const link = document.createElement("a");

    link.href = url;
    link.download = "campusshare-equipment-history.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  function renderHistory(main) {
    const returned = state.history.filter(
      row => row.status === "Returned"
    ).length;

    const borrowed = state.history.filter(
      row => row.status === "Borrowed"
    ).length;

    const overdue = state.history.filter(
      row =>
        row.status === "Borrowed" &&
        row.dueDate &&
        new Date(row.dueDate) < new Date()
    ).length;

    main.innerHTML = `
      <section class="cs-hero">

        <div class="cs-kicker">
          Equipment Records
        </div>

        <h1 class="cs-title">
          Equipment History
        </h1>

        <p class="cs-subtitle">
          Actual equipment checkout and return records from CampusShare.
          No demonstration statistics are displayed.
        </p>

      </section>

      <section class="cs-grid-4">

        ${metric(
          "Total Records",
          state.history.length,
          "Borrow records",
          "history"
        )}

        ${metric(
          "Returned",
          returned,
          "Completed returns",
          "assignment_turned_in"
        )}

        ${metric(
          "Currently Borrowed",
          borrowed,
          "Active borrow records",
          "inventory"
        )}

        ${metric(
          "Overdue",
          overdue,
          "Borrow records past due date",
          "warning"
        )}

      </section>

      <section class="cs-panel">

        <div class="cs-row">

          <div>
            <h2 class="cs-panel-title">
              Borrowing and Return Records
            </h2>

            <p class="cs-muted text-sm mt-1">
              Records associated with your equipment only.
            </p>
          </div>

          <button
            id="exportHistoryCsv"
            class="cs-btn cs-btn-primary"
          >
            Export CSV
          </button>

        </div>

        ${errorBlock("history")}

        <div class="mt-4">
          <input
            id="historySearch"
            class="cs-input"
            placeholder="Search equipment or student"
          >
        </div>

        <div class="cs-table-wrap mt-4">

          <table class="cs-table">

            <thead>
              <tr>
                <th>Equipment</th>
                <th>Student</th>
                <th>Borrowed</th>
                <th>Due</th>
                <th>Returned</th>
                <th>Quantity</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody id="historyTableBody"></tbody>

          </table>

        </div>

      </section>
    `;

    const renderRows = () => {
      const query =
        ($("#historySearch")?.value || "")
          .toLowerCase()
          .trim();

      const rows = state.history.filter(row =>
        `${row.equipmentName} ${row.studentName}`
          .toLowerCase()
          .includes(query)
      );

      $("#historyTableBody").innerHTML = rows.length
        ? rows.map(row => `
            <tr>

              <td>
                <strong>${esc(row.equipmentName)}</strong>
              </td>

              <td>${esc(row.studentName)}</td>

              <td>${esc(dateText(row.borrowedAt))}</td>

              <td>${esc(dateText(row.dueDate, false))}</td>

              <td>${esc(dateText(row.returnedAt))}</td>

              <td>${row.quantity}</td>

              <td>${esc(row.status)}</td>

            </tr>
          `).join("")
        : `
            <tr>
              <td colspan="7">
                <div class="cs-empty">
                  No borrowing or return records found.
                </div>
              </td>
            </tr>
          `;
    };

    $("#historySearch")?.addEventListener(
      "input",
      renderRows
    );

    $("#exportHistoryCsv")?.addEventListener(
      "click",
      () => exportHistoryCsv(state.history)
    );

    renderRows();
  }

  // ============================================================
  // RENDER THE CURRENT PAGE
  // ============================================================

  function renderPage() {
    const main = $("main");

    if (!main) return;

    const current = page();

    if (current === "equipment.html") {
      renderEquipmentPage(main);
    } else if (current === "requests.html") {
      renderRequests(main);
    } else if (current === "calendar.html") {
      renderCalendar(main);
    } else if (current === "history.html") {
      renderHistory(main);
    } else {
      renderDashboard(main);
    }
  }

  // ============================================================
  // INITIALIZE STAFF PORTAL
  // ============================================================

  async function init() {
    installStyles();

    const main = renderShell();

    // Bind equipment modal controls before database queries.
    // A failed query therefore does not disable Cancel or Close.
    bindEquipmentModal();

    if (main) {
      main.innerHTML = `
        <section class="cs-hero">
          <div class="cs-kicker">CampusShare Staff Portal</div>

          <h1 class="cs-title">
            Loading your workspace…
          </h1>

          <p class="cs-subtitle">
            Connecting to your authenticated staff account.
          </p>
        </section>
      `;
    }

    try {
      await authenticateStaff();

    } catch (error) {
      console.error("Staff authentication failed:", error);

      setText("#staffDisplayName", "Profile unavailable");
      setText("#staffDepartment", "Please sign in again");
      setText("#staffEmail", "");

      if (main) {
        main.innerHTML = `
          <section class="cs-hero">

            <div class="cs-kicker">
              Sign-in required
            </div>

            <h1 class="cs-title">
              Staff profile unavailable
            </h1>

            <p class="cs-subtitle">
              ${esc(
                error.message ||
                "Please sign in again with an approved staff account."
              )}
            </p>

          </section>
        `;
      }

      toast(
        error.message ||
        "Could not authenticate staff account."
      );

      return;
    }

    // Each query has its own error handling.
    // A failed booking query does not prevent the dashboard or logout from working.
    await refreshData();
subscribeToBookingChanges();
  }

  init().catch(error => {
    console.error(
      "CampusShare Staff Portal initialization failed:",
      error
    );

    toast(
      error.message ||
      "Staff portal failed to initialize. Check the browser Console."
    );
  });

})();
