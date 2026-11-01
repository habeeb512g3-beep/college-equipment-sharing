(() => {
  "use strict";

  // CampusShare - Borrowed Equipment
  // Only the signed-in student's real borrow_records are displayed.
  // The current schema does not contain strikes, QR passes, extension requests,
  // custodian names, opening hours, return protocols, serial numbers or checkout
  // condition snapshots. Those demo-only fields/actions are therefore removed.

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const state = {
    client: null,
    user: null,
    profile: null,
    requests: [],
    requestItems: [],
    borrowRecords: [],
    resources: new Map(),
    categories: new Map(),
    images: new Map(),
    activeLoans: [],
    toastTimer: null,
    countdownTimer: null
  };

  const el = {
    profileButton: $(".profile-button"),
    profileAvatar: $(".profile-button .avatar"),
    profileCopy: $(".profile-copy"),
    summaryCards: $(".summary-cards"),
    dueAlert: $(".due-alert"),
    primaryColumn: $(".primary-column"),
    originalLoanCard: $(".loan-card"),
    rightColumn: $(".right-column"),
    browseCta: $(".browse-cta"),
    modalBackdrop: $("#modalBackdrop"),
    modalTitle: $("#modalTitle"),
    modalText: $("#modalText"),
    modalIcon: $("#modalIcon"),
    modalExtra: $("#modalExtra"),
    modalConfirm: $("#modalConfirm"),
    toast: $("#toast")
  };

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function showToast(message, isError = false) {
    if (!el.toast) return;

    el.toast.textContent = message;
    el.toast.classList.toggle("error", Boolean(isError));
    el.toast.classList.add("show");

    clearTimeout(state.toastTimer);

    state.toastTimer = setTimeout(() => {
      el.toast.classList.remove("show");
    }, 3500);
  }

  function initials(name) {
    return String(name || "Student")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join("") || "ST";
  }

  function formatDate(value, includeTime = false) {
    if (!value) return "Not recorded";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not recorded";
    }

    return new Intl.DateTimeFormat(
      undefined,
      includeTime
        ? { dateStyle: "medium", timeStyle: "short" }
        : { dateStyle: "medium" }
    ).format(date);
  }

  function shortId(value) {
    return String(value || "")
      .replace(/-/g, "")
      .slice(0, 8)
      .toUpperCase();
  }

  function numeric(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function categoryFor(resource) {
    return resource?.category_id
      ? state.categories.get(resource.category_id) ||
        "Category not recorded"
      : "Category not recorded";
  }

  function imageFor(resource) {
    if (!resource) return "";

    const raw =
      resource.image_url ||
      state.images.get(resource.id) ||
      "";

    if (!raw) return "";

    try {
      const parsed = new URL(
        String(raw),
        window.location.href
      );

      return ["https:", "http:"].includes(parsed.protocol)
        ? parsed.href
        : "";

    } catch (_) {
      return "";
    }
  }

  function requestForItem(item) {
    return state.requests.find(
      request => request.id === item.request_id
    ) || null;
  }

  function itemForLoan(loan) {
    return state.requestItems.find(
      item => item.id === loan.request_item_id
    ) || null;
  }

  function resourceForLoan(loan) {
    const item = itemForLoan(loan);

    return item
      ? state.resources.get(item.resource_id) || null
      : null;
  }

  function outstandingQuantity(loan) {
    return Math.max(
      0,
      numeric(loan.quantity_borrowed) -
      numeric(loan.quantity_returned)
    );
  }

  function isLoanActive(loan) {
    const status = String(loan.return_status || "")
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    const completed = [
      "returned",
      "complete",
      "completed",
      "closed",
      "fully_returned"
    ];

    return (
      outstandingQuantity(loan) > 0 &&
      !loan.returned_at &&
      !completed.includes(status)
    );
  }

  function dueDateFor(loan) {
    if (loan.due_date) return loan.due_date;

    const item = itemForLoan(loan);
    const request = item ? requestForItem(item) : null;

    return request?.due_date || null;
  }

  function updateStudentIdentity() {
    const metadata = state.user?.user_metadata || {};

    const name =
      state.profile?.full_name ||
      metadata.full_name ||
      metadata.fullName ||
      state.user?.email?.split("@")[0] ||
      "Student";

    const email =
      state.profile?.email ||
      state.user?.email ||
      "";

    const department =
      state.profile?.department ||
      metadata.department ||
      "Student account";

    if (el.profileAvatar) {
      el.profileAvatar.textContent = initials(name);
      el.profileAvatar.setAttribute("aria-label", name);
    }

    if (el.profileCopy) {
      const nameElement = $("b, strong", el.profileCopy);
      const subElement = $("small", el.profileCopy);

      if (nameElement) nameElement.textContent = name;
      if (subElement) subElement.textContent = department;
    }

    if (el.profileButton) {
      el.profileButton.title = email;
    }
  }

  function injectStyles() {
    if (
      document.getElementById(
        "campusshare-borrowed-live-styles"
      )
    ) return;

    const style = document.createElement("style");

    style.id = "campusshare-borrowed-live-styles";

    style.textContent = `
      .borrowed-live-list {
        display: grid;
        gap: 14px;
      }

      .borrowed-empty {
        border: 1px dashed #d6e0ed;
        border-radius: 10px;
        background: #fff;
        padding: 34px 22px;
        text-align: center;
        color: #64748b;
        box-shadow: var(--shadow);
      }

      .borrowed-empty .empty-icon {
        width: 42px;
        height: 42px;
        margin: 0 auto 12px;
        border-radius: 12px;
        background: #edf4ff;
        color: #2768c9;
        display: grid;
        place-items: center;
        font-size: 22px;
      }

      .borrowed-empty h2 {
        margin: 0 0 7px;
        font: 800 16px Manrope, sans-serif;
        color: #17345d;
      }

      .borrowed-empty p {
        margin: 0;
        font-size: 11px;
        line-height: 1.6;
      }

      .live-equipment-image {
        width: 100%;
        height: 190px;
        object-fit: contain;
        border-radius: 8px;
        background: #f1f5fa;
        border: 1px solid #e5ebf3;
      }

      .live-no-image {
        height: 190px;
        border-radius: 8px;
        background: #f1f5fa;
        border: 1px dashed #d9e2ee;
        display: grid;
        place-items: center;
        text-align: center;
        padding: 12px;
        color: #8090a5;
        font-size: 10px;
      }

      .live-loan-meta {
        display: grid;
        grid-template-columns: 1fr 1fr;
        border: 1px solid #e6ebf2;
        border-radius: 7px;
        overflow: hidden;
      }

      .live-loan-meta > div {
        min-width: 0;
        padding: 8px 9px;
        border-bottom: 1px solid #e8edf3;
      }

      .live-loan-meta > div:nth-child(odd) {
        border-right: 1px solid #e8edf3;
      }

      .live-loan-meta > div:nth-last-child(-n+2) {
        border-bottom: 0;
      }

      .live-loan-meta small {
        display: block;
        color: #78879c;
        font-size: 8px;
        margin-bottom: 3px;
      }

      .live-loan-meta b {
        display: block;
        color: #334b6d;
        font-size: 9px;
        line-height: 1.4;
        overflow-wrap: anywhere;
      }

      .live-loan-note {
        display: flex;
        gap: 8px;
        margin-top: 9px;
        padding: 9px;
        background: #f0f6ff;
        border: 1px solid #e1edff;
        border-radius: 7px;
        color: #536984;
        font-size: 9px;
        line-height: 1.5;
      }

      .live-loan-note strong {
        color: #315987;
      }

      .live-loan-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 11px;
      }

      .live-loan-actions button {
        border: 1px solid #d8e3f2;
        background: #f7faff;
        color: #245da7;
        border-radius: 6px;
        padding: 8px 11px;
        font-size: 9px;
        font-weight: 700;
        cursor: pointer;
      }

      .live-loan-actions button:hover {
        background: #eaf2ff;
      }

      .live-location-list {
        display: grid;
        gap: 8px;
        margin: 10px 0 0;
        padding: 0;
        list-style: none;
      }

      .live-location-list li {
        border: 1px solid #e7edf5;
        border-radius: 7px;
        padding: 9px;
        font-size: 10px;
        color: #526781;
      }

      .live-location-list strong {
        display: block;
        color: #29476f;
        margin-bottom: 3px;
      }

      .live-location-note {
        color: #7a8799;
        font-size: 9px;
        line-height: 1.5;
        margin-top: 10px;
      }

      .borrowed-dynamic-alert[hidden] {
        display: none !important;
      }

      .borrowed-modal-details {
        padding: 12px;
        background: #f4f7fb;
        border: 1px solid #e5ebf3;
        border-radius: 8px;
        color: #425975;
        font-size: 11px;
        line-height: 1.8;
      }

      .borrowed-modal-details strong {
        color: #18375f;
      }

      @media(max-width:560px) {
        .live-loan-meta {
          grid-template-columns: 1fr;
        }

        .live-loan-meta > div,
        .live-loan-meta > div:nth-child(odd) {
          border-right: 0;
          border-bottom: 1px solid #e8edf3;
        }

        .live-loan-meta > div:last-child {
          border-bottom: 0;
        }
      }
    `;

    document.head.append(style);
  }

  function clearDemoContent() {
    // Remove the hard-coded example loan.
    el.originalLoanCard?.remove();

    if (el.dueAlert) {
      el.dueAlert.hidden = true;
    }

    if (el.rightColumn) {
      el.rightColumn.replaceChildren();
    }

    // Replace the sample statistics with real-data labels.
    const cards = $$(".summary-card", el.summaryCards || document);

    if (cards[0]) {
      const label = $(".summary-label", cards[0]);
      const value = $("strong", cards[0]);

      if (label) label.textContent = "Active in custody";
      if (value) value.textContent = "—";
    }

    if (cards[1]) {
      const label = $(".summary-label", cards[1]);
      const value = $("strong", cards[1]);

      if (label) label.textContent = "Next due date";
      if (value) value.textContent = "—";
    }

    if (cards[2]) {
      const label = $(".summary-label", cards[2]);
      const value = $("strong", cards[2]);

      if (label) label.textContent = "Returned units";
      if (value) value.textContent = "—";

      const note = $("em", cards[2]);
      if (note) note.remove();
    }

    const subtitle = $(".page-subtitle");

    if (subtitle) {
      subtitle.textContent =
        "Equipment records with quantities still in your custody, based on your CampusShare borrowing history.";
    }

    const heading = $(".page-heading h1");

    if (heading) {
      heading.textContent = "Currently Borrowed Equipment";
    }

    // Remove the fictional contact details.
    const help = $(".sidebar-help");

    if (help) {
      const paragraph = $("p", help);
      const link = $("a", help);

      if (paragraph) {
        paragraph.textContent =
          "Questions about an equipment loan? Contact your campus equipment administrator.";
      }

      if (link) {
        link.removeAttribute("href");
        link.textContent = "Campus equipment support";

        link.addEventListener("click", event => {
          event.preventDefault();
        });
      }
    }

    // Replace examples in the Browse Equipment call-to-action.
    if (el.browseCta) {
      const title = $("h3", el.browseCta);
      const description = $("p", el.browseCta);

      if (title) {
        title.textContent = "Need another item?";
      }

      if (description) {
        description.textContent =
          "Browse the equipment currently listed in your CampusShare inventory.";
      }
    }

    if (el.primaryColumn) {
      const list = document.createElement("div");

      list.id = "borrowedRecordsList";
      list.className = "borrowed-live-list";

      el.primaryColumn.insertBefore(
        list,
        el.browseCta || null
      );
    }

    // Show real equipment locations instead of fictional lab locations.
    if (el.rightColumn) {
      el.rightColumn.innerHTML = `
        <section class="side-card" id="borrowedLocationsCard">
          <div class="side-card-heading">
            <span class="side-icon">⌖</span>
            <div>
              <h3>Your equipment locations</h3>
              <p>FROM YOUR BORROWED RECORDS</p>
            </div>
          </div>

          <ul class="live-location-list" id="borrowedLocationsList"></ul>

          <p class="live-location-note">
            These are the locations recorded on the equipment listings.
            Confirm return instructions with the equipment owner or campus administrator.
          </p>
        </section>

        <section class="side-card">
          <div class="side-card-heading">
            <span class="side-icon">ⓘ</span>
            <div>
              <h3>About this page</h3>
              <p>LIVE BORROWING RECORDS</p>
            </div>
          </div>

          <p class="side-intro">
            Only loans linked to your signed-in student account are displayed.
            Outstanding quantity is calculated from quantity borrowed minus quantity returned.
          </p>
        </section>
      `;
    }

    // Remove features for which the current database has no supporting records.
    [
      "#extensionBtn",
      "#qrBtn",
      "#issueBtn",
      "#contactBtn",
      "#mapBtn",
      "#viewDropoff"
    ].forEach(selector => {
      const node = $(selector);
      if (node) node.remove();
    });

    $(".loan-actions")?.remove();
    $(".renewal-banner")?.remove();

    // Hide the unused Lab Manager pill.
    $(".muted-pill")?.remove();

    $(".notification-button")?.addEventListener("click", () => {
      showToast(
        "Notifications are available from your Student Portal dashboard."
      );
    });

    const footer = $(".page-footer");

    if (footer) {
      footer.innerHTML =
        `CampusShare · Academic Asset Directory <span>Borrowing information shown here comes from your account records.</span>`;
    }
  }

  function showModal(title, text, content) {
    if (!el.modalBackdrop) return;

    el.modalTitle.textContent = title;
    el.modalText.textContent = text;
    el.modalIcon.textContent = "▣";
    el.modalExtra.innerHTML = content;
    el.modalConfirm.textContent = "Close";

    el.modalBackdrop.hidden = false;
    document.body.style.overflow = "hidden";

    el.modalConfirm.focus();
  }

  function closeModal() {
    if (el.modalBackdrop) {
      el.modalBackdrop.hidden = true;
    }

    if (el.modalExtra) {
      el.modalExtra.innerHTML = "";
    }

    document.body.style.overflow = "";
  }

  function renderSummary() {
    const activeUnits = state.activeLoans.reduce(
      (sum, loan) => sum + outstandingQuantity(loan),
      0
    );

    const returnedUnits = state.borrowRecords.reduce(
      (sum, loan) =>
        sum + Math.max(0, numeric(loan.quantity_returned)),
      0
    );

    const nextLoan = [...state.activeLoans]
      .filter(loan => dueDateFor(loan))
      .sort((a, b) =>
        new Date(dueDateFor(a)) - new Date(dueDateFor(b))
      )[0] || null;

    const cards = $$(".summary-card", el.summaryCards || document);

    if (cards[0]) {
      const value = $("strong", cards[0]);

      if (value) {
        value.innerHTML =
          `${activeUnits} <small>${activeUnits === 1 ? "Unit" : "Units"}</small>`;
      }
    }

    if (cards[1]) {
      const value = $("strong", cards[1]);
      const due = nextLoan ? dueDateFor(nextLoan) : null;

      if (value) {
        value.innerHTML = due
          ? `${escapeHTML(
              new Intl.DateTimeFormat(undefined, {
                month: "short",
                day: "2-digit"
              }).format(new Date(due))
            )}<small><br>${new Date(due).getFullYear()}</small>`
          : `— <small><br>No active due date</small>`;
      }
    }

    if (cards[2]) {
      const value = $("strong", cards[2]);

      if (value) {
        value.innerHTML =
          `${returnedUnits} <small>${returnedUnits === 1 ? "Unit" : "Units"}</small>`;
      }
    }

    renderDueAlert(nextLoan);
  }

  function renderDueAlert(nextLoan) {
    if (!el.dueAlert) return;

    if (!nextLoan) {
      el.dueAlert.hidden = true;
      return;
    }

    const resource = resourceForLoan(nextLoan);
    const dueDate = dueDateFor(nextLoan);
    const due = dueDate ? new Date(dueDate) : null;

    const now = new Date();
    const overdue = due && due.getTime() < now.getTime();

    const dayDiff = due
      ? Math.ceil((due.getTime() - now.getTime()) / 86400000)
      : null;

    el.dueAlert.hidden = false;
    el.dueAlert.classList.add("borrowed-dynamic-alert");

    const small = $(".alert-copy small", el.dueAlert);
    const bold = $(".alert-copy b", el.dueAlert);

    if (small) {
      small.textContent = overdue
        ? `RETURN OVERDUE · ${formatDate(dueDate, true)}`
        : dayDiff === 0
          ? `RETURN DUE TODAY · ${formatDate(dueDate, true)}`
          : `NEXT RETURN · ${dayDiff} calendar day${dayDiff === 1 ? "" : "s"} remaining`;
    }

    if (bold) {
      bold.textContent =
        `${resource?.name || "Borrowed equipment"} · ${overdue ? "was due" : "is due"} ${formatDate(dueDate, true)}${resource?.location ? ` · Recorded location: ${resource.location}` : ""}.`;
    }
  }

  function countdownText(dueDate) {
    if (!dueDate) return "No due date recorded";

    const remaining = new Date(dueDate).getTime() - Date.now();

    if (!Number.isFinite(remaining)) {
      return "No due date recorded";
    }

    if (remaining <= 0) {
      const overdue = Math.abs(remaining);

      const days = Math.floor(overdue / 86400000);
      const hours = Math.floor(
        (overdue % 86400000) / 3600000
      );

      return days > 0
        ? `Overdue by ${days}d ${hours}h`
        : `Overdue by ${hours}h`;
    }

    const days = Math.floor(remaining / 86400000);

    const hours = Math.floor(
      (remaining % 86400000) / 3600000
    );

    const minutes = Math.floor(
      (remaining % 3600000) / 60000
    );

    return `${days}d ${hours}h : ${minutes}m remaining`;
  }

  function loanCardHTML(loan) {
    const item = itemForLoan(loan);
    const request = item ? requestForItem(item) : null;
    const resource = resourceForLoan(loan);

    const category = categoryFor(resource);
    const image = imageFor(resource);

    const borrowed = numeric(loan.quantity_borrowed);
    const returned = numeric(loan.quantity_returned);
    const outstanding = outstandingQuantity(loan);

    const dueDate = dueDateFor(loan);

    const isOverdue =
      dueDate && new Date(dueDate).getTime() < Date.now();

    const returnStatus = loan.return_status
      ? String(loan.return_status).replace(/[_-]+/g, " ")
      : "Active in possession";

    const location =
      resource?.location || "No equipment location recorded";

    const condition =
      resource?.condition || "No condition information recorded";

    const photo = image
      ? `<img class="live-equipment-image"
           src="${escapeHTML(image)}"
           alt="${escapeHTML(resource?.name || "Borrowed equipment")}"
           loading="lazy">`
      : `<div class="live-no-image">No equipment image has been uploaded</div>`;

    const meta = [
      ["Checkout timestamp", formatDate(loan.borrowed_at, true)],
      ["Quantity borrowed", borrowed],
      ["Quantity returned", returned],
      ["Quantity still in custody", outstanding],
      ["Scheduled return", formatDate(dueDate, true)],
      ["Recorded equipment location", location],
      ["Borrow record", shortId(loan.id)],
      ["Request reference", request ? shortId(request.id) : "Not linked"]
    ];

    return `
      <article class="loan-card live-loan-card"
        data-loan-id="${escapeHTML(loan.id)}">

        <div class="loan-topline">

          <span class="status-pill active-status">
            <i></i>${escapeHTML(returnStatus)}
          </span>

          <span class="asset-id">
            Borrow record: ${escapeHTML(shortId(loan.id))}
          </span>

          <span class="countdown live-countdown ${isOverdue ? "overdue" : ""}"
            data-due="${escapeHTML(dueDate || "")}">
            ${escapeHTML(countdownText(dueDate))}
          </span>

        </div>

        <div class="loan-main">

          <div class="equipment-column">

            <div class="equipment-photo live-equipment-photo">
              ${photo}
              <span class="photo-caption">
                ${escapeHTML(category)}
              </span>
            </div>

            <div class="serial-tag">
              Borrow record ID:
              <b>${escapeHTML(shortId(loan.id))}</b>
            </div>

          </div>

          <div class="loan-details">

            <div class="department-label">
              ${escapeHTML(category)}
            </div>

            <h2>
              ${escapeHTML(resource?.name || "Equipment record")}
            </h2>

            <div class="meta-grid live-loan-meta">

              ${meta.map(([label, value]) => `
                <div>
                  <small>${escapeHTML(label)}</small>
                  <b>${escapeHTML(value)}</b>
                </div>
              `).join("")}

            </div>

            <div class="live-loan-note">
              <span>ⓘ</span>
              <div>
                <strong>Recorded equipment condition:</strong>
                ${escapeHTML(condition)}.
                This is the current condition on the equipment listing,
                not a checkout inspection report.
              </div>
            </div>

            <div class="live-loan-actions">
              <button type="button"
                data-loan-details="${escapeHTML(loan.id)}">
                View loan details
              </button>
            </div>

          </div>

        </div>

      </article>
    `;
  }

  function renderActiveLoans() {
    const list = $("#borrowedRecordsList");

    if (!list) return;

    if (!state.activeLoans.length) {
      list.innerHTML = `
        <section class="borrowed-empty">

          <div class="empty-icon">✓</div>

          <h2>No equipment currently borrowed</h2>

          <p>
            Your account has no outstanding borrowed quantities.
            When a loan is issued to you, it will appear here
            with its actual checkout and due dates.
          </p>

        </section>
      `;

      return;
    }

    list.innerHTML =
      state.activeLoans.map(loanCardHTML).join("");

    updateCountdowns();
  }

  function updateCountdowns() {
    $$(".live-countdown").forEach(node => {
      node.textContent = countdownText(node.dataset.due);

      node.classList.toggle(
        "overdue",
        Boolean(node.dataset.due) &&
        new Date(node.dataset.due).getTime() < Date.now()
      );
    });
  }

  function renderLocations() {
    const list = $("#borrowedLocationsList");

    if (!list) return;

    const locations = new Map();

    state.activeLoans.forEach(loan => {
      const resource = resourceForLoan(loan);
      const location = resource?.location;

      if (!location) return;

      if (!locations.has(location)) {
        locations.set(location, new Set());
      }

      locations.get(location).add(
        resource?.name || "Equipment"
      );
    });

    if (!locations.size) {
      list.innerHTML =
        `<li>No equipment locations are recorded for your active loans.</li>`;

      return;
    }

    list.innerHTML = [...locations.entries()]
      .map(([location, names]) => `
        <li>
          <strong>${escapeHTML(location)}</strong>
          ${escapeHTML([...names].join(", "))}
        </li>
      `).join("");
  }

  function viewLoanDetails(loan) {
    const item = itemForLoan(loan);
    const request = item ? requestForItem(item) : null;
    const resource = resourceForLoan(loan);

    const details = [
      ["Equipment", resource?.name || "Not available"],
      ["Category", categoryFor(resource)],
      ["Checkout timestamp", formatDate(loan.borrowed_at, true)],
      ["Due date", formatDate(dueDateFor(loan), true)],
      ["Quantity borrowed", numeric(loan.quantity_borrowed)],
      ["Quantity returned", numeric(loan.quantity_returned)],
      ["Quantity outstanding", outstandingQuantity(loan)],
      ["Return status", loan.return_status || "Not recorded"],
      ["Equipment location", resource?.location || "Not recorded"],
      ["Borrow record ID", loan.id],
      ["Booking request ID", request?.id || "Not linked"]
    ];

    const markup = `
      <div class="borrowed-modal-details">
        ${details.map(([label, value]) => `
          <div>
            <strong>${escapeHTML(label)}:</strong>
            ${escapeHTML(value)}
          </div>
        `).join("")}
      </div>
    `;

    showModal(
      "Borrow record details",
      "These values are read from your CampusShare borrowing records.",
      markup
    );
  }

  async function waitForSupabase(maxAttempts = 120) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (
        window.supabaseClient?.auth &&
        typeof window.supabaseClient.from === "function"
      ) {
        return window.supabaseClient;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(
      "Supabase did not initialize. Check the script tags in borrowed/index.html."
    );
  }

  async function loadBorrowedData() {
    // Identify the signed-in student.
    const {
      data: authData,
      error: authError
    } = await state.client.auth.getUser();

    if (authError) throw authError;

    if (!authData?.user) {
      throw new Error(
        "Your session has expired. Please sign in again."
      );
    }

    state.user = authData.user;

    // Read the student's own profile.
    const {
      data: profile,
      error: profileError
    } = await state.client
      .from("profiles")
      .select("id, full_name, email, department, role")
      .eq("id", state.user.id)
      .maybeSingle();

    if (profileError) {
      console.warn(
        "Student profile could not be loaded:",
        profileError.message
      );
    }

    state.profile = profile || null;

    updateStudentIdentity();

    // First scope booking requests to the authenticated student.
    const {
      data: requests,
      error: requestsError
    } = await state.client
      .from("booking_requests")
      .select("id, student_id, request_date, start_date, due_date, status, created_at")
      .eq("student_id", state.user.id);

    if (requestsError) {
      throw new Error(
        `Could not read your booking requests: ${requestsError.message}`
      );
    }

    state.requests = Array.isArray(requests)
      ? requests
      : [];

    const requestIds = state.requests
      .map(row => row.id)
      .filter(Boolean);

    state.requestItems = [];
    state.borrowRecords = [];

    state.resources = new Map();
    state.categories = new Map();
    state.images = new Map();

    // Load equipment line items belonging to this student's requests.
    if (requestIds.length) {
      const {
        data: requestItems,
        error: itemsError
      } = await state.client
        .from("booking_request_items")
        .select("id, request_id, resource_id, requested_quantity, approved_quantity, item_status")
        .in("request_id", requestIds);

      if (itemsError) {
        throw new Error(
          `Could not read your requested equipment: ${itemsError.message}`
        );
      }

      state.requestItems = Array.isArray(requestItems)
        ? requestItems
        : [];

      const itemIds = state.requestItems
        .map(row => row.id)
        .filter(Boolean);

      // Load actual checkouts for these request items.
      if (itemIds.length) {
        const {
          data: borrowRecords,
          error: borrowError
        } = await state.client
          .from("borrow_records")
          .select("id, request_item_id, quantity_borrowed, quantity_returned, borrowed_at, due_date, returned_at, return_status, handed_over_by, received_by")
          .in("request_item_id", itemIds)
          .order("borrowed_at", { ascending: false });

        if (borrowError) {
          throw new Error(
            `Could not read your borrowing records: ${borrowError.message}`
          );
        }

        state.borrowRecords = Array.isArray(borrowRecords)
          ? borrowRecords
          : [];
      }
    }

    // Load only equipment referenced by this student's borrowed records.
    const resourceIds = [
      ...new Set(
        state.requestItems
          .map(row => row.resource_id)
          .filter(Boolean)
      )
    ];

    if (resourceIds.length) {
      const {
        data: resources,
        error: resourcesError
      } = await state.client
        .from("resources")
        .select("id, name, description, category_id, total_quantity, available_quantity, owner_id, condition, status, created_at, location, image_url")
        .in("id", resourceIds);

      if (resourcesError) {
        throw new Error(
          `Could not read equipment details: ${resourcesError.message}`
        );
      }

      (resources || []).forEach(resource => {
        state.resources.set(resource.id, resource);
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
          error: categoriesError
        } = await state.client
          .from("categories")
          .select("id, category_name")
          .in("id", categoryIds);

        if (categoriesError) {
          console.warn(
            "Category lookup failed:",
            categoriesError.message
          );
        }

        (categories || []).forEach(category => {
          state.categories.set(
            category.id,
            category.category_name
          );
        });
      }

      const {
        data: images,
        error: imagesError
      } = await state.client
        .from("resource_images")
        .select("id, resource_id, image_url, created_at")
        .in("resource_id", resourceIds)
        .order("created_at", { ascending: false });

      if (imagesError) {
        console.warn(
          "Equipment image lookup failed:",
          imagesError.message
        );
      }

      (images || []).forEach(image => {
        if (!state.images.has(image.resource_id)) {
          state.images.set(
            image.resource_id,
            image.image_url
          );
        }
      });
    }

    // A loan is active only when quantity remains outstanding and it has
    // not been marked as fully returned.
    state.activeLoans = state.borrowRecords
      .filter(isLoanActive)
      .sort((a, b) => {
        const dateA = dueDateFor(a)
          ? new Date(dueDateFor(a)).getTime()
          : Infinity;

        const dateB = dueDateFor(b)
          ? new Date(dueDateFor(b)).getTime()
          : Infinity;

        return dateA - dateB;
      });

    renderSummary();
    renderActiveLoans();
    renderLocations();
  }

  function setupEvents() {
    $("#modalClose")?.addEventListener(
      "click",
      closeModal
    );

    $("#modalCancel")?.addEventListener(
      "click",
      closeModal
    );

    el.modalConfirm?.addEventListener(
      "click",
      closeModal
    );

    el.modalBackdrop?.addEventListener("click", event => {
      if (event.target === el.modalBackdrop) {
        closeModal();
      }
    });

    document.addEventListener("keydown", event => {
      if (
        event.key === "Escape" &&
        el.modalBackdrop &&
        !el.modalBackdrop.hidden
      ) {
        closeModal();
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        $(".global-search input")?.focus();
      }
    });

    $("#borrowedRecordsList")?.addEventListener("click", event => {
      const button = event.target.closest(
        "[data-loan-details]"
      );

      if (!button) return;

      const loan = state.activeLoans.find(
        row => row.id === button.dataset.loanDetails
      );

      if (loan) {
        viewLoanDetails(loan);
      }
    });

    // Navigation between pages is handled by portal-bridge.js.
    $(".browse-cta a")?.addEventListener("click", () => {
      // Do not prevent the parent portal navigation.
    });

    el.profileButton?.addEventListener("click", () => {
      const email =
        state.profile?.email ||
        state.user?.email ||
        "Student account";

      showToast(`Signed in as ${email}`);
    });

    $(".sidebar-help a")?.addEventListener("click", event => {
      event.preventDefault();

      showToast(
        "Please contact your campus equipment administrator for support."
      );
    });
  }

  async function init() {
    injectStyles();
    clearDemoContent();
    setupEvents();

    const list = $("#borrowedRecordsList");

    if (list) {
      list.innerHTML =
        '<p class="request-loading">Loading your borrowing records…</p>';
    }

    try {
      state.client = await waitForSupabase();

      await loadBorrowedData();

      state.countdownTimer = setInterval(
        updateCountdowns,
        60000
      );

    } catch (error) {
      console.error(
        "Borrowed Equipment page failed:",
        error
      );

      const target = $("#borrowedRecordsList");

      if (target) {
        target.innerHTML = `
          <section class="borrowed-empty">
            <div class="empty-icon">!</div>
            <h2>Unable to load borrowing records</h2>
            <p>${escapeHTML(
              error.message ||
              "Please refresh the page or sign in again."
            )}</p>
          </section>
        `;
      }

      showToast(
        error.message ||
          "Could not load your borrowing records.",
        true
      );
    }
  }

  init();

})();
