
(() => {
  "use strict";

  // CampusShare - My Equipment Requests
  // Displays only records belonging to the authenticated student.

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const state = {
    client: null,
    user: null,
    profile: null,
    requests: [],
    requestItems: [],
    resources: new Map(),
    categories: new Map(),
    images: new Map(),
    activeFilter: "all",
    selectedRequest: null,
    toastTimer: null
  };

  const ui = {
    list: $("#requestList"),
    tabs: $$(".tab"),
    search: $("#requestSearch"),
    globalSearch: $(".global-search input"),
    categoryFilter: $("#departmentFilter"),
    empty: $("#emptyState"),
    backdrop: $("#modalBackdrop"),
    modalTitle: $("#modalTitle"),
    modalDescription: $("#modalDescription"),
    modalBody: $("#modalBody"),
    modalActions: $("#modalActions"),
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

  function formatDate(value, withTime = false) {
    if (!value) return "Not provided";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not provided";
    }

    return new Intl.DateTimeFormat(
      undefined,
      withTime
        ? { dateStyle: "medium", timeStyle: "short" }
        : { dateStyle: "medium" }
    ).format(date);
  }

  function shortId(id) {
    return String(id || "")
      .replace(/-/g, "")
      .slice(0, 8)
      .toUpperCase();
  }

  function showToast(message, isError = false) {
    if (!ui.toast) return;

    ui.toast.textContent = message;
    ui.toast.classList.toggle("error", isError);
    ui.toast.classList.add("show");

    clearTimeout(state.toastTimer);

    state.toastTimer = setTimeout(() => {
      ui.toast.classList.remove("show");
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

    const profileCopy = $(".profile-copy");

    if (profileCopy) {
      const strong = $("strong", profileCopy);
      const small = $("small", profileCopy);

      if (strong) strong.textContent = name;
      if (small) small.textContent = department;
    }

    const avatar = $(".profile-button .avatar");

    if (avatar) {
      avatar.textContent = initials(name);
      avatar.setAttribute("aria-label", name);
    }

    const profileButton = $(".profile-button");

    if (profileButton) {
      profileButton.title = email;
    }
  }

  function installLiveRequestStyles() {
    if ($("#campusshare-live-request-styles")) return;

    const style = document.createElement("style");

    style.id = "campusshare-live-request-styles";

    style.textContent = `
      .request-item-live {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 9px;
        padding: 8px;
        border: 1px solid #edf1f6;
        border-radius: 7px;
        background: #fbfcfe;
      }

      .request-item-live .equipment-thumb,
      .request-item-placeholder {
        width: 64px;
        height: 52px;
        object-fit: cover;
        flex: 0 0 64px;
        border: 1px solid #e1e7ef;
        border-radius: 6px;
        background: #eef2f7;
      }

      .request-item-placeholder {
        display: grid;
        place-items: center;
        color: #7890b2;
        font-size: 20px;
      }

      .request-item-copy {
        min-width: 0;
        display: grid;
        gap: 4px;
      }

      .request-item-copy strong {
        font-size: 10px;
        color: #263b5d;
      }

      .request-item-copy small {
        font-size: 8px;
        line-height: 1.45;
        color: #72809a;
        overflow-wrap: anywhere;
      }

      .request-no-items,
      .request-loading {
        margin: 12px 0;
        padding: 12px;
        border: 1px dashed #dbe4f0;
        border-radius: 7px;
        color: #72809a;
        background: #fbfcfe;
        font-size: 10px;
      }

      .request-card.completed {
        border-left-color: #8b98aa;
      }

      .request-card[hidden],
      .right-column[hidden] {
        display: none !important;
      }
    `;

    document.head.append(style);
  }

  function clearHardCodedDemoContent() {
    // Remove the four fictional reservations from the original HTML.
    ui.list?.replaceChildren();

    // Reset all summary counts.
    [
      "activeCount",
      "readyCount",
      "reviewCount",
      "resolvedCount",
      "tabAll",
      "tabPending",
      "tabReady",
      "tabReview",
      "tabRejected",
      "tabCompleted"
    ].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.textContent = "0";
    });

    // The existing side cards contain fictional pickup protocols,
    // laboratory hubs and previously returned items.
    // No corresponding database tables exist in the supplied schema.
    const rightColumn = $(".right-column");

    if (rightColumn) {
      rightColumn.hidden = true;
      rightColumn.style.display = "none";
    }

    const contentGrid = $(".content-grid");

    if (contentGrid) {
      contentGrid.style.gridTemplateColumns = "minmax(0, 1fr)";
    }

    // Replace the fictional announcement with a real description.
    const announcement = $(".announcement");

    if (announcement) {
      const title = $(".announcement-copy strong", announcement);
      const paragraph = $(".announcement-copy p", announcement);

      if (title) {
        title.textContent = "Live student request records";
      }

      if (paragraph) {
        paragraph.textContent =
          "This page shows equipment requests saved to your CampusShare account.";
      }

      $(".text-button", announcement)?.remove();
      $("#pickupPolicyBtn", announcement)?.remove();
    }

    const footer = $(".page-footer > span");

    if (footer) {
      footer.textContent =
        `© ${new Date().getFullYear()} CampusShare · Academic Inventory Services`;
    }

    const heading = $(".page-heading h1");

    if (heading) {
      heading.textContent = "My Equipment Requests";
    }

    const intro = $(".page-heading > div > p");

    if (intro) {
      intro.textContent =
        "View the equipment requests submitted from your signed-in student account.";
    }

    // The database has categories, not academic department fields
    // on the booking request table.
    if (ui.categoryFilter) {
      ui.categoryFilter.innerHTML =
        '<option value="all">All Equipment Categories</option>';

      ui.categoryFilter.setAttribute(
        "aria-label",
        "Filter by equipment category"
      );
    }

    if (ui.empty) {
      ui.empty.hidden = true;

      const emptyHeading = $("strong", ui.empty);
      const emptyText = $("p", ui.empty);

      if (emptyHeading) {
        emptyHeading.textContent = "No requests yet";
      }

      if (emptyText) {
        emptyText.textContent =
          "Equipment requests you submit will appear here.";
      }
    }

    installLiveRequestStyles();
  }

  function normalizeStatus(requestStatus) {
    const raw = String(requestStatus || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    if (/reject|declin|cancel|denied/.test(raw)) {
      return "rejected";
    }

    if (/complete|returned|closed|fulfilled/.test(raw)) {
      return "completed";
    }

    if (/ready|approved|scheduled|collect|borrowed|issued/.test(raw)) {
      return "ready";
    }

    if (/review|faculty|endorsement/.test(raw)) {
      return "review";
    }

    if (/pending|submitted|new|requested/.test(raw)) {
      return "pending";
    }

    return "other";
  }

  function statusLabel(request) {
    const status = normalizeStatus(request.status);

    if (status === "pending") return "Pending approval";
    if (status === "review") return "Under review";
    if (status === "ready") return "Approved / ready";
    if (status === "rejected") return "Rejected / cancelled";
    if (status === "completed") return "Completed";

    return String(request.status || "Status not set")
      .replace(/[_-]+/g, " ");
  }

  function statusClass(request) {
    const status = normalizeStatus(request.status);

    if (status === "ready") {
      return { card: "scheduled", pill: "status-ready" };
    }

    if (status === "rejected") {
      return { card: "rejected", pill: "status-rejected" };
    }

    if (status === "completed") {
      return { card: "completed", pill: "status-ready" };
    }

    return { card: "review", pill: "status-review" };
  }

  function getItemsForRequest(requestId) {
    return state.requestItems.filter(
      item => item.request_id === requestId
    );
  }

  function resourceForItem(item) {
    return state.resources.get(item.resource_id) || null;
  }

  function categoryForResource(resource) {
    if (!resource?.category_id) {
      return "Category not recorded";
    }

    return state.categories.get(resource.category_id) ||
      "Category not recorded";
  }

  function imageForResource(resource) {
    if (!resource) return "";

    const direct = resource.image_url || "";
    const related = state.images.get(resource.id) || "";
    const url = direct || related;

    if (!url) return "";

    try {
      const parsed = new URL(url, window.location.href);

      return ["https:", "http:"].includes(parsed.protocol)
        ? parsed.href
        : "";

    } catch (_) {
      return "";
    }
  }

  function requestSearchText(request) {
    const items = getItemsForRequest(request.id);

    const text = [
      request.id,
      request.status,
      request.request_date,
      request.start_date,
      request.due_date
    ];

    items.forEach(item => {
      const resource = resourceForItem(item);

      text.push(
        resource?.name,
        resource?.description,
        resource?.location,
        categoryForResource(resource),
        item.item_status,
        item.requested_quantity,
        item.approved_quantity
      );
    });

    return text.filter(Boolean).join(" ").toLowerCase();
  }

  function itemHTML(item) {
    const resource = resourceForItem(item);

    const name =
      resource?.name ||
      "Equipment details unavailable";

    const image = imageForResource(resource);

    const requested =
      Number(item.requested_quantity) || 0;

    const approved =
      Number(item.approved_quantity) || 0;

    const itemStatus = item.item_status
      ? String(item.item_status).replace(/[_-]+/g, " ")
      : "Not updated";

    return `
      <div class="request-item-live">

        ${image
          ? `<img
                class="equipment-thumb"
                src="${escapeHTML(image)}"
                alt="${escapeHTML(name)}"
                loading="lazy">`
          : `<div class="request-item-placeholder" aria-hidden="true">▣</div>`
        }

        <div class="request-item-copy">
          <strong>${escapeHTML(name)}</strong>

          <small>
            ${escapeHTML(categoryForResource(resource))}
            ${resource?.location
              ? ` · ${escapeHTML(resource.location)}`
              : ""
            }
          </small>

          <small>
            Requested quantity: ${requested}
            · Approved quantity: ${approved}
            · Item status: ${escapeHTML(itemStatus)}
          </small>
        </div>
      </div>
    `;
  }

  function requestCardHTML(request) {
    const items = getItemsForRequest(request.id);
    const style = statusClass(request);

    const canCancel = [
      "pending",
      "review"
    ].includes(normalizeStatus(request.status));

    const itemMarkup = items.length
      ? items.map(itemHTML).join("")
      : `<p class="request-no-items">
          No equipment line items are linked to this request.
        </p>`;

    const requestDate = formatDate(
      request.request_date || request.created_at,
      true
    );

    const startDate = formatDate(request.start_date);
    const dueDate = formatDate(request.due_date);

    const categoryNames = [
      ...new Set(
        items.map(item =>
          categoryForResource(resourceForItem(item))
        )
      )
    ];

    return `
      <article
        class="request-card ${style.card}"
        data-request-id="${escapeHTML(request.id)}"
        data-status="${normalizeStatus(request.status)}"
        data-categories="${escapeHTML(categoryNames.join("||"))}"
        data-search="${escapeHTML(requestSearchText(request))}">

        <div class="card-main">
          <div class="request-info">

            <div class="request-meta">
              <span>
                Request #${escapeHTML(shortId(request.id))}
                · ${escapeHTML(requestDate)}
              </span>

              <span class="status ${style.pill}">
                ● ${escapeHTML(statusLabel(request))}
              </span>
            </div>

            <div class="request-live-items">
              ${itemMarkup}
            </div>

            <div class="request-dates">
              <span>
                ◷ Requested:
                <b>${escapeHTML(requestDate)}</b>
              </span>

              <span>
                ▣ Period:
                <b>${escapeHTML(startDate)} – ${escapeHTML(dueDate)}</b>
              </span>
            </div>

          </div>
        </div>

        <div class="card-footer-actions">
          <span class="footer-note">
            ${items.length}
            equipment ${items.length === 1 ? "item" : "items"}
            in this request
          </span>

          <button
            class="soft-button"
            type="button"
            data-action="details"
            data-request-id="${escapeHTML(request.id)}">
            View Details
          </button>

          ${canCancel
            ? `<button
                class="soft-button danger-soft"
                type="button"
                data-action="cancel"
                data-request-id="${escapeHTML(request.id)}">
                Cancel Request
              </button>`
            : ""
          }
        </div>

      </article>
    `;
  }

  function updateCounts() {
    const counts = {
      all: state.requests.length,
      pending: 0,
      ready: 0,
      review: 0,
      rejected: 0,
      completed: 0
    };

    state.requests.forEach(request => {
      const status = normalizeStatus(request.status);

      if (Object.hasOwn(counts, status)) {
        counts[status]++;
      }
    });

    const values = {
      activeCount:
        counts.pending + counts.review + counts.ready,

      readyCount:
        counts.ready,

      reviewCount:
        counts.pending + counts.review,

      resolvedCount:
        counts.rejected + counts.completed,

      tabAll:
        counts.all,

      tabPending:
        counts.pending,

      tabReady:
        counts.ready,

      tabReview:
        counts.review,

      tabRejected:
        counts.rejected,

      tabCompleted:
        counts.completed
    };

    Object.entries(values).forEach(([id, value]) => {
      const element = document.getElementById(id);

      if (element) {
        element.textContent = String(value);
      }
    });
  }

  function updateEmptyState() {
    const total = state.requests.length;

    const visibleCards = ui.list
      ? $$(".request-card", ui.list).filter(card => !card.hidden).length
      : 0;

    if (!ui.empty) return;

    ui.empty.hidden = visibleCards > 0;

    if (visibleCards > 0) return;

    const heading = $("strong", ui.empty);
    const paragraph = $("p", ui.empty);

    if (heading) {
      heading.textContent =
        total === 0
          ? "No requests yet"
          : "No matching requests";
    }

    if (paragraph) {
      paragraph.textContent =
        total === 0
          ? "You have not submitted any equipment requests. When you request an item from Browse Equipment, it will appear here."
          : "No requests match the selected status, category or search term. Try clearing the filters.";
    }
  }

  function applyFilters() {
    const term =
      (ui.search?.value || "").trim().toLowerCase();

    const category =
      ui.categoryFilter?.value || "all";

    $$(".request-card", ui.list || document).forEach(card => {
      const statusMatch =
        state.activeFilter === "all" ||
        card.dataset.status === state.activeFilter ||
        (
          state.activeFilter === "pending" &&
          card.dataset.status === "other"
        );

      const categories =
        (card.dataset.categories || "")
          .split("||")
          .filter(Boolean);

      const categoryMatch =
        category === "all" ||
        categories.includes(category);

      const searchMatch =
        !term ||
        (card.dataset.search || "").includes(term) ||
        card.innerText.toLowerCase().includes(term);

      card.hidden = !(
        statusMatch &&
        categoryMatch &&
        searchMatch
      );
    });

    updateEmptyState();
  }

  function renderRequests() {
    if (!ui.list) return;

    ui.list.innerHTML =
      state.requests.map(requestCardHTML).join("");

    updateCounts();
    applyFilters();
  }

  function populateCategoryFilter() {
    if (!ui.categoryFilter) return;

    const categories = [
      ...new Set(
        state.requestItems.map(item => {
          const resource = resourceForItem(item);
          return categoryForResource(resource);
        }).filter(value =>
          value && value !== "Category not recorded"
        )
      )
    ].sort((a, b) => a.localeCompare(b));

    ui.categoryFilter.innerHTML =
      '<option value="all">All Equipment Categories</option>' +
      categories.map(category => `
        <option value="${escapeHTML(category)}">
          ${escapeHTML(category)}
        </option>
      `).join("");
  }

  function openModal({
    title,
    description,
    body = "",
    actions = '<button class="soft-button" data-close="true" type="button">Close</button>',
    symbol = "▣"
  }) {
    if (!ui.backdrop) return;

    ui.modalTitle.textContent = title;
    ui.modalDescription.textContent = description;
    ui.modalBody.innerHTML = body;
    ui.modalActions.innerHTML = actions;

    $("#modalSymbol").textContent = symbol;

    ui.backdrop.hidden = false;
    document.body.style.overflow = "hidden";

    $$('[data-close="true"]', ui.modalActions)
      .forEach(button => {
        button.addEventListener("click", closeModal);
      });
  }

  function closeModal() {
    if (ui.backdrop) {
      ui.backdrop.hidden = true;
    }

    document.body.style.overflow = "";
    state.selectedRequest = null;
  }

  function detailsHTML(request) {
    const items = getItemsForRequest(request.id);

    const itemDetails = items.map(item => {
      const resource = resourceForItem(item);

      return `
        <div class="modal-details">
          <strong>
            ${escapeHTML(resource?.name || "Equipment details unavailable")}
          </strong>
          <br>
          Category: ${escapeHTML(categoryForResource(resource))}
          <br>
          Location: ${escapeHTML(resource?.location || "Not recorded")}
          <br>
          Requested quantity: ${Number(item.requested_quantity) || 0}
          <br>
          Approved quantity: ${Number(item.approved_quantity) || 0}
          <br>
          Item status: ${escapeHTML(item.item_status || "Not updated")}
        </div>
      `;
    }).join("");

    return `
      <div class="modal-details">
        <strong>Request #${escapeHTML(shortId(request.id))}</strong>
        <br>
        Status: ${escapeHTML(statusLabel(request))}
        <br>
        Requested:
        ${escapeHTML(formatDate(request.request_date || request.created_at, true))}
        <br>
        Start date: ${escapeHTML(formatDate(request.start_date))}
        <br>
        Due date: ${escapeHTML(formatDate(request.due_date))}
      </div>

      ${itemDetails ||
        "<p>No equipment line items are linked to this request.</p>"
      }
    `;
  }

  function handleDetails(request) {
    state.selectedRequest = request;

    openModal({
      title: "Request details",
      description: "These details are loaded from your CampusShare records.",
      body: detailsHTML(request),
      symbol: "ⓘ"
    });
  }

  async function cancelRequest(request) {
  if (!request || !state.user) return;

  if (!confirm(
    "Cancel this equipment request? This will update its status in CampusShare."
  )) {
    return;
  }

  try {
    // Cancel the parent booking request.
    const { error: requestError } = await state.client
      .from("booking_requests")
      .update({ status: "cancelled" })
      .eq("id", request.id)
      .eq("student_id", state.user.id);

    if (requestError) throw requestError;

    // Cancel all item records belonging to this request.
    const { error: itemError } = await state.client
      .from("booking_request_items")
      .update({ item_status: "cancelled" })
      .eq("request_id", request.id);

    if (itemError) {
      console.error("Request cancelled, but item status update failed:", itemError);
      showToast(
        "The request was cancelled, but its item status could not be updated. Please contact the administrator.",
        true
      );
      await loadRequestData();
      return;
    }

    closeModal();
    showToast("Request cancelled.");
    await loadRequestData();

  } catch (error) {
    console.error("Could not cancel request:", error);
    showToast(
      error.message || "The request could not be cancelled.",
      true
    );
  }
}

  function setupEvents() {
    ui.tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        ui.tabs.forEach(item => {
          const selected = item === tab;

          item.classList.toggle("active", selected);

          item.setAttribute(
            "aria-selected",
            String(selected)
          );
        });

        state.activeFilter = tab.dataset.filter || "all";

        applyFilters();
      });
    });

    ui.search?.addEventListener("input", () => {
      if (ui.globalSearch) {
        ui.globalSearch.value = ui.search.value;
      }

      applyFilters();
    });

    ui.globalSearch?.addEventListener("input", () => {
      if (ui.search) {
        ui.search.value = ui.globalSearch.value;
      }

      applyFilters();
    });

    ui.categoryFilter?.addEventListener(
      "change",
      applyFilters
    );

    $("#resetFilters")?.addEventListener(
      "click",
      resetFilters
    );

    $("#clearEmptyFilters")?.addEventListener(
      "click",
      resetFilters
    );

    $("#modalClose")?.addEventListener(
      "click",
      closeModal
    );

    $("#modalCancel")?.addEventListener(
      "click",
      closeModal
    );

    ui.backdrop?.addEventListener("click", event => {
      if (event.target === ui.backdrop) {
        closeModal();
      }
    });

    document.addEventListener("keydown", event => {
      if (
        event.key === "Escape" &&
        ui.backdrop &&
        !ui.backdrop.hidden
      ) {
        closeModal();
      }

      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        ui.search?.focus();
      }
    });

    ui.list?.addEventListener("click", event => {
      const button = event.target.closest("[data-action]");

      if (!button) return;

      const request = state.requests.find(
        item => item.id === button.dataset.requestId
      );

      if (!request) return;

      if (button.dataset.action === "details") {
        handleDetails(request);

      } else if (button.dataset.action === "cancel") {
        state.selectedRequest = request;

        openModal({
          title: "Cancel this request?",
          description: "This updates the request status in your CampusShare account.",
          body: detailsHTML(request),

          actions: `
            <button class="soft-button" data-close="true" type="button">
              Keep request
            </button>

            <button class="button button-primary" id="confirmCancel" type="button">
              Confirm cancellation
            </button>
          `,

          symbol: "!"
        });

        $("#confirmCancel")?.addEventListener(
          "click",
          () => cancelRequest(request)
        );
      }
    });

    // Profile details come from the authenticated account.
    $(".profile-button")?.addEventListener("click", () => {
      const email =
        state.profile?.email ||
        state.user?.email ||
        "";

      showToast(
        email
          ? `Signed in as ${email}`
          : "Signed in student account"
      );
    });

    // Navigation between portal pages is handled by portal-bridge.js.
  }

  function resetFilters() {
    if (ui.search) ui.search.value = "";
    if (ui.globalSearch) ui.globalSearch.value = "";
    if (ui.categoryFilter) ui.categoryFilter.value = "all";

    state.activeFilter = "all";

    ui.tabs.forEach(tab => {
      const selected = tab.dataset.filter === "all";

      tab.classList.toggle("active", selected);

      tab.setAttribute(
        "aria-selected",
        String(selected)
      );
    });

    applyFilters();
  }

  async function waitForSupabaseClient(maxAttempts = 120) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (
        window.supabaseClient?.auth &&
        typeof window.supabaseClient.from === "function"
      ) {
        return window.supabaseClient;
      }

      await new Promise(resolve => {
        setTimeout(resolve, 100);
      });
    }

    throw new Error(
      "Supabase did not initialize. Check the script tags at the bottom of requests/index.html."
    );
  }

  async function loadRequestData() {
    // Only fetch the current student's booking requests.
    const {
      data: requests,
      error: requestError
    } = await state.client
      .from("booking_requests")
      .select("*")
      .eq("student_id", state.user.id)
      .order("created_at", { ascending: false });

    if (requestError) throw requestError;

    state.requests = Array.isArray(requests)
      ? requests
      : [];

    const requestIds = state.requests
      .map(request => request.id)
      .filter(Boolean);

    state.requestItems = [];
    state.resources = new Map();
    state.categories = new Map();
    state.images = new Map();

    // Load line items belonging to these requests.
    if (requestIds.length) {
      const {
        data: items,
        error: itemError
      } = await state.client
        .from("booking_request_items")
        .select("*")
        .in("request_id", requestIds);

      if (itemError) throw itemError;

      state.requestItems = Array.isArray(items)
        ? items
        : [];
    }

    const resourceIds = [
      ...new Set(
        state.requestItems
          .map(item => item.resource_id)
          .filter(Boolean)
      )
    ];

    // Load the actual equipment records.
    if (resourceIds.length) {
      const {
        data: resources,
        error: resourceError
      } = await state.client
        .from("resources")
        .select("*")
        .in("id", resourceIds);

      if (resourceError) throw resourceError;

      (resources || []).forEach(resource => {
        state.resources.set(resource.id, resource);
      });

      // Load categories for those equipment records.
      const categoryIds = [
        ...new Set(
          (resources || [])
            .map(resource => resource.category_id)
            .filter(Boolean)
        )
      ];

      if (categoryIds.length) {
        const {
          data: categories,
          error: categoryError
        } = await state.client
          .from("categories")
          .select("id, category_name")
          .in("id", categoryIds);

        if (categoryError) {
          console.warn(
            "Could not load categories:",
            categoryError.message
          );
        }

        (categories || []).forEach(category => {
          state.categories.set(
            category.id,
            category.category_name
          );
        });
      }

      // Load uploaded equipment images.
      const {
        data: images,
        error: imageError
      } = await state.client
        .from("resource_images")
        .select("resource_id, image_url, created_at")
        .in("resource_id", resourceIds)
        .order("created_at", { ascending: false });

      if (imageError) {
        console.warn(
          "Could not load equipment images:",
          imageError.message
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

    populateCategoryFilter();
    renderRequests();
  }

  async function init() {
    clearHardCodedDemoContent();
    setupEvents();

    if (ui.list) {
      ui.list.innerHTML =
        '<p class="request-loading">Loading your requests from CampusShare…</p>';
    }

    try {
      // The existing HTML loads Supabase after script.js.
      // Wait for that client to become available.
      state.client = await waitForSupabaseClient();

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

      // Load the signed-in student's profile.
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
          "Could not load student profile:",
          profileError.message
        );
      }

      state.profile = profile || null;

      updateStudentIdentity();

      await loadRequestData();

    } catch (error) {
      console.error(
        "My Requests could not load:",
        error
      );

      if (ui.list) {
        ui.list.replaceChildren();
      }

      if (ui.empty) {
        ui.empty.hidden = false;

        const heading = $("strong", ui.empty);
        const paragraph = $("p", ui.empty);

        if (heading) {
          heading.textContent = "Unable to load your requests";
        }

        if (paragraph) {
          paragraph.textContent =
            error.message || "Please refresh the page or sign in again.";
        }
      }

      updateCounts();

      showToast(
        error.message || "Could not load your requests from Supabase.",
        true
      );
    }
  }

  // Start by removing all static sample requests.
  // Then load records from the authenticated Supabase account.
  init();

})();
