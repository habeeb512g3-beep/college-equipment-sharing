(() => {
  "use strict";

  /*
   * CampusShare Staff Portal
   * One shared layout and one Supabase-backed data layer for all staff pages.
   * Tables/columns used below are from the project's supplied schema:
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

  const logoMarkup = `
    <span class="cs-brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M4.5 8.5h15v11h-15z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M8 8.5V6.7A2.7 2.7 0 0 1 10.7 4h2.6A2.7 2.7 0 0 1 16 6.7v1.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M9 13h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    </span>
    <span>Campus<span class="cs-brand-light">Share</span></span>
  `;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  const norm = value => String(value || "pending").toLowerCase().replace(/[ _]+/g, "-");

  function toast(message) {
    let element = $("#appToast") || $("#toast-notification") || $("#toastNotification");
    if (!element) {
      element = document.createElement("div");
      element.id = "appToast";
      document.body.append(element);
    }
    element.className = "fixed bottom-6 right-6 z-[99999] rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl";
    element.textContent = message;
    element.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { element.hidden = true; }, 3500);
  }
  window.showToast = toast;

  function dateText(value, includeTime = true) {
    if (!value) return "Not specified";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString([], includeTime
      ? { dateStyle: "medium", timeStyle: "short" }
      : { dateStyle: "medium" });
  }

  function durationText(start, end) {
    if (!start || !end) return "Not returned";
    const minutes = Math.max(0, Math.floor((new Date(end) - new Date(start)) / 60000));
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  function setText(selector, value) {
    const element = $(selector);
    if (element) element.textContent = String(value ?? "");
  }

  // --------------------------------------------------
  // COMMON THEME: SAME SIDEBAR, HEADER AND BRAND ON EVERY PAGE
  // --------------------------------------------------

  function installStyles() {
    if ($("#campusshare-staff-theme")) return;
    const style = document.createElement("style");
    style.id = "campusshare-staff-theme";
    style.textContent = `
      :root{--cs-navy:#213145;--cs-teal:#00685f;--cs-bg:#f6f8fc;--cs-ink:#0b1c30;--cs-muted:#58657b;--cs-line:#e5eaf2}
      body{margin:0;background:var(--cs-bg);color:var(--cs-ink);font-family:Inter,Arial,sans-serif}
      .cs-sidebar{position:fixed;inset:0 auto 0 0;width:270px;background:var(--cs-navy);color:#fff;z-index:50;display:flex;flex-direction:column;box-shadow:0 1px 8px #0002}
      .cs-brand{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none;font-size:21px;font-weight:800;letter-spacing:-.7px;padding:22px 18px 12px}
      .cs-brand-mark{width:32px;height:32px;flex:0 0 32px;display:grid;place-items:center;background:#102b57;border-radius:9px;color:#fff}
      .cs-brand-mark svg{width:22px;height:22px}
      .cs-brand-light{font-weight:600}
      .cs-sidebar-tag{margin:0 18px 20px;padding:6px 9px;border-radius:5px;background:#ffffff18;color:#89f5e7;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;width:max-content}
      .cs-nav{padding:0 12px;display:grid;gap:5px}
      .cs-nav-label{padding:10px 9px 7px;color:#aebbc7;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase}
      .cs-nav a{display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:9px;color:#c4d0d9;text-decoration:none;font-size:14px;font-weight:600}
      .cs-nav a:hover{background:#ffffff12;color:white}
      .cs-nav a.active{background:#008378;color:white}
      .cs-nav .material-symbols-outlined{font-size:21px}
      .cs-sidebar-footer{margin-top:auto;border-top:1px solid #ffffff20;padding:17px 18px;color:#aebbc7;font-size:12px}
      .cs-shell{margin-left:270px;min-height:100vh}
      .cs-header{position:fixed;z-index:40;top:0;left:270px;right:0;min-height:70px;padding:12px 26px;background:#ffffffed;backdrop-filter:blur(14px);box-shadow:0 1px 8px #0000000a;display:flex;align-items:center;justify-content:space-between;gap:16px}
      .cs-crumb{font-size:14px;color:#58657b}.cs-crumb strong{color:#0b1c30}
      .cs-profile{display:flex;align-items:center;gap:10px;min-width:0}
      .cs-avatar{height:38px;width:38px;flex:0 0 38px;border-radius:50%;display:grid;place-items:center;background:#89f5e7;color:#00685f;font-weight:800}
      .cs-profile-copy{display:flex;flex-direction:column;min-width:0}.cs-profile-copy strong,.cs-profile-copy span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cs-profile-copy strong{font-size:13px}.cs-profile-copy span{font-size:11px;color:#58657b;margin-top:2px}
      #staffLogoutButton{border:1px solid #bcc9c6;background:#fff;color:#213145;padding:9px 14px;border-radius:9px;font:600 13px Inter,sans-serif;cursor:pointer;white-space:nowrap}
      #staffLogoutButton:hover{background:#eff4ff}#staffLogoutButton:disabled{opacity:.6;cursor:wait}
      .cs-main{padding:96px 26px 42px;max-width:1800px;margin:0 auto}
      .cs-hero{background:#fff;border:1px solid var(--cs-line);border-radius:18px;padding:25px 28px;margin-bottom:22px;box-shadow:0 1px 2px #0b1c3008}
      .cs-kicker{font-size:11px;letter-spacing:.09em;text-transform:uppercase;font-weight:700;color:var(--cs-teal)}
      .cs-title{font-size:28px;line-height:1.2;font-weight:750;letter-spacing:-.7px;margin:8px 0 7px}
      .cs-subtitle{font-size:14px;line-height:1.55;color:var(--cs-muted);margin:0}
      .cs-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:14px;margin-bottom:22px}
      .cs-grid-4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:22px}
      .cs-card{background:#fff;border:1px solid var(--cs-line);border-radius:14px;padding:17px;box-shadow:0 1px 2px #0b1c3008;min-width:0}
      .cs-card-label{font-size:11px;letter-spacing:.07em;text-transform:uppercase;font-weight:700;color:var(--cs-muted)}
      .cs-card-value{font-size:29px;font-weight:750;letter-spacing:-.8px;margin-top:11px;color:var(--cs-ink)}
      .cs-card-note{font-size:12px;color:var(--cs-muted);margin-top:5px}
      .cs-panel{background:#fff;border:1px solid var(--cs-line);border-radius:16px;padding:20px;box-shadow:0 1px 2px #0b1c3008;margin-bottom:18px}
      .cs-panel-title{font-size:18px;font-weight:700;margin:0}.cs-muted{color:var(--cs-muted)}
      .cs-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border-radius:9px;padding:9px 13px;font-size:13px;font-weight:700;cursor:pointer;border:1px solid transparent}
      .cs-btn-primary{background:var(--cs-teal);color:#fff}.cs-btn-primary:hover{background:#008378}
      .cs-btn-light{background:#fff;color:var(--cs-ink);border-color:#bcc9c6}.cs-btn-danger{background:#ffdad6;color:#93000a}
      .cs-input,.cs-select{min-height:42px;width:100%;border:1px solid #cbd5e1;border-radius:9px;padding:9px 12px;background:#f8faff;color:#0b1c30;font:400 14px Inter,sans-serif}
      .cs-input:focus,.cs-select:focus{outline:2px solid #89f5e7;border-color:#00685f}
      .cs-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .cs-status{display:inline-flex;align-items:center;padding:5px 10px;border-radius:99px;background:#eff4ff;color:#213145;font-size:11px;font-weight:700}
      .cs-list{display:grid;gap:10px}.cs-item{background:#fff;border:1px solid var(--cs-line);border-radius:12px;padding:15px}
      .cs-empty{border:1px dashed #bcc9c6;border-radius:12px;padding:32px 18px;text-align:center;color:var(--cs-muted);font-size:13px;background:#fbfcff}
      .cs-error{padding:12px 14px;border-radius:10px;background:#fff4e5;color:#704214;font-size:13px;margin:10px 0}
      .cs-table-wrap{overflow-x:auto}.cs-table{width:100%;border-collapse:collapse;font-size:13px}.cs-table th{text-align:left;padding:12px;background:#eff4ff;color:#58657b;font-size:11px;text-transform:uppercase;letter-spacing:.05em}.cs-table td{padding:13px 12px;border-bottom:1px solid #e5eaf2;vertical-align:top}
      .cs-tabs{display:flex;flex-wrap:wrap;gap:7px;margin:14px 0}.cs-tab{padding:8px 11px;border:1px solid #d5dde8;background:#fff;color:#58657b;border-radius:9px;font-size:12px;font-weight:650}.cs-tab.active{background:#00685f;border-color:#00685f;color:#fff}
      .cs-two-col{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
      .cs-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .cs-label{display:block;font-size:12px;font-weight:700;margin-bottom:6px}
      .cs-equipment-img{width:100%;height:155px;object-fit:cover;background:#eff4ff;border-radius:9px}
      #addEquipmentModal{z-index:1000}#addEquipmentModal.hidden{display:none!important}#addEquipmentModal:not(.hidden){display:flex!important}
      #addEquipmentModal .cs-extra-field{display:grid;gap:6px;margin-top:14px}
      #addEquipmentModal .cs-extra-field label{font-size:12px;font-weight:700}
      #addEquipmentModal .cs-extra-field input,#addEquipmentModal .cs-extra-field select{width:100%;height:42px;border:1px solid #bcc9c6;border-radius:8px;padding:8px 10px;background:#f8faff}
      @media(max-width:1250px){.cs-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(max-width:850px){.cs-sidebar{width:220px}.cs-shell{margin-left:220px}.cs-header{left:220px}.cs-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cs-grid-4{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:620px){.cs-sidebar{position:relative;width:100%;height:auto}.cs-nav{grid-template-columns:repeat(2,minmax(0,1fr))}.cs-sidebar-footer{display:none}.cs-shell{margin-left:0}.cs-header{position:relative;left:auto;flex-wrap:wrap;padding:12px 16px}.cs-main{padding:20px 14px}.cs-grid,.cs-grid-4,.cs-two-col,.cs-form-grid{grid-template-columns:1fr}.cs-title{font-size:24px}.cs-hero{padding:20px}}
    `;
    document.head.append(style);
  }

  function postToParent(type, extra = {}) {
    if (window.parent !== window) {
      window.parent.postMessage({ source: "campusshare-page", type, ...extra }, window.location.origin);
      return true;
    }
    return false;
  }

  async function logout() {
    const button = $("#staffLogoutButton");
    if (button) { button.disabled = true; button.textContent = "Signing out…"; }
    try {
      const { error } = await db().auth.signOut();
      if (error) throw error;
      if (!postToParent("staff-logout")) location.href = "../index.html";
    } catch (error) {
      console.error("Staff logout failed:", error);
      toast(error.message || "Could not log out.");
      if (button) { button.disabled = false; button.textContent = "Log out"; }
    }
  }

  function renderShell() {
    const current = page();
    const active = current === "equipment.html" ? "equipment"
      : current === "requests.html" ? "requests"
      : current === "calendar.html" ? "calendar"
      : current === "history.html" ? "history" : "dashboard";

    const aside = $("aside");
    if (aside) {
      aside.className = "cs-sidebar";
      aside.innerHTML = `
        <a class="cs-brand" href="dashboard.html" aria-label="CampusShare home">${logoMarkup}</a>
        <div class="cs-sidebar-tag">Staff Portal</div>
        <nav class="cs-nav" aria-label="Staff navigation">
          <div class="cs-nav-label">Main Menu</div>
          <a href="dashboard.html" class="${active === "dashboard" ? "active" : ""}"><span class="material-symbols-outlined">grid_view</span>Dashboard</a>
          <a href="equipment.html" class="${active === "equipment" ? "active" : ""}"><span class="material-symbols-outlined">inventory_2</span>My Equipment</a>
          <a href="requests.html" class="${active === "requests" ? "active" : ""}"><span class="material-symbols-outlined">event_available</span>Booking Requests</a>
          <a href="calendar.html" class="${active === "calendar" ? "active" : ""}"><span class="material-symbols-outlined">calendar_month</span>Calendar</a>
          <a href="history.html" class="${active === "history" ? "active" : ""}"><span class="material-symbols-outlined">history</span>Equipment History</a>
        </nav>
        <div class="cs-sidebar-footer">CampusShare · Staff Workspace</div>
      `;
    }

    const header = $("header");
    if (header) {
      const title = active === "equipment" ? "My Equipment"
        : active === "requests" ? "Booking Requests"
        : active === "calendar" ? "Calendar"
        : active === "history" ? "Equipment History" : "Staff Dashboard";
      header.className = "cs-header";
      header.innerHTML = `
        <div class="cs-crumb">CampusShare <span class="mx-2">/</span> <strong>${title}</strong></div>
        <div class="cs-row" style="justify-content:flex-end;flex-wrap:nowrap">
          <div class="cs-profile">
            <span class="cs-avatar" id="staffProfileInitial">—</span>
            <span class="cs-profile-copy">
              <strong id="staffDisplayName">Loading profile…</strong>
              <span id="staffDepartment">Loading department…</span>
              <span id="staffEmail"></span>
            </span>
          </div>
          <button id="staffLogoutButton" type="button">Log out</button>
        </div>
      `;
      $("#staffLogoutButton")?.addEventListener("click", logout);
    }

    const shell = $(".pl-72") || $("body > div");
    if (shell) shell.className = "cs-shell";
    const main = $("main");
    if (main) main.className = "cs-main";
    return main;
  }

  async function authenticateStaff() {
    if (!db()) throw new Error("Supabase is not initialized. Check the Supabase script order.");

    const { data, error } = await db().auth.getUser();
    if (error) throw error;
    if (!data?.user) {
      postToParent("staff-logout");
      if (window.parent === window) location.href = "../index.html";
      throw new Error("Your session has expired. Please sign in again.");
    }
    state.user = data.user;

    const metadata = state.user.user_metadata || {};
    state.profile = {
      id: state.user.id,
      full_name: metadata.full_name || metadata.name || state.user.email || "Staff member",
      email: state.user.email || "",
      department: metadata.department || "Department not provided",
      role: state.user.app_metadata?.role || ""
    };
    renderProfile();

    const { data: profile, error: profileError } = await db()
      .from("profiles")
      .select("id, full_name, email, department, role")
      .eq("id", state.user.id)
      .maybeSingle();

    if (profileError) throw new Error(`Could not load your staff profile: ${profileError.message}`);
    if (!profile) throw new Error("Your CampusShare profile was not found.");

    const role = String(profile.role || "").toLowerCase();
    if (!["owner", "admin"].includes(role)) {
      await db().auth.signOut();
      postToParent("staff-logout");
      throw new Error("This account does not have approved staff access.");
    }
    state.profile = profile;
    renderProfile();
  }

  function renderProfile() {
    const name = state.profile?.full_name || state.user?.email || "Staff member";
    const email = state.profile?.email || state.user?.email || "";
    const department = state.profile?.department || "Department not provided";
    const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "S";
    setText("#staffDisplayName", name);
    setText("#staffDepartment", department);
    setText("#staffEmail", email);
    setText("#staffProfileInitial", initials);
  }

  // --------------------------------------------------
  // FETCH LIVE DATA
  // --------------------------------------------------

  async function loadCategories() {
    const { data, error } = await db().from("categories").select("id, category_name").order("category_name", { ascending: true });
    if (error) throw error;
    state.categories = data || [];
  }

  async function loadEquipment() {
    const { data, error } = await db()
      .from("resources")
      .select("id, name, description, category_id, total_quantity, available_quantity, owner_id, condition, status, created_at, location, image_url")
      .eq("owner_id", state.user.id)
      .order("created_at", { ascending: false });
