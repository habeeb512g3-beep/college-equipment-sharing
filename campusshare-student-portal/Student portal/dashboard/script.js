
(() => {
  "use strict";

  // CampusShare student dashboard.
  // All dashboard information is loaded from the authenticated user's
  // Supabase profile and records. No example records are displayed.

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const state = {
    client: null,
    user: null,
    profile: null,
    resources: [],
    categories: [],
    resourceImages: [],
    requests: [],
    requestItems: [],
    borrowRecords: [],
    notifications: [],
    activityLogs: [],
    selectedResource: null,
    activeCategory: "all",
    sortNewestFirst: true,
    loading: false,
    toastTimer: null
  };

  const ui = {
    searchInput: $("#equipmentSearch"),
    equipmentGrid: $("#equipmentGrid"),
    emptyState: $("#emptyState"),
    filterDrawer: $("#filterDrawer"),
    availabilityFilter: $("#availabilityFilter"),
    locationFilter: $("#locationFilter"),
    filterCount: $("#filterCount"),
    categoryRow: $("#categoryRow"),
    toast: $("#toast"),
    requestModal: $("#requestModal"),
    reservationForm: $("#reservationForm"),
    notificationPopover: $("#notificationPopover"),
    notificationButton: $("#notificationButton"),
    profilePopover: $("#profilePopover"),
    profileButton: $("#profileButton"),
    activityTimeline: $(".activity-timeline"),
    sidebar: $("#sidebar"),
    mobileOverlay: $("#mobileOverlay")
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function formatDate(value, includeTime = false) {
    if (!value) return "Date not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Date not available";
    }

    const options = includeTime
      ? { dateStyle: "medium", timeStyle: "short" }
      : { dateStyle: "medium" };

    return new Intl.DateTimeFormat(undefined, options).format(date);
  }

  function formatStatus(value) {
    const text = String(value || "pending")
      .replace(/[_-]+/g, " ")
      .trim();

    return text.replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function showToast(message, isError = false) {
    if (!ui.toast) return;

    ui.toast.textContent = message;
    ui.toast.classList.toggle("error", Boolean(isError));
    ui.toast.classList.add("show");

    window.clearTimeout(state.toastTimer);

    state.toastTimer = window.setTimeout(() => {
      ui.toast.classList.remove("show");
    }, 4000);
  }

  function setText(element, value) {
    if (element) {
      element.textContent = value ?? "";
    }
  }

  function getMetadataValue(metadata, keys) {
    for (const key of keys) {
      const value = metadata?.[key];

      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        return String(value).trim();
      }
    }

    return "";
  }

  function getInitials(name) {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return parts
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join("") || "ST";
  }

  // Remove the example content immediately, before Supabase loads.
  function clearStaticExampleContent() {
    setText(
      $(".welcome-copy h1"),
      "Loading your profile..."
    );

    setText(
      $(".sidebar-user-copy strong"),
      "Loading..."
    );

    $$(".profile-popover > strong").forEach(element => {
      element.textContent = "Loading...";
    });

    $$(".profile-email").forEach(element => {
      element.textContent = "";
    });

    $$(".avatar, .avatar-mini, .avatar-top, .avatar-sidebar, .profile-photo span")
      .forEach(element => {
        element.textContent = "…";
      });

    const studentId = $(".student-id");

    if (studentId) {
      studentId.hidden = true;
    }

    const bannerDetails = $(".welcome-copy > p");

    if (bannerDetails) {
      bannerDetails.textContent = "Loading your student details...";
    }

    $$(".stats-grid .stat-number").forEach(element => {
      element.textContent = "—";
    });

    $$(".stats-grid .stat-caption, .stats-grid .stat-foot-note, .stats-grid .trend-pill, .stats-grid .plain-status, .stats-grid .due-pill")
      .forEach(element => {
        element.textContent = "";
      });

    $$(".notification-item", ui.notificationPopover || document)
      .forEach(element => {
        element.remove();
      });

    setText(
      $(".featured-section .section-heading h2"),
      "Equipment available to borrow"
    );

    setText(
      $(".featured-section .section-heading p"),
      "Live inventory listed in CampusShare."
    );

    const footer = $(".page-footer > span");

    if (footer) {
      footer.textContent =
        `© ${new Date().getFullYear()} CampusShare · Academic Asset Directory`;
    }

    setText(
      $("#history h2"),
      "Your Recent Activity"
    );

    setText(
      $(".activity-heading p", $("#history") || document),
      "Borrowing and account activity recorded for your profile."
    );
  }

  // Update the student's personal information.
  function updateProfileDisplay() {
    const user = state.user;
    const profile = state.profile || {};
    const metadata = user?.user_metadata || {};

    const email =
      profile.email ||
      user?.email ||
      "";

    const fullName =
      profile.full_name ||
      getMetadataValue(metadata, [
        "full_name",
        "fullName",
        "name"
      ]) ||
      (email ? email.split("@")[0] : "Student");

    const department =
      profile.department ||
      getMetadataValue(metadata, ["department"]);

    const campusId = getMetadataValue(metadata, [
      "campus_id",
      "campusId",
      "student_id",
      "studentId"
    ]);

    const cohort = getMetadataValue(metadata, [
      "cohort",
      "academic_year",
      "academicYear",
      "semester"
    ]);

    $$(".welcome-copy h1").forEach(element => {
      element.textContent = `Welcome back, ${fullName}`;
    });

    const verifiedLine = $(".verified-line");

    if (verifiedLine) {
      verifiedLine.replaceChildren();

      const dot = document.createElement("span");
      dot.className = "verified-dot";
      dot.textContent = "✓";

      verifiedLine.append(
        dot,
        document.createTextNode(" VERIFIED STUDENT STATUS ")
      );

      const idLabel = document.createElement("span");
      idLabel.className = "student-id";

      if (campusId) {
        idLabel.textContent = `ID: ${campusId}`;
      } else {
        idLabel.hidden = true;
      }

      verifiedLine.append(idLabel);
    }

    const bannerDetails = $(".welcome-copy > p");

    if (bannerDetails) {
      const details = [department, cohort].filter(Boolean);

      bannerDetails.replaceChildren();

      const icon = document.createElement("span");
      icon.className = "degree-icon";
      icon.textContent = "▣";

      bannerDetails.append(icon);

      if (details.length) {
        bannerDetails.append(
          document.createTextNode(` ${details.join(" • ")}`)
        );
      } else {
        bannerDetails.append(
          document.createTextNode(" Student account")
        );
      }
    }

    $$(".sidebar-user-copy strong, .profile-popover > strong")
      .forEach(element => {
        element.textContent = fullName;
      });

    $$(".profile-email").forEach(element => {
      element.textContent = email;
    });

    $$(".sidebar-user-copy span").forEach(element => {
      element.textContent =
        profile.role === "student"
          ? "Student account"
          : formatStatus(profile.role);
    });

    $$(".avatar, .avatar-mini, .avatar-top, .avatar-sidebar, .profile-photo span")
      .forEach(element => {
        element.textContent = getInitials(fullName);
        element.setAttribute("aria-label", fullName);
      });
  }

  function showDataError(message) {
    console.error("CampusShare dashboard:", message);
    showToast(message, true);
  }

  // Generic Supabase table reader.
  async function fetchRows(table, configureQuery) {
    try {
      let query = state.client
        .from(table)
        .select("*");

      if (typeof configureQuery === "function") {
        query = configureQuery(query);
      }

      const { data, error } = await query;

      if (error) throw error;

      return Array.isArray(data) ? data : [];

    } catch (error) {
      console.error(
        `CampusShare: Unable to load ${table}:`,
        error
      );

      state.loadErrors = state.loadErrors || {};

      state.loadErrors[table] =
        error.message || "Unable to load records.";

      return [];
    }
  }

  // Load records belonging to the logged-in student.
  async function loadDashboardData() {
    state.loading = true;
    state.loadErrors = {};

    const {
      data: authData,
      error: authError
    } = await state.client.auth.getUser();

    if (authError) throw authError;

    const user = authData?.user;

    if (!user?.id) {
      throw new Error(
        "Your session has expired. Please sign in again."
      );
    }

    state.user = user;

    // Load the authenticated student's profile.
    const profileResult = await state.client
      .from("profiles")
      .select("id, full_name, email, department, role, created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileResult.error) {
      console.error(
        "CampusShare profile lookup:",
        profileResult.error
      );

      state.profile = null;
      state.loadErrors.profiles = profileResult.error.message;

    } else {
      state.profile = profileResult.data || null;
    }

    // Load inventory and records filtered by the authenticated user.
    const [
      resources,
      categories,
      resourceImages,
      requests,
      notifications,
      activityLogs
    ] = await Promise.all([
      fetchRows("resources", query =>
        query.order("created_at", { ascending: false })
      ),

      fetchRows("categories", query =>
        query.order("category_name", { ascending: true })
      ),

      fetchRows("resource_images", query =>
        query.order("created_at", { ascending: false })
      ),

      fetchRows("booking_requests", query =>
        query
          .eq("student_id", user.id)
          .order("created_at", { ascending: false })
      ),

      fetchRows("notifications", query =>
        query
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
      ),

      fetchRows("activity_logs", query =>
        query
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(12)
      )
    ]);

    state.resources = resources;
    state.categories = categories;
    state.resourceImages = resourceImages;
    state.requests = requests;
    state.notifications = notifications;
    state.activityLogs = activityLogs;

    // Load only the items belonging to this student's requests.
    const requestIds = requests
      .map(request => request.id)
      .filter(Boolean);

    state.requestItems = requestIds.length
      ? await fetchRows("booking_request_items", query =>
          query.in("request_id", requestIds)
        )
      : [];

    // Load borrowing records for those request items.
    const requestItemIds = state.requestItems
      .map(item => item.id)
      .filter(Boolean);

    state.borrowRecords = requestItemIds.length
      ? await fetchRows("borrow_records", query =>
          query
            .in("request_item_id", requestItemIds)
            .order("borrowed_at", { ascending: false })
        )
      : [];

    state.loading = false;

    updateProfileDisplay();
    renderCategories();
    renderEquipment();
    renderStats();
    renderNotifications();
    renderActivity();
    updateSidebarCounts();

    const failedTables = Object.keys(state.loadErrors);

    if (failedTables.length) {
      console.warn(
        "CampusShare tables that could not be loaded:",
        state.loadErrors
      );
    }
  }

  function getCategoryName(resource) {
    const category = state.categories.find(
      item => item.id === resource.category_id
    );

    return category?.category_name || "Uncategorized";
  }

  function getResourceImage(resourceId) {
    const resource = state.resources.find(
      item => item.id === resourceId
    );

    if (resource?.image_url) {
      return resource.image_url;
    }

    const image = state.resourceImages.find(
      item => item.resource_id === resourceId
    );

    return image?.image_url || "";
  }

  function safeImageUrl(value) {
    if (!value) return "";

    try {
      const url = new URL(
        String(value),
        window.location.href
      );

      if (
        url.protocol === "https:" ||
        url.protocol === "http:"
      ) {
        return url.href;
      }

    } catch (_) {
      return "";
    }

    return "";
  }

  function isResourceRequestable(resource) {
    const available =
      Number(resource.available_quantity) || 0;

    const status =
      String(resource.status || "").toLowerCase();

    return available > 0 &&
      ![
        "inactive",
        "archived",
        "maintenance",
        "disabled",
        "retired"
      ].includes(status);
  }

  function getAvailabilityLabel(resource) {
    const total =
      Number(resource.total_quantity) || 0;

    const available =
      Number(resource.available_quantity) || 0;

    if (available <= 0) {
      return "Currently unavailable";
    }

    if (total > 0 && available < total) {
      return `Limited availability · ${available} of ${total}`;
    }

    return `Available · ${available} of ${total}`;
  }

  // Generate category filters from the real categories table.
  function renderCategories() {
    if (!ui.categoryRow) return;

    const uniqueCategories = [
      ...new Set(
        state.categories
          .map(category => category.category_name)
          .filter(Boolean)
      )
    ];

    ui.categoryRow.replaceChildren();

    const allButton = document.createElement("button");

    allButton.type = "button";
    allButton.className = "category-chip active";
    allButton.dataset.category = "all";
    allButton.textContent = "All equipment";
    allButton.setAttribute("aria-pressed", "true");

    ui.categoryRow.append(allButton);

    uniqueCategories.forEach(category => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "category-chip";
      button.dataset.category = category;
      button.textContent = category;
      button.setAttribute("aria-pressed", "false");

      ui.categoryRow.append(button);
    });

    const locations = [
      ...new Set(
        state.resources
          .map(resource => String(resource.location || "").trim())
          .filter(Boolean)
      )
    ].sort((a, b) => a.localeCompare(b));

    if (ui.locationFilter) {
      ui.locationFilter.replaceChildren();

      const allOption = document.createElement("option");
      allOption.value = "all";
      allOption.textContent = "All locations";

      ui.locationFilter.append(allOption);

      locations.forEach(location => {
        const option = document.createElement("option");

        option.value = location;
        option.textContent = location;

        ui.locationFilter.append(option);
      });
    }
  }

  // Generate equipment cards from the real inventory.
  function renderEquipment() {
    if (!ui.equipmentGrid) return;

    setText(
      $(".featured-section .section-heading h2"),
      "Equipment available to borrow"
    );

    setText(
      $(".featured-section .section-heading p"),
      "Live inventory listed in CampusShare."
    );

    if (!state.resources.length) {
      ui.equipmentGrid.replaceChildren();
      ui.equipmentGrid.hidden = true;

      if (ui.emptyState) {
        ui.emptyState.hidden = false;

        const message = $("p", ui.emptyState);

        if (message) {
          message.textContent = state.loadErrors?.resources
            ? "Equipment could not be loaded. Check your Supabase resources table permissions."
            : "There is currently no equipment listed in the CampusShare inventory.";
        }
      }

      return;
    }

    const categoryById = new Map(
      state.categories.map(category => [
        category.id,
        category.category_name
      ])
    );

    const cards = state.resources.map(resource => {
      const category =
        categoryById.get(resource.category_id) || "Uncategorized";

      const available =
        Number(resource.available_quantity) || 0;

      const total =
        Number(resource.total_quantity) || 0;

      const requestable = isResourceRequestable(resource);

      const imageUrl = safeImageUrl(
        getResourceImage(resource.id)
      );

      const location =
        resource.location || "Location not specified";

      const condition = resource.condition
        ? `Condition: ${resource.condition}`
        : "";

      const description =
        resource.description || "No description has been added.";

      const createdAt = resource.created_at
        ? new Date(resource.created_at).getTime()
        : 0;

      const availabilityClass =
        available > 0 && available >= total
          ? "available"
          : "limited";

      return `
        <article class="equipment-card"
          data-resource-id="${escapeHtml(resource.id)}"
          data-name="${escapeHtml(resource.name)}"
          data-category="${escapeHtml(category)}"
          data-location="${escapeHtml(resource.location || "")}"
          data-availability="${available <= 0
            ? "unavailable"
            : (available < total ? "limited" : "available")}"
          data-date="${Number.isFinite(createdAt) ? createdAt : 0}">

          <div class="equipment-image">

            ${imageUrl
              ? `<img src="${escapeHtml(imageUrl)}"
                  alt="${escapeHtml(resource.name || "Campus equipment")}"
                  loading="lazy" />`
              : `<div class="equipment-image-placeholder">▣</div>`}

            <span class="availability-badge ${availabilityClass}">
              ${escapeHtml(getAvailabilityLabel(resource))}
            </span>

            <button class="image-action"
              type="button"
              data-resource-id="${escapeHtml(resource.id)}"
              aria-label="View ${escapeHtml(resource.name)} details">
              ↗
            </button>
          </div>

          <div class="equipment-body">

            <div class="equipment-meta">
              <span>${escapeHtml(location)}</span>
              <span>${escapeHtml(condition)}</span>
            </div>

            <h3>${escapeHtml(resource.name || "Unnamed equipment")}</h3>

            <p class="equipment-desc">
              ${escapeHtml(description)}
            </p>

            <div class="card-bottom">
              <span class="equipment-tag">
                ${escapeHtml(category)}
              </span>

              <button type="button"
                class="${requestable ? "primary-small" : "secondary-small"} request-button"
                data-resource-id="${escapeHtml(resource.id)}"
                ${requestable ? "" : "disabled"}>

                ${requestable ? "Request equipment" : "Unavailable"}
                <span>→</span>
              </button>
            </div>
          </div>
        </article>
      `;
    });

    ui.equipmentGrid.innerHTML = cards.join("");
    ui.equipmentGrid.hidden = false;

    if (ui.emptyState) {
      ui.emptyState.hidden = true;
    }

    applyFilters();
  }

  function getActiveRequests() {
    const completedStatuses = new Set([
      "rejected",
      "declined",
      "cancelled",
      "canceled",
      "completed",
      "closed"
    ]);

    return state.requests.filter(request =>
      !completedStatuses.has(
        String(request.status || "").toLowerCase()
      )
    );
  }

  function getPendingRequests() {
    const pendingStatuses = new Set([
      "pending",
      "submitted",
      "under_review",
      "under review",
      "review"
    ]);

    return state.requests.filter(request =>
      pendingStatuses.has(
        String(request.status || "").toLowerCase()
      )
    );
  }

  function getBorrowedRows() {
    const itemById = new Map(
      state.requestItems.map(item => [item.id, item])
    );

    const resourceById = new Map(
      state.resources.map(resource => [resource.id, resource])
    );

    return state.borrowRecords.map(record => {
      const item = itemById.get(record.request_item_id);

      const resource = item
        ? resourceById.get(item.resource_id)
        : null;

      const borrowed =
        Number(record.quantity_borrowed) || 0;

      const returned =
        Number(record.quantity_returned) || 0;

      return {
        ...record,
        item,
        resource,
        outstanding: Math.max(0, borrowed - returned)
      };
    });
  }

  // Show only the logged-in student's counts and borrowing details.
  function renderStats() {
    const cards = $$(".stats-grid .stat-card");

    if (cards.length < 3) return;

    const availableUnits = state.resources.reduce(
      (sum, resource) =>
        sum + Math.max(0, Number(resource.available_quantity) || 0),
      0
    );

    const locations = new Set(
      state.resources
        .map(resource => String(resource.location || "").trim())
        .filter(Boolean)
    ).size;

    const activeRequests = getActiveRequests();
    const pendingRequests = getPendingRequests();

    const borrowedRows = getBorrowedRows()
      .filter(record => record.outstanding > 0);

    const borrowedUnits = borrowedRows.reduce(
      (sum, record) => sum + record.outstanding,
      0
    );

    // Available equipment.
    const firstStat = cards[0];

    const firstNumber = $(".stat-number", firstStat);

    if (firstNumber) {
      firstNumber.innerHTML =
        `${availableUnits} <span class="stat-unit">units</span>`;
    }

    setText(
      $(".stat-caption", firstStat),
      locations
        ? `Across ${locations} listed location${locations === 1 ? "" : "s"}`
        : "No equipment locations listed"
    );

    setText(
      $(".trend-pill", firstStat),
      `${state.resources.length} equipment listings`
    );

    setText(
      $(".stat-foot-note", firstStat),
      "Live inventory"
    );

    // Active requests.
    const secondStat = cards[1];

    const secondNumber = $(".stat-number", secondStat);

    if (secondNumber) {
      secondNumber.innerHTML =
        `${activeRequests.length} <span class="stat-unit">requests</span>`;
    }

    setText(
      $(".stat-caption", secondStat),
      `${pendingRequests.length} awaiting approval`
    );

    setText(
      $(".plain-status", secondStat),
      pendingRequests.length
        ? "Pending review"
        : "No pending requests"
    );

    // Currently borrowed.
    const thirdStat = cards[2];

    const thirdNumber = $(".stat-number", thirdStat);

    if (thirdNumber) {
      thirdNumber.innerHTML =
        `${borrowedUnits} <span class="stat-unit">${borrowedUnits === 1 ? "unit" : "units"}</span>`;
    }

    const names = [
      ...new Set(
        borrowedRows
          .map(record => record.resource?.name)
          .filter(Boolean)
      )
    ];

    setText(
      $(".stat-caption", thirdStat),
      names.length
        ? names.slice(0, 2).join(", ")
        : "No equipment currently borrowed"
    );

    const dueDates = borrowedRows
      .map(record => record.due_date)
      .filter(Boolean)
      .map(value => new Date(value))
      .filter(date => !Number.isNaN(date.getTime()))
      .sort((a, b) => a - b);

    const borrowedLink = $(".small-link", thirdStat);

    if (borrowedLink) {
      borrowedLink.textContent =
        borrowedUnits ? "View items →" : "";

      borrowedLink.hidden = borrowedUnits === 0;
    }

    const duePill = $(".due-pill", thirdStat);

    if (duePill) {
      if (dueDates.length) {
        const days = Math.ceil(
          (dueDates[0].getTime() - Date.now()) / 86400000
        );

        duePill.textContent =
          days < 0
            ? `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`
            : days === 0
              ? "Due today"
              : `Next due: ${formatDate(dueDates[0])}`;

      } else {
        duePill.textContent = "No active due dates";
      }
    }

    const navCount = $(
      ".nav-link[data-nav='Browse Equipment'] .nav-count"
    );

    if (navCount) {
      navCount.textContent = String(state.resources.length);
    }
  }

  function updateSidebarCounts() {
    const requestsLink = $(
      ".nav-link[data-nav='My Requests'] .nav-dot"
    );

    if (requestsLink) {
      requestsLink.hidden =
        getPendingRequests().length === 0;
    }
  }

  // Notifications belong only to the signed-in student.
  function renderNotifications() {
    const popover = ui.notificationPopover;

    if (!popover) return;

    const heading = $(".popover-heading", popover);

    const unreadCount = state.notifications.filter(
      notification => !notification.is_read
    ).length;

    if (heading) {
      const label = $(".unread-label", heading);

      if (label) {
        label.textContent = `${unreadCount} unread`;
      }
    }

    $$(".notification-item", popover).forEach(item => {
      item.remove();
    });

    $$(".notification-empty", popover).forEach(item => {
      item.remove();
    });

    if (!state.notifications.length) {
      const empty = document.createElement("p");

      empty.className = "notification-empty";
      empty.textContent = "You have no notifications.";

      popover.append(empty);

    } else {
      state.notifications.slice(0, 8).forEach(notification => {
        const item = document.createElement("button");

        item.type = "button";
        item.className = "notification-item";
        item.dataset.notificationId = notification.id;
        item.style.width = "100%";
        item.style.textAlign = "left";
        item.style.border = "0";
        item.style.background = notification.is_read
          ? "transparent"
          : "rgba(37, 99, 235, 0.06)";
        item.style.cursor = "pointer";

        const symbol = document.createElement("span");

        symbol.className = "notification-symbol blue";
        symbol.textContent = notification.is_read ? "•" : "●";

        const content = document.createElement("span");

        const title = document.createElement("strong");
        title.textContent =
          notification.title || "CampusShare notification";

        const message = document.createElement("p");
        message.textContent = notification.message || "";

        const date = document.createElement("small");
        date.textContent = formatDate(notification.created_at, true);

        content.append(title, message, date);
        item.append(symbol, content);

        popover.append(item);
      });
    }

    const dot = $(".notification-dot");

    if (dot) {
      dot.hidden = unreadCount === 0;
    }

    if (ui.notificationButton) {
      ui.notificationButton.setAttribute(
        "aria-label",
        unreadCount
          ? `Notifications, ${unreadCount} unread`
          : "Notifications"
      );
    }
  }

  function extractActivityDescription(details) {
    if (!details) {
      return "Activity recorded on your account.";
    }

    if (typeof details === "string") {
      return details;
    }

    if (typeof details === "object") {
      const known = [
        details.message,
        details.description,
        details.resource_name,
        details.item_name,
        details.name,
        details.note
      ].find(value => value && String(value).trim());

      if (known) {
        return String(known);
      }

      const compact = Object.entries(details)
        .filter(([, value]) =>
          value !== null &&
          value !== undefined &&
          typeof value !== "object"
        )
        .slice(0, 3)
        .map(([key, value]) =>
          `${key.replace(/_/g, " ")}: ${value}`
        )
        .join(" · ");

      return compact || "Activity recorded on your account.";
    }

    return "Activity recorded on your account.";
  }

  // Show the student's real borrowing records and activity logs.
  function renderActivity() {
    if (!ui.activityTimeline) return;

    const itemById = new Map(
      state.requestItems.map(item => [item.id, item])
    );

    const resourceById = new Map(
      state.resources.map(resource => [resource.id, resource])
    );

    const fromBorrowRecords = [];

    state.borrowRecords.forEach(record => {
      const item = itemById.get(record.request_item_id);

      const resource = item
        ? resourceById.get(item.resource_id)
        : null;

      const name = resource?.name || "Borrowed equipment";

      if (record.borrowed_at) {
        fromBorrowRecords.push({
          title: `Borrowed: ${name}`,
          description:
            `Quantity: ${Number(record.quantity_borrowed) || 0}`,
          date: record.borrowed_at,
          status: "Borrowed"
        });
      }

      if (record.returned_at) {
        fromBorrowRecords.push({
          title: `Returned: ${name}`,
          description:
            `Quantity returned: ${Number(record.quantity_returned) || 0}`,
          date: record.returned_at,
          status: "Returned"
        });
      }
    });

    const fromLogs = state.activityLogs.map(log => ({
      title: formatStatus(log.action || "Account activity"),
      description: extractActivityDescription(log.details),
      date: log.created_at,
      status: "Activity"
    }));

    const activityItems = [
      ...fromBorrowRecords,
      ...fromLogs
    ]
      .sort((a, b) =>
        new Date(b.date || 0) - new Date(a.date || 0)
      )
      .slice(0, 8);

    const activityCard = $("#history");

    setText(
      $("h2", activityCard),
      "Your Recent Activity"
    );

    setText(
      $(".activity-heading p", activityCard),
      "Borrowing and account activity recorded for your profile."
    );

    if (!activityItems.length) {
      ui.activityTimeline.innerHTML = `
        <div class="empty-state">
          <strong>No activity yet</strong>
          <p>Your borrowing and account activity will appear here.</p>
        </div>
      `;

      return;
    }

    ui.activityTimeline.innerHTML = activityItems.map(item => {
      const isReturned =
        item.status.toLowerCase() === "returned";

      const markerClass = isReturned
        ? "green-marker"
        : "blue-marker";

      const statusClass = isReturned
        ? "returned-status"
        : "borrowed-status";

      return `
        <div class="timeline-entry">

          <div class="timeline-marker ${markerClass}">
            ${isReturned ? "✓" : "▣"}
          </div>

          <div class="activity-content">

            <div class="activity-title-line">
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <span class="activity-status ${statusClass}">
                  ${escapeHtml(item.status)}
                </span>
              </div>

              <span class="activity-date">
                ${escapeHtml(formatDate(item.date, true))}
              </span>
            </div>

            <p>${escapeHtml(item.description)}</p>

          </div>
        </div>
      `;
    }).join("");
  }

  // Search and filter the real equipment inventory.
  function applyFilters() {
    if (!ui.equipmentGrid || !ui.searchInput) return;

    const query =
      ui.searchInput.value.trim().toLowerCase();

    const availability =
      ui.availabilityFilter?.value || "all";

    const location =
      ui.locationFilter?.value || "all";

    let visibleCount = 0;

    $$(".equipment-card", ui.equipmentGrid).forEach(card => {
      const searchable = [
        card.dataset.name,
        card.dataset.category,
        card.dataset.location,
        card.textContent
      ].join(" ").toLowerCase();

      const matchesSearch =
        searchable.includes(query);

      const matchesCategory =
        state.activeCategory === "all" ||
        card.dataset.category === state.activeCategory;

      const matchesAvailability =
        availability === "all" ||
        card.dataset.availability === availability ||
        (
          availability === "available" &&
          card.dataset.availability === "limited"
        );

      const matchesLocation =
        location === "all" ||
        card.dataset.location === location;

      const visible =
        matchesSearch &&
        matchesCategory &&
        matchesAvailability &&
        matchesLocation;

      card.hidden = !visible;

      if (visible) visibleCount++;
    });

    if (ui.emptyState) {
      ui.emptyState.hidden = visibleCount !== 0;

      const title = $("strong", ui.emptyState);
      const description = $("p", ui.emptyState);

      if (title) {
        title.textContent = "No matching equipment";
      }

      if (description) {
        description.textContent =
          "Try another search term or change your filters.";
      }
    }

    ui.equipmentGrid.hidden =
      state.resources.length === 0;

    const hasFilter =
      availability !== "all" ||
      location !== "all" ||
      state.activeCategory !== "all" ||
      Boolean(query);

    if (ui.filterCount) {
      ui.filterCount.hidden = !hasFilter;
      ui.filterCount.textContent = hasFilter ? "•" : "";
    }
  }

  function sortEquipment() {
    state.sortNewestFirst = !state.sortNewestFirst;

    state.resources.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();

      return state.sortNewestFirst
        ? dateB - dateA
        : dateA - dateB;
    });

    const sortLabel = $("#sortLabel");

    if (sortLabel) {
      sortLabel.textContent =
        state.sortNewestFirst
          ? "Sort: Newest"
          : "Sort: Oldest";
    }

    renderEquipment();
  }

  function localDateInputValue(date) {
    const local = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    );

    return local.toISOString().slice(0, 10);
  }

  let quantityInput = null;

  // Add quantity selection because booking_request_items stores quantity.
  function setupRequestModal() {
    if (!ui.reservationForm) return;

    // The current database has no purpose column.
    // Do not display a purpose field that cannot be saved.
    const purposeField =
      $("#requestPurpose")?.closest(".form-field");

    if (purposeField) {
      purposeField.hidden = true;

      const purposeInput = $("#requestPurpose");

      if (purposeInput) {
        purposeInput.required = false;
        purposeInput.disabled = true;
      }
    }

    if (!$("#requestQuantity")) {
      const wrapper = document.createElement("div");

      wrapper.className = "form-field request-quantity-field";

      const label = document.createElement("label");
      label.htmlFor = "requestQuantity";
      label.textContent = "Quantity";

      quantityInput = document.createElement("input");

      quantityInput.type = "number";
      quantityInput.id = "requestQuantity";
      quantityInput.name = "requested_quantity";
      quantityInput.min = "1";
      quantityInput.value = "1";
      quantityInput.required = true;

      wrapper.append(label, quantityInput);

      const dateRow = $(".form-row", ui.reservationForm);

      if (dateRow) {
        dateRow.insertAdjacentElement("afterend", wrapper);
      } else {
        ui.reservationForm.prepend(wrapper);
      }

    } else {
      quantityInput = $("#requestQuantity");
    }

    const modalIntro =
      $(".modal-intro", ui.requestModal);

    if (modalIntro) {
      modalIntro.textContent =
        "Choose the dates and quantity. Your request will be sent to the equipment owner for review.";
    }

    const modalNote =
      $(".modal-note", ui.requestModal);

    if (modalNote) {
      modalNote.textContent =
        "Your request is saved to CampusShare and remains subject to approval.";
    }
  }

  function openRequestModal(resource) {
    if (!resource || !ui.requestModal || !ui.reservationForm) {
      return;
    }

    if (!isResourceRequestable(resource)) {
      showToast(
        "This equipment is not currently available to request.",
        true
      );
      return;
    }

    state.selectedResource = resource;

    setText(
      $("#selectedItemName"),
      resource.name || "Equipment"
    );

    setText(
      $("#modalTitle"),
      "Request equipment"
    );

    const itemMeta =
      $("#selectedItemName")?.parentElement?.querySelector("span");

    if (itemMeta) {
      itemMeta.textContent = [
        getCategoryName(resource),
        resource.location
      ].filter(Boolean).join(" · ");
    }

    const today = new Date();

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const startInput = $("#startDate");
    const endInput = $("#endDate");

    if (startInput) {
      startInput.min = localDateInputValue(today);
      startInput.value = localDateInputValue(today);
    }

    if (endInput) {
      endInput.min = localDateInputValue(today);
      endInput.value = localDateInputValue(nextWeek);
    }

    if (quantityInput) {
      quantityInput.min = "1";
      quantityInput.max = String(
        Math.max(
          1,
          Number(resource.available_quantity) || 1
        )
      );

      quantityInput.value = "1";
    }

    ui.requestModal.hidden = false;
    document.body.style.overflow = "hidden";

    startInput?.focus({ preventScroll: true });
  }

  function closeRequestModal() {
    if (ui.requestModal) {
      ui.requestModal.hidden = true;
    }

    document.body.style.overflow = "";
    state.selectedResource = null;
  }

  // Save requests to Supabase, not browser localStorage.
  async function submitEquipmentRequest(event) {
    event.preventDefault();

    if (!state.user?.id || !state.selectedResource) {
      showToast(
        "Your session or selected equipment could not be verified. Sign in again.",
        true
      );
      return;
    }

    const start = $("#startDate")?.value;
    const due = $("#endDate")?.value;

    const quantity = Number(
      quantityInput?.value || 1
    );

    const available =
      Number(state.selectedResource.available_quantity) || 0;

    if (!start || !due || due < start) {
      showToast(
        "Choose a valid return date on or after the start date.",
        true
      );
      return;
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > available
    ) {
      showToast(
        `Choose a quantity between 1 and ${available}.`,
        true
      );
      return;
    }

    const submitButton = $(
      'button[type="submit"]',
      ui.reservationForm
    );

    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const now = new Date().toISOString();

      const requestPayload = {
        student_id: state.user.id,
        request_date: now,
        start_date: `${start}T00:00:00.000Z`,
        due_date: `${due}T23:59:59.000Z`,
        status: "pending",
        created_at: now
      };

      const {
        data: request,
        error: requestError
      } = await state.client
        .from("booking_requests")
        .insert(requestPayload)
        .select("id")
        .single();

      if (requestError) throw requestError;

      if (!request?.id) {
        throw new Error(
          "The request was saved without returning its request ID."
        );
      }

      const itemPayload = {
        request_id: request.id,
        resource_id: state.selectedResource.id,
        requested_quantity: quantity,
        approved_quantity: 0,
        item_status: "pending"
      };

      const { error: itemError } = await state.client
        .from("booking_request_items")
        .insert(itemPayload);

      if (itemError) {
        console.error(
          "CampusShare request item could not be saved:",
          itemError
        );

        throw new Error(
          `Your request record was created, but its equipment item could not be saved: ${itemError.message}`
        );
      }

      const resourceName =
        state.selectedResource.name;

      closeRequestModal();
      ui.reservationForm.reset();

      showToast(
        `Your request for ${resourceName} was submitted.`
      );

      await loadDashboardData();

      window.setTimeout(() => {
        if (window.parent !== window) {
          window.parent.postMessage({
            source: "campusshare-page",
            type: "navigate",
            route: "requests"
          }, "*");
        }
      }, 700);

    } catch (error) {
      console.error(
        "CampusShare request submission failed:",
        error
      );

      showToast(
        error.message ||
          "The equipment request could not be submitted.",
        true
      );

    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  }

  async function markNotificationRead(notificationId) {
    const notification = state.notifications.find(
      item => item.id === notificationId
    );

    if (!notification || notification.is_read) return;

    const { data: updatedNotification, error } = await state.client
  .from("notifications")
  .update({ is_read: true })
  .eq("id", notificationId)
  .eq("user_id", state.user.id)
  .select("id")
  .maybeSingle();

if (error) throw error;

if (!updatedNotification) {
  throw new Error("The notification was not updated.");
}

      notification.is_read = true;
      renderNotifications();

    } catch (error) {
      console.error(
        "CampusShare notification update failed:",
        error
      );

      showToast(
        "This notification could not be marked as read.",
        true
      );
    }
  }

  async function signOut() {
    try {
      const { error } =
        await state.client.auth.signOut();

      if (error) throw error;

      localStorage.removeItem("campusshareAuthProfile");
      localStorage.removeItem("campusshareDemoProfile");
      localStorage.removeItem("campusshareDemoSession");

      if (window.parent !== window) {
        window.parent.postMessage({
          source: "campusshare-page",
          type: "logout"
        }, "*");

      } else {
        window.location.href = "../login/index.html";
      }

    } catch (error) {
      console.error(
        "CampusShare sign-out failed:",
        error
      );

      showToast(
        error.message || "Sign out failed.",
        true
      );
    }
  }

  function closeMobileMenu() {
    ui.sidebar?.classList.remove("open");
    ui.mobileOverlay?.classList.remove("show");
  }

  function setupEvents() {
    ui.searchInput?.addEventListener("input", applyFilters);

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        if (ui.searchInput) {
          ui.searchInput.value = "";
          applyFilters();
        }

        closeRequestModal();
        closeMobileMenu();

        if (ui.notificationPopover) {
          ui.notificationPopover.hidden = true;
        }

        if (ui.profilePopover) {
          ui.profilePopover.hidden = true;
        }
      }
    });

    $(".search-box kbd")?.addEventListener("click", () => {
      if (ui.searchInput) {
        ui.searchInput.value = "";
        applyFilters();
        ui.searchInput.focus();
      }
    });

    $("#filterButton")?.addEventListener("click", () => {
      if (ui.filterDrawer) {
        ui.filterDrawer.hidden = !ui.filterDrawer.hidden;
      }
    });

    ui.availabilityFilter?.addEventListener(
      "change",
      applyFilters
    );

    ui.locationFilter?.addEventListener(
      "change",
      applyFilters
    );

    $("#clearFilters")?.addEventListener("click", () => {
      if (ui.availabilityFilter) {
        ui.availabilityFilter.value = "all";
      }

      if (ui.locationFilter) {
        ui.locationFilter.value = "all";
      }

      state.activeCategory = "all";

      $$(".category-chip", ui.categoryRow).forEach(button => {
        const active = button.dataset.category === "all";

        button.classList.toggle("active", active);
        button.setAttribute(
          "aria-pressed",
          String(active)
        );
      });

      applyFilters();
      showToast("Filters cleared.");
    });

    $("#resetSearch")?.addEventListener("click", () => {
      if (ui.searchInput) {
        ui.searchInput.value = "";
      }

      if (ui.availabilityFilter) {
        ui.availabilityFilter.value = "all";
      }

      if (ui.locationFilter) {
        ui.locationFilter.value = "all";
      }

      state.activeCategory = "all";

      $$(".category-chip", ui.categoryRow).forEach(button => {
        const active = button.dataset.category === "all";

        button.classList.toggle("active", active);
        button.setAttribute(
          "aria-pressed",
          String(active)
        );
      });

      applyFilters();
    });

    ui.categoryRow?.addEventListener("click", event => {
      const button = event.target.closest(".category-chip");

      if (!button) return;

      state.activeCategory =
        button.dataset.category || "all";

      $$(".category-chip", ui.categoryRow).forEach(item => {
        const active = item === button;

        item.classList.toggle("active", active);
        item.setAttribute(
          "aria-pressed",
          String(active)
        );
      });

      applyFilters();
    });

    $("#sortButton")?.addEventListener(
      "click",
      sortEquipment
    );

    ui.equipmentGrid?.addEventListener("click", event => {
      const button = event.target.closest(
        ".request-button, .image-action"
      );

      if (!button) return;

      const resource = state.resources.find(
        item => item.id === button.dataset.resourceId
      );

      if (resource) {
        openRequestModal(resource);
      }
    });

    $("#modalClose")?.addEventListener(
      "click",
      closeRequestModal
    );

    $("#cancelRequest")?.addEventListener(
      "click",
      closeRequestModal
    );

    ui.requestModal?.addEventListener("click", event => {
      if (event.target === ui.requestModal) {
        closeRequestModal();
      }
    });

    $("#startDate")?.addEventListener("change", event => {
      const endInput = $("#endDate");

      if (!endInput) return;

      endInput.min = event.target.value;

      if (endInput.value < event.target.value) {
        endInput.value = event.target.value;
      }
    });

    ui.reservationForm?.addEventListener(
      "submit",
      submitEquipmentRequest
    );

    ui.notificationButton?.addEventListener("click", event => {
      event.stopPropagation();

      if (ui.notificationPopover) {
        ui.notificationPopover.hidden =
          !ui.notificationPopover.hidden;
      }

      if (ui.profilePopover) {
        ui.profilePopover.hidden = true;
      }
    });

    ui.notificationPopover?.addEventListener("click", event => {
      const item = event.target.closest(
        "[data-notification-id]"
      );

      if (item) {
        markNotificationRead(item.dataset.notificationId);
      }
    });

    ui.profileButton?.addEventListener("click", event => {
      event.stopPropagation();

      if (ui.profilePopover) {
        ui.profilePopover.hidden =
          !ui.profilePopover.hidden;
      }

      if (ui.notificationPopover) {
        ui.notificationPopover.hidden = true;
      }
    });

    document.addEventListener("click", event => {
      if (
        !event.target.closest(".notification-wrap") &&
        ui.notificationPopover
      ) {
        ui.notificationPopover.hidden = true;
      }

      if (
        !event.target.closest(".profile-wrap") &&
        ui.profilePopover
      ) {
        ui.profilePopover.hidden = true;
      }
    });

    ui.profilePopover
      ?.querySelector('[data-profile-action="Sign out"]')
      ?.addEventListener("click", signOut);

    ui.profilePopover
      ?.querySelector('[data-profile-action="Account settings"]')
      ?.addEventListener("click", () => {
        if (window.parent !== window) {
          window.parent.postMessage({
            source: "campusshare-page",
            type: "navigate",
            route: "profile"
          }, "*");

        } else {
          showToast(
            "Profile settings are available from the Student Portal profile page."
          );
        }
      });

    $("#mobileMenu")?.addEventListener("click", () => {
      ui.sidebar?.classList.add("open");
      ui.mobileOverlay?.classList.add("show");
    });

    ui.mobileOverlay?.addEventListener(
      "click",
      closeMobileMenu
    );

    $("#bannerBrowse")?.addEventListener("click", event => {
      event.preventDefault();

      $("#catalog")?.scrollIntoView({
        behavior: "smooth"
      });

      window.setTimeout(() => {
        ui.searchInput?.focus({ preventScroll: true });
      }, 350);
    });

    $("#exploreLink")?.addEventListener("click", event => {
      event.preventDefault();

      $("#catalog")?.scrollIntoView({
        behavior: "smooth"
      });

      ui.searchInput?.focus({ preventScroll: true });
    });

    $("#historyLink")?.addEventListener("click", event => {
      event.preventDefault();

      $("#history")?.scrollIntoView({
        behavior: "smooth"
      });
    });

    $("#supportLink")?.addEventListener("click", event => {
      event.preventDefault();

      showToast(
        "Please contact your campus equipment administrator for support."
      );
    });

    $("#sidebarMore")?.addEventListener("click", () => {
      ui.profilePopover?.removeAttribute("hidden");
    });

    $$(".nav-link").forEach(link => {
      link.addEventListener("click", event => {
        const section = link.dataset.nav;

        if (section === "Browse Equipment") {
          event.preventDefault();

          $("#catalog")?.scrollIntoView({
            behavior: "smooth"
          });

          ui.searchInput?.focus({ preventScroll: true });

        } else if (section === "Dashboard") {
          event.preventDefault();

          $(".welcome-banner")?.scrollIntoView({
            behavior: "smooth"
          });

        } else if (section === "History") {
          event.preventDefault();

          $("#history")?.scrollIntoView({
            behavior: "smooth"
          });
        }
      });
    });
  }

  // dashboard/script.js is loaded before the Supabase scripts in your HTML.
  // Wait for them instead of trying to query before the client exists.
  async function waitForSupabaseClient(maxAttempts = 100) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (
        window.supabaseClient?.auth &&
        typeof window.supabaseClient.from === "function"
      ) {
        return window.supabaseClient;
      }

      await new Promise(resolve => {
        window.setTimeout(resolve, 100);
      });
    }

    throw new Error(
      "Supabase did not initialize. Check the Supabase script tags in the dashboard HTML."
    );
  }

  async function init() {
    setupEvents();
    setupRequestModal();
    clearStaticExampleContent();

    if (ui.equipmentGrid) {
      ui.equipmentGrid.innerHTML =
        "<p>Loading live equipment from CampusShare...</p>";
    }

    if (ui.activityTimeline) {
      ui.activityTimeline.innerHTML =
        "<p>Loading your activity...</p>";
    }

    try {
      state.client = await waitForSupabaseClient();

      await loadDashboardData();

    } catch (error) {
      console.error(
        "CampusShare dashboard initialization failed:",
        error
      );

      showDataError(
        error.message || "The dashboard could not be loaded."
      );

      if (ui.equipmentGrid) {
        ui.equipmentGrid.innerHTML =
          "<p>Dashboard data could not be loaded. Please refresh or sign in again.</p>";
      }

      if (ui.activityTimeline) {
        ui.activityTimeline.innerHTML =
          "<p>Your activity could not be loaded.</p>";
      }

      setText(
        $(".welcome-copy h1"),
        "Your profile could not be loaded"
      );
    }
  }

  init();

})();
v
