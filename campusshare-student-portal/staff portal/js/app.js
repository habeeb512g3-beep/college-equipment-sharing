(() => {
  "use strict";

  // CampusShare Staff Portal - Supabase-backed application logic.
  // Shared by dashboard.html, equipment.html, requests.html,
  // calendar.html and history.html.

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const supabase = () => window.supabaseClient;

  const state = {
    user: null,
    profile: null,
    equipment: [],
    categories: [],
    requests: [],
    history: [],
    selectedRequest: null,
    selectedImage: null
  };

  const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);

  const statusKey = value =>
    String(value || "pending").toLowerCase().replace(/[ _]+/g, "-");

  function toast(message) {
    let element = $("#appToast") || $("#toast-notification");

    if (!element) {
      element = document.createElement("div");
      element.id = "appToast";
      element.className =
        "fixed bottom-6 right-6 z-[9999] rounded-xl bg-inverse-surface text-white p-4 shadow-xl";
      document.body.append(element);
    }

    element.textContent = message;
    element.hidden = false;

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
      element.hidden = true;
    }, 3200);
  }

  window.showToast = toast;

  function setText(selector, value) {
    const element = $(selector);
    if (element) element.textContent = String(value ?? "");
  }

  function formatDate(value) {
    if (!value) return "Not specified";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleString();
  }

  function formatDuration(start, end) {
    if (!start || !end) return "Not returned";

    const minutes = Math.max(
      0,
      Math.floor((new Date(end) - new Date(start)) / 60000)
    );

    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  // ==================================================
  // AUTHENTICATION AND STAFF PROFILE
  // ==================================================

  async function logout() {
    try {
      const { error } = await supabase().auth.signOut();

      if (error) throw error;

      window.location.href = "../index.html";

    } catch (error) {
      console.error("CampusShare logout failed:", error);

      toast(error.message || "Could not log out. Please try again.");
    }
  }

  async function loadStaffProfile() {
    if (!supabase()) {
      throw new Error("Supabase client is not initialized.");
    }

    const { data, error } = await supabase().auth.getUser();

    if (error) throw error;

    if (!data?.user) {
      window.location.href = "../index.html";
      throw new Error("Please sign in to open the staff portal.");
    }

    state.user = data.user;

    const {
      data: profile,
      error: profileError
    } = await supabase()
      .from("profiles")
      .select("id, full_name, email, department, role")
      .eq("id", state.user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (
      !profile ||
      !["owner", "admin"].includes(
        String(profile.role || "").toLowerCase()
      )
    ) {
      await supabase().auth.signOut();

      window.location.href = "../index.html";

      throw new Error(
        "This account does not have approved staff access."
      );
    }

    state.profile = profile;

    renderStaffProfile();
  }

  function renderStaffProfile() {
    const fullName =
      state.profile?.full_name ||
      state.user?.email?.split("@")[0] ||
      "Staff member";

    const email =
      state.profile?.email ||
      state.user?.email ||
      "";

    const department =
      state.profile?.department ||
      "Department not provided";

    const initials = fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part.charAt(0))
      .join("")
      .toUpperCase() || "S";

    setText("#staffDisplayName", fullName);
    setText("#staffDepartment", department);
    setText("#staffEmail", email);
    setText("#staffProfileInitial", initials);
    setText("#staffWelcomeHeading", `Welcome back, ${fullName}`);

    const oldHeading = $("main h1");

    if (
      oldHeading &&
      /^Welcome back/i.test(oldHeading.textContent.trim())
    ) {
      oldHeading.textContent = `Welcome back, ${fullName}`;
    }

    if (!$("#staffLogoutButton")) {
      const header = $("header");

      if (header) {
        const button = document.createElement("button");

        button.id = "staffLogoutButton";
        button.type = "button";
        button.className =
          "ml-3 px-3 py-2 rounded-lg border text-sm font-semibold hover:bg-surface-container";

        button.textContent = "Log out";

        button.addEventListener("click", logout);

        header.append(button);
      }
    }

    // Remove these links if an older page still contains them.
    $$('a[data-path="settings"], a[data-path="help-and-support"]')
      .forEach(link => link.remove());
  }

  // ==================================================
  // LOAD EQUIPMENT FROM SUPABASE
  // ==================================================

  async function loadEquipment() {
    const [resources, categories] = await Promise.all([
      window.CampusDB.get("resources", {
        filters: {
          owner_id: state.user.id
        },
        orderBy: "created_at",
        ascending: false
      }),

      window.CampusDB.get("categories", {
        orderBy: "category_name",
        ascending: true
      })
    ]);

    state.categories = categories || [];

    const categoryNames = new Map(
      state.categories.map(item => [
        item.id,
        item.category_name
      ])
    );

    state.equipment = (resources || []).map(item => ({
      id: item.id,
      name: item.name || "Unnamed equipment",
      description: item.description || "",
      image: item.image_url || "",
      location: item.location || "",
      categoryId: item.category_id || null,
      category: categoryNames.get(item.category_id) || "Other",
      totalQuantity: Number(item.total_quantity || 0),
      availableQuantity: Number(item.available_quantity || 0),
      condition: item.condition || "",
      status: item.status || "available"
    }));

    return state.equipment;
  }

  // ==================================================
  // BOOKING STATUS CONVERSION
  // ==================================================

  function displayStatus(value) {
    const key = statusKey(value);

    if (["approved", "ready"].includes(key)) return "approved";

    if (["declined", "rejected", "cancelled"].includes(key)) {
      return "rejected";
    }

    if (["waitlisted", "waitlist"].includes(key)) {
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

  // ==================================================
  // LOAD STUDENT BOOKING REQUESTS
  // ==================================================

  async function loadRequests() {
    state.requests = [];

    const resourceIds = state.equipment.map(item => item.id);

    if (!resourceIds.length) return state.requests;

    const {
      data: requestItems,
      error: itemError
    } = await supabase()
      .from("booking_request_items")
      .select(
        "id, request_id, resource_id, requested_quantity, approved_quantity, item_status"
      )
      .in("resource_id", resourceIds);

    if (itemError) throw itemError;

    if (!requestItems?.length) return state.requests;

    const requestIds = [
      ...new Set(
        requestItems
          .map(item => item.request_id)
          .filter(Boolean)
      )
    ];

    const [
      { data: bookingRequests, error: bookingError },
      { data: resources, error: resourceError }
    ] = await Promise.all([
      supabase()
        .from("booking_requests")
        .select(
          "id, student_id, request_date, start_date, due_date, status, created_at"
        )
        .in("id", requestIds),

      supabase()
        .from("resources")
        .select("id, name, owner_id")
        .in("id", resourceIds)
    ]);

    if (bookingError) throw bookingError;
    if (resourceError) throw resourceError;

    const bookingMap = new Map(
      (bookingRequests || []).map(item => [
        item.id,
        item
      ])
    );

    const resourceMap = new Map(
      (resources || []).map(item => [
        item.id,
        item
      ])
    );

    const studentIds = [
      ...new Set(
        (bookingRequests || [])
          .map(item => item.student_id)
          .filter(Boolean)
      )
    ];

    let studentMap = new Map();

    if (studentIds.length) {
      const {
        data: students,
        error: studentError
      } = await supabase()
        .from("profiles")
        .select("id, full_name, email, department")
        .in("id", studentIds);

      if (studentError) {
        console.warn(
          "Student profiles could not be read. Check profiles RLS policies:",
          studentError
        );
      } else {
        studentMap = new Map(
          (students || []).map(item => [
            item.id,
            item
          ])
        );
      }
    }

    state.requests = requestItems.map(item => {
      const booking = bookingMap.get(item.request_id) || {};
      const resource = resourceMap.get(item.resource_id) || {};
      const student = studentMap.get(booking.student_id) || {};

      return {
        id: item.id,
        sourceId: booking.id || item.request_id,
        studentId: booking.student_id || null,
        title: student.full_name || student.email || "Student",
        studentEmail: student.email || "",
        department: student.department || "",
        equipmentName: resource.name || "Equipment",
        resourceId: item.resource_id,
        requestedQuantity: Number(item.requested_quantity || 1),
        approvedQuantity: Number(item.approved_quantity || 0),
        date: booking.start_date || "",
        endDate: booking.due_date || "",
        createdAt: booking.created_at || booking.request_date || "",
        category: displayStatus(item.item_status || booking.status),
        itemStatus: item.item_status || "pending"
      };
    }).sort((a, b) =>
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    return state.requests;
  }

  // ==================================================
  // LOAD BORROWING AND RETURN HISTORY
  // ==================================================

  async function loadHistory() {
    state.history = [];

    const itemIds = state.requests.map(item => item.id);

    if (!itemIds.length) return state.history;

    const {
      data: records,
      error
    } = await supabase()
      .from("borrow_records")
      .select(
        "id, request_item_id, quantity_borrowed, quantity_returned, borrowed_at, due_date, returned_at, return_status, handed_over_by, received_by"
      )
      .in("request_item_id", itemIds)
      .order("borrowed_at", {
        ascending: false
      });

    if (error) throw error;

    const requestMap = new Map(
      state.requests.map(item => [
        item.id,
        item
      ])
    );

    state.history = (records || []).map(record => {
      const request =
        requestMap.get(record.request_item_id) || {};

      return {
        id: record.id,
        requestId: request.sourceId || record.request_item_id,
        equipment: request.equipmentName || "Equipment",
        user: request.title || "Student",
        date: record.returned_at || record.borrowed_at,
        duration: formatDuration(
          record.borrowed_at,
          record.returned_at
        ),
        status: record.returned_at ? "Returned" : "Borrowed",
        quantity: Number(record.quantity_borrowed || 0)
      };
    });

    return state.history;
  }

  async function logActivity(action, details) {
    try {
      const { error } = await supabase()
        .from("activity_logs")
        .insert({
          user_id: state.user.id,
          action,
          details: details || {}
        });

      if (error) {
        console.warn("Activity log not saved:", error);
      }

    } catch (error) {
      console.warn("Activity log not saved:", error);
    }
  }

  async function reloadAll() {
    await loadEquipment();
    await loadRequests();
    await loadHistory();
    renderCurrentPage();
  }

  // ==================================================
  // EQUIPMENT COUNTS
  // ==================================================

  function equipmentCounts() {
    const total = state.equipment.reduce(
      (sum, item) => sum + item.totalQuantity,
      0
    );

    const available = state.equipment.reduce(
      (sum, item) => sum + item.availableQuantity,
      0
    );

    const maintenance = state.equipment
      .filter(item => statusKey(item.status).includes("maintenance"))
      .reduce(
        (sum, item) =>
          sum + Math.max(
            0,
            item.totalQuantity - item.availableQuantity
          ),
        0
      );

    const inUse = Math.max(
      0,
      total - available - maintenance
    );

    return {
      total,
      available,
      inUse,
      maintenance
    };
  }

  function renderEquipmentCounts() {
    const counts = equipmentCounts();

    setText("#totalEquipmentCount", counts.total);
    setText("#availableCount", `${counts.available} Units`);
    setText("#inUseCount", `${counts.inUse} Units`);
    setText("#maintenanceCount", `${counts.maintenance} Units`);
    setText("#visibleCount", state.equipment.length);
  }

  // ==================================================
  // CATEGORY FILTER
  // ==================================================

  function populateCategoryFilter() {
    const select = $("#categoryFilter");

    if (!select) return;

    const previous = select.value || "all";

    select.innerHTML =
      '<option value="all">All Categories</option>' +
      state.categories.map(category =>
        `<option value="${esc(category.category_name)}">${esc(category.category_name)}</option>`
      ).join("");

    if (
      [...select.options].some(option => option.value === previous)
    ) {
      select.value = previous;
    }
  }

  // ==================================================
  // EQUIPMENT SEARCH AND FILTER
  // ==================================================

  function applyEquipmentFilters() {
    const grid = $("#equipmentGridContainer");

    if (!grid) return;

    const query =
      ($("#equipmentSearchInput")?.value || "")
        .toLowerCase()
        .trim();

    const category = $("#categoryFilter")?.value || "all";
    const status = $("#statusFilter")?.value || "all";
    const location = $("#locationFilter")?.value || "all";

    let visible = 0;

    $$(".equipment-card", grid).forEach(card => {
      const textMatch =
        !query ||
        `${card.dataset.name} ${card.dataset.id} ${card.dataset.room}`
          .toLowerCase()
          .includes(query);

      const categoryMatch =
        category === "all" ||
        card.dataset.category === category;

      const statusMatch =
        status === "all" ||
        statusKey(card.dataset.status) === statusKey(status);

      const locationMatch =
        location === "all" ||
        (card.dataset.room || "")
          .toLowerCase()
          .includes(location.toLowerCase());

      const show =
        textMatch &&
        categoryMatch &&
        statusMatch &&
        locationMatch;

      card.hidden = !show;

      if (show) visible++;
    });

    setText("#visibleCount", visible);

    const empty = $("#emptySearchState");

    if (empty) {
      empty.classList.toggle("hidden", visible > 0);
    }
  }

  window.filterEquipmentCards = applyEquipmentFilters;

  // ==================================================
  // DISPLAY EQUIPMENT
  // ==================================================

  function renderEquipment() {
    const grid = $("#equipmentGridContainer");

    if (!grid) return;

    grid.innerHTML = "";

    if (!state.equipment.length) {
      grid.innerHTML = `
        <div class="col-span-full rounded-xl border border-dashed p-10 text-center text-sm text-on-surface-variant">
          No equipment has been added to your inventory yet.
        </div>
      `;
    } else {
      state.equipment.forEach(item => {
        const card = document.createElement("article");

        card.className =
          "equipment-card flex flex-col rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden";

        card.dataset.id = item.id;
        card.dataset.name = item.name;
        card.dataset.room = item.location;
        card.dataset.status = statusKey(item.status);
        card.dataset.category = item.category;

        const image = item.image
          ? `
            <img
              src="${esc(item.image)}"
              alt="${esc(item.name)}"
              class="w-full h-full object-cover"
            >
          `
          : `
            <div class="h-full flex items-center justify-center text-outline">
              No image
            </div>
          `;

        card.innerHTML = `
          <div class="h-44 bg-surface-container overflow-hidden">
            ${image}
          </div>

          <div class="p-5 flex-1">

            <h2 class="font-title-md">
              ${esc(item.name)}
            </h2>

            <p class="text-sm text-on-surface-variant mt-2">
              ${esc(item.description)}
            </p>

            <p class="text-sm mt-3">
              Location: ${esc(item.location || "Not specified")}
            </p>

            <p class="text-sm mt-2">
              ${esc(item.category)}
              · ${item.availableQuantity}/${item.totalQuantity} available
            </p>

            <p class="text-sm mt-1">
              Status: ${esc(item.status)}
            </p>

            <div class="flex gap-2 mt-5">

              <button
                type="button"
                data-edit="${esc(item.id)}"
                class="px-3 py-2 rounded bg-surface-container"
              >
                Edit
              </button>

              <button
                type="button"
                data-delete="${esc(item.id)}"
                class="px-3 py-2 rounded bg-error-container text-error"
              >
                Delete
              </button>

            </div>
          </div>
        `;

        grid.append(card);
      });
    }

    const tbody = $("#equipmentTableContainer tbody");

    if (tbody) {
      tbody.innerHTML = state.equipment.length
        ? state.equipment.map(item => `
          <tr class="border-b">

            <td class="px-4 py-3">
              <strong>${esc(item.name)}</strong>
              <div class="text-xs">${esc(item.id)}</div>
            </td>

            <td class="px-4 py-3">
              ${esc(item.category)}
            </td>

            <td class="px-4 py-3">
              ${esc(item.location)}
            </td>

            <td class="px-4 py-3">
              ${esc(item.status)}
            </td>

            <td class="px-4 py-3">
              ${item.availableQuantity}/${item.totalQuantity}
            </td>

            <td class="px-4 py-3 text-right">
              <button
                type="button"
                data-edit="${esc(item.id)}"
                class="px-2 py-1 bg-surface-container rounded"
              >
                Edit
              </button>

              <button
                type="button"
                data-delete="${esc(item.id)}"
                class="px-2 py-1 bg-error-container text-error rounded"
              >
                Delete
              </button>
            </td>

          </tr>
        `).join("")
        : `
          <tr>
            <td colspan="6" class="p-6 text-center">
              No equipment available yet.
            </td>
          </tr>
        `;
    }

    populateCategoryFilter();
    renderEquipmentCounts();
    applyEquipmentFilters();
  }

  // ==================================================
  // EQUIPMENT PAGE: ADD, EDIT AND DELETE
  // ==================================================

  function setupEquipmentPage() {
    const modal = $("#addEquipmentModal");
    const grid = $("#equipmentGridContainer");

    if (!modal || !grid) return;

    const name = $("#equipmentNameField");
    const description = $("#equipmentDescriptionField");
    const location = $("#equipmentLocationField");
    const file = $("#equipmentImageField");
    const preview = $("#equipmentImagePreview");

    let editingId = null;

    function openModal(item = null) {
      editingId = item?.id || null;

      name.value = item?.name || "";
      description.value = item?.description || "";
      location.value = item?.location || "";

      state.selectedImage = item?.image || null;

      if (preview) {
        preview.src = state.selectedImage || "";
        preview.classList.toggle("hidden", !state.selectedImage);
      }

      const heading = $("#addEquipmentModal h2");

      if (heading) {
        heading.textContent = editingId
          ? "Edit Equipment"
          : "Add Equipment";
      }

      modal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }

    function closeModal() {
      modal.classList.add("hidden");
      document.body.style.overflow = "";
      editingId = null;
    }

    $("#openAddModalBtn")?.addEventListener(
      "click",
      () => openModal()
    );

    $("#headerAddEquipmentBtn")?.addEventListener(
      "click",
      () => openModal()
    );

    $("#closeAddModalBtn")?.addEventListener(
      "click",
      closeModal
    );

    $("#cancelModalBtn")?.addEventListener(
      "click",
      closeModal
    );

    $("#modalOverlay")?.addEventListener(
      "click",
      closeModal
    );

    $("#clearFiltersBtn")?.addEventListener("click", () => {
      if ($("#equipmentSearchInput")) {
        $("#equipmentSearchInput").value = "";
      }

      if ($("#categoryFilter")) {
        $("#categoryFilter").value = "all";
      }

      if ($("#statusFilter")) {
        $("#statusFilter").value = "all";
      }

      if ($("#locationFilter")) {
        $("#locationFilter").value = "all";
      }

      applyEquipmentFilters();
    });

    file?.addEventListener("change", () => {
      const selected = file.files?.[0];

      if (!selected) return;

      if (!selected.type.startsWith("image/")) {
        toast("Please select an image file.");
        file.value = "";
        return;
      }

      if (selected.size > 2 * 1024 * 1024) {
        toast("Image must be 2 MB or smaller.");
        file.value = "";
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        state.selectedImage = String(reader.result || "");

        if (preview) {
          preview.src = state.selectedImage;
          preview.classList.remove("hidden");
        }
      };

      reader.readAsDataURL(selected);
    });

    async function saveEquipment(event) {
      event?.preventDefault();

      const itemName = name?.value.trim() || "";
      const itemDescription = description?.value.trim() || "";
      const itemLocation = location?.value.trim() || "";

      if (!itemName || !itemLocation) {
        return toast("Equipment name and location are required.");
      }

      const saveButton = $("#publishEquipmentBtn");

      if (saveButton) saveButton.disabled = true;

      try {
        const changes = {
          name: itemName,
          description: itemDescription,
          location: itemLocation,
          image_url: state.selectedImage || null,
          condition: "good",
          status: "available"
        };

        if (editingId) {
          const result = await window.CampusDB.update(
            "resources",
            {
              id: editingId,
              owner_id: state.user.id
            },
            changes
          );

          if (!result?.length) {
            throw new Error(
              "Equipment was not updated. Check ownership and database permissions."
            );
          }

          toast("Equipment updated successfully.");

        } else {
          await window.CampusDB.insert(
            "resources",
            {
              ...changes,
              owner_id: state.user.id,
              total_quantity: 1,
              available_quantity: 1,
              category_id: "b5327fb8-029d-411b-912c-b1c319becc36"
            }
          );

          toast("Equipment added successfully.");
        }

        closeModal();

        if (name) name.value = "";
        if (description) description.value = "";
        if (location) location.value = "";
        if (file) file.value = "";

        state.selectedImage = null;

        await reloadAll();

      } catch (error) {
        console.error("Equipment save failed:", error);

        toast(error.message || "Could not save equipment.");

      } finally {
        if (saveButton) saveButton.disabled = false;
      }
    }

    $("#publishEquipmentBtn")?.addEventListener(
      "click",
      saveEquipment
    );

    grid.addEventListener("click", async event => {
      const editButton = event.target.closest("[data-edit]");
      const deleteButton = event.target.closest("[data-delete]");

      if (editButton) {
        const item = state.equipment.find(
          record => String(record.id) === editButton.dataset.edit
        );

        if (item) openModal(item);

        return;
      }

      if (deleteButton) {
        const itemId = deleteButton.dataset.delete;

        if (!window.confirm("Delete this equipment record?")) {
          return;
        }

        try {
          const result = await window.CampusDB.remove(
            "resources",
            {
              id: itemId,
              owner_id: state.user.id
            }
          );

          if (!result?.length) {
            throw new Error(
              "No equipment was deleted. It may have related bookings or may not belong to your account."
            );
          }

          toast("Equipment deleted.");

          await reloadAll();

        } catch (error) {
          console.error("Equipment delete failed:", error);

          toast(error.message || "Could not delete equipment.");
        }
      }
    });

    [
      "#equipmentSearchInput",
      "#categoryFilter",
      "#statusFilter",
      "#locationFilter"
    ].forEach(selector => {
      const element = $(selector);

      element?.addEventListener(
        selector === "#equipmentSearchInput" ? "input" : "change",
        applyEquipmentFilters
      );
    });

    $("#gridToggleBtn")?.addEventListener("click", () => {
      grid.classList.remove("hidden");
      $("#equipmentTableContainer")?.classList.add("hidden");
    });

    $("#tableToggleBtn")?.addEventListener("click", () => {
      grid.classList.add("hidden");
      $("#equipmentTableContainer")?.classList.remove("hidden");
    });

    window.refreshEquipmentPage = renderEquipment;

    renderEquipment();
  }

  // ==================================================
  // BOOKING REQUESTS
  // ==================================================

  function requestLabel(status) {
    return ({
      pending: "Pending review",
      approved: "Approved",
      waitlist: "Waitlisted",
      rejected: "Declined",
      borrowed: "Currently borrowed",
      returned: "Returned"
    })[status] || status;
  }

  async function recordDecision(request, status, reason = "") {
    if (!request) {
      throw new Error("The booking request could not be found.");
    }

    const normalized =
      status === "Approved" ? "approved"
      : status === "Waitlisted" ? "waitlist"
      : status === "Pending" ? "pending"
      : "rejected";

    const changes = {
      item_status: normalized
    };

    if (normalized === "approved") {
      changes.approved_quantity = request.requestedQuantity;
    }

    const { data, error } = await supabase()
      .from("booking_request_items")
      .update(changes)
      .eq("id", request.id)
      .select();

    if (error) throw error;

    if (!data?.length) {
      throw new Error(
        "Request status was not changed. Check Supabase permissions."
      );
    }

    await logActivity(
      `Booking ${normalized}`,
      {
        booking_request_id: request.sourceId,
        request_item_id: request.id,
        resource_id: request.resourceId,
        student_id: request.studentId,
        reason
      }
    );

    await reloadAll();
  }

  // ==================================================
  // START BORROWING
  // ==================================================

  async function startBorrowing(request) {
    const item = state.equipment.find(
      record => String(record.id) === String(request.resourceId)
    );

    if (!item) {
      throw new Error("The equipment record was not found.");
    }

    const quantity = Math.max(
      1,
      Number(request.approvedQuantity || request.requestedQuantity || 1)
    );

    if (item.availableQuantity < quantity) {
      throw new Error(
        `Only ${item.availableQuantity} unit(s) are available.`
      );
    }

    const now = new Date().toISOString();

    const { error: insertError } = await supabase()
      .from("borrow_records")
      .insert({
        request_item_id: request.id,
        quantity_borrowed: quantity,
        quantity_returned: 0,
        borrowed_at: now,
        due_date: request.endDate || null,
        return_status: "borrowed",
        handed_over_by: state.user.id
      });

    if (insertError) throw insertError;

    const nextAvailable = item.availableQuantity - quantity;

    const { error: resourceError } = await supabase()
      .from("resources")
      .update({
        available_quantity: nextAvailable,
        status: nextAvailable > 0 ? "available" : "in-use"
      })
      .eq("id", item.id)
      .eq("owner_id", state.user.id);

    if (resourceError) throw resourceError;

    const { error: itemError } = await supabase()
      .from("booking_request_items")
      .update({
        item_status: "borrowed",
        approved_quantity: quantity
      })
      .eq("id", request.id);

    if (itemError) throw itemError;

    await logActivity("Equipment checked out", {
      booking_request_id: request.sourceId,
      request_item_id: request.id,
      resource_id: item.id,
      quantity
    });

    await reloadAll();

    toast("Borrowing started and recorded.");
  }

  // ==================================================
  // COMPLETE RETURN
  // ==================================================

  async function completeReturn(request) {
    if (!request) {
      throw new Error("Select a borrowed request first.");
    }

    const {
      data: records,
      error: findError
    } = await supabase()
      .from("borrow_records")
      .select("id, quantity_borrowed, quantity_returned")
      .eq("request_item_id", request.id)
      .is("returned_at", null)
      .order("borrowed_at", {
        ascending: false
      })
      .limit(1);

    if (findError) throw findError;

    const record = records?.[0];

    if (!record) {
      throw new Error("No active borrowing record was found.");
    }

    const quantity = Math.max(
      0,
      Number(record.quantity_borrowed || 0) -
      Number(record.quantity_returned || 0)
    );

    const condition =
      $("input[name='returnCondition']:checked")?.value ||
      "good";

    const returnedAt = new Date().toISOString();

    const { error: returnError } = await supabase()
      .from("borrow_records")
      .update({
        quantity_returned: Number(record.quantity_borrowed || 0),
        returned_at: returnedAt,
        return_status: "returned",
        received_by: state.user.id
      })
      .eq("id", record.id);

    if (returnError) throw returnError;

    const item = state.equipment.find(
      recordItem => String(recordItem.id) === String(request.resourceId)
    );

    if (item) {
      const isGood =
        !["damaged", "maintenance"].includes(statusKey(condition));

      const available = isGood
        ? Math.min(
            item.totalQuantity,
            item.availableQuantity + quantity
          )
        : item.availableQuantity;

      const { error: resourceError } = await supabase()
        .from("resources")
        .update({
          available_quantity: available,
          condition,
          status: isGood
            ? (available > 0 ? "available" : "in-use")
            : "maintenance"
        })
        .eq("id", item.id)
        .eq("owner_id", state.user.id);

      if (resourceError) throw resourceError;
    }

    const { error: itemError } = await supabase()
      .from("booking_request_items")
      .update({
        item_status: "returned"
      })
      .eq("id", request.id);

    if (itemError) throw itemError;

    await logActivity("Equipment returned", {
      booking_request_id: request.sourceId,
      request_item_id: request.id,
      resource_id: request.resourceId,
      quantity,
      condition,
      notes: $("#returnInspectionNotes")?.value?.trim() || ""
    });

    state.selectedRequest = null;

    $("#returnInspectionModal")?.classList.add("hidden");
    $("#returnInspectionModal")?.classList.remove("flex");

    await reloadAll();

    toast("Return recorded successfully.");
  }

  // ==================================================
  // REQUESTS PAGE DISPLAY AND ACTIONS
  // ==================================================

  function setupRequestsPage() {
    const container =
      $("#requestsContainer") ||
      $("main");

    if (!container) return;

    $$(".request-card, .request-item", container).forEach(card => {
      card.hidden = true;
    });

    let panel = $("#studentPortalLiveRequests");

    if (!panel) {
      panel = document.createElement("section");
      panel.id = "studentPortalLiveRequests";
      panel.className =
        "mt-5 rounded-xl bg-surface-container-lowest p-4 md:p-6";

      container.prepend(panel);
    }

    let filter = "all";
    let query = "";

    const selected = new Set();

    function render() {
      const statuses = [
        "all",
        "pending",
        "approved",
        "waitlist",
        "rejected",
        "borrowed",
        "returned"
      ];

      const counts = Object.fromEntries(
        statuses.map(status => [
          status,
          status === "all"
            ? state.requests.length
            : state.requests.filter(item => item.category === status).length
        ])
      );

      const items = state.requests.filter(item =>
        (filter === "all" || item.category === filter) &&
        (
          !query ||
          [
            item.title,
            item.studentEmail,
            item.equipmentName,
            item.sourceId
          ].join(" ").toLowerCase().includes(query)
        )
      );

      panel.innerHTML = `
        <div class="flex flex-wrap justify-between gap-3 mb-4">
          <div>
            <h2 class="text-xl font-semibold">
              Student booking requests
            </h2>

            <p class="text-sm text-on-surface-variant mt-1">
              Requests loaded from Supabase for equipment in your inventory.
            </p>
          </div>

          <button
            type="button"
            data-refresh-requests
            class="px-3 py-2 rounded-lg border text-sm"
          >
            Refresh
          </button>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">

          ${statuses.map(key => `
            <button
              type="button"
              data-filter="${key}"
              class="rounded-lg border p-2 text-left ${
                filter === key
                  ? "bg-primary text-white border-primary"
                  : "bg-surface text-on-surface"
              }"
            >
              <span class="block text-xs">
                ${key === "all" ? "All" : requestLabel(key)}
              </span>

              <strong class="text-lg">${counts[key]}</strong>
            </button>
          `).join("")}

        </div>

        <div class="flex flex-col sm:flex-row gap-2 mb-4">

          <input
            id="liveRequestSearch"
            value="${esc(query)}"
            class="w-full sm:flex-1 rounded-lg border px-3 py-2"
            placeholder="Search student, equipment or email"
          >

          <button
            type="button"
            data-select-visible
            class="px-3 py-2 rounded-lg border"
          >
            Select visible
          </button>

          <button
            type="button"
            data-batch-approve
            class="px-3 py-2 rounded-lg bg-primary text-white"
          >
            Approve selected
          </button>

          <span class="self-center text-sm text-on-surface-variant">
            ${selected.size} selected
          </span>

        </div>

        <div class="space-y-3">

          ${
            items.length
              ? items.map(request => `
                <article
                  class="border rounded-xl p-4"
                  data-live-id="${esc(request.id)}"
                >

                  <div class="flex flex-wrap justify-between gap-3">

                    <div class="flex items-start gap-2">

                      <input
                        type="checkbox"
                        data-select-live="${esc(request.id)}"
                        ${selected.has(request.id) ? "checked" : ""}
                        aria-label="Select request"
                      >

                      <div>
                        <div class="font-semibold">
                          ${esc(request.title)}
                        </div>

                        <div class="text-xs text-on-surface-variant">
                          ${esc(request.studentEmail || "Email unavailable")}
                          · Request ${esc(request.sourceId)}
                        </div>
                      </div>

                    </div>

                    <span class="px-2 py-1 rounded-full text-xs font-semibold">
                      ${esc(requestLabel(request.category))}
                    </span>

                  </div>

                  <div class="grid sm:grid-cols-2 gap-2 mt-3 text-sm">

                    <div>
                      <span class="text-on-surface-variant">
                        Equipment
                      </span>

                      <div class="font-medium">
                        ${esc(request.equipmentName)}
                      </div>

                      <div class="text-xs text-on-surface-variant">
                        Quantity requested: ${request.requestedQuantity}
                      </div>
                    </div>

                    <div>
                      <span class="text-on-surface-variant">
                        Booking period
                      </span>

                      <div class="font-medium">
                        ${esc(formatDate(request.date))}
                        –
                        ${esc(formatDate(request.endDate))}
                      </div>
                    </div>

                  </div>

                  <div class="flex flex-wrap gap-2 mt-4">

                    ${
                      ["pending", "waitlist"].includes(request.category)
                        ? `
                          <button
                            data-action="approve"
                            class="px-3 py-2 rounded-lg bg-primary text-white text-sm"
                          >
                            Approve
                          </button>

                          <button
                            data-action="waitlist"
                            class="px-3 py-2 rounded-lg border text-sm"
                          >
                            Waitlist
                          </button>

                          <button
                            data-action="reject"
                            class="px-3 py-2 rounded-lg bg-error-container text-error text-sm"
                          >
                            Decline
                          </button>
                        `
                        : ""
                    }

                    ${
                      request.category === "approved"
                        ? `
                          <button
                            data-action="start"
                            class="px-3 py-2 rounded-lg bg-primary text-white text-sm"
                          >
                            Start borrowing
                          </button>
                        `
                        : ""
                    }

                    ${
                      request.category === "borrowed"
                        ? `
                          <button
                            data-action="return"
                            class="px-3 py-2 rounded-lg bg-primary text-white text-sm"
                          >
                            Complete return
                          </button>
                        `
                        : ""
                    }

                    ${
                      ["rejected", "returned"].includes(request.category)
                        ? `
                          <button
                            data-action="reopen"
                            class="px-3 py-2 rounded-lg border text-sm"
                          >
                            Reopen review
                          </button>
                        `
                        : ""
                    }

                  </div>

                </article>
              `).join("")
              : `
                <div class="rounded-lg border border-dashed p-8 text-center text-sm text-on-surface-variant">
                  No booking requests were found for your equipment.
                </div>
              `
          }

        </div>
      `;
    }

    window.renderStudentPortalRequests = render;

    render();

    panel.addEventListener("input", event => {
      if (event.target.id !== "liveRequestSearch") return;

      query = event.target.value.toLowerCase().trim();

      render();

      const input = $("#liveRequestSearch");

      input?.focus();
      input?.setSelectionRange(query.length, query.length);
    });

    panel.addEventListener("change", event => {
      const checkbox = event.target.closest("[data-select-live]");

      if (!checkbox) return;

      if (checkbox.checked) {
        selected.add(checkbox.dataset.selectLive);
      } else {
        selected.delete(checkbox.dataset.selectLive);
      }

      const count = panel.querySelector(".self-center.text-sm");

      if (count) {
        count.textContent = `${selected.size} selected`;
      }
    });

    panel.addEventListener("click", async event => {
      const filterButton = event.target.closest("[data-filter]");

      if (filterButton) {
        filter = filterButton.dataset.filter;
        selected.clear();
        render();
        return;
      }

      if (event.target.closest("[data-refresh-requests]")) {
        try {
          await reloadAll();
          toast("Booking requests refreshed.");
        } catch (error) {
          toast(error.message || "Could not refresh requests.");
        }

        return;
      }

      if (event.target.closest("[data-select-visible]")) {
        state.requests
          .filter(item =>
            (filter === "all" || item.category === filter) &&
            (
              !query ||
              [item.title, item.studentEmail, item.equipmentName]
                .join(" ")
                .toLowerCase()
                .includes(query)
            )
          )
          .forEach(item => selected.add(item.id));

        render();
        return;
      }

      if (event.target.closest("[data-batch-approve]")) {
        const targets = state.requests.filter(item =>
          selected.has(item.id) &&
          ["pending", "waitlist"].includes(item.category)
        );

        try {
          for (const item of targets) {
            await recordDecision(item, "Approved");
          }

          selected.clear();

          toast(`${targets.length} request(s) approved.`);

        } catch (error) {
          toast(error.message || "Could not approve selected requests.");
        }

        return;
      }

      const button = event.target.closest("[data-action]");

      if (!button) return;

      const card = button.closest("[data-live-id]");

      const request = state.requests.find(
        item => item.id === card?.dataset.liveId
      );

      if (!request) return;

      try {
        const action = button.dataset.action;

        if (action === "approve") {
          await recordDecision(request, "Approved");
        }

        if (action === "waitlist") {
          await recordDecision(request, "Waitlisted");
        }

        if (action === "reject") {
          const reason = window.prompt(
            "Enter the reason for declining this booking:"
          );

          if (reason === null) return;

          if (!reason.trim()) {
            return toast("A reason is required.");
          }

          await recordDecision(
            request,
            "Declined",
            reason.trim()
          );
        }

        if (action === "start") {
          await startBorrowing(request);
        }

        if (action === "return") {
          state.selectedRequest = request;

          $("#returnInspectionModal")?.classList.remove("hidden");
          $("#returnInspectionModal")?.classList.add("flex");

          if (!$("#returnInspectionModal")) {
            if (
              window.confirm(
                `Complete the return for ${request.equipmentName}?`
              )
            ) {
              await completeReturn(request);
            }
          }
        }

        if (action === "reopen") {
          await recordDecision(request, "Pending");
        }

      } catch (error) {
        console.error("Booking action failed:", error);

        toast(error.message || "Could not update booking.");
      }
    });
  }

  // ==================================================
  // CALENDAR PAGE
  // ==================================================

  function setupCalendarPage() {
    const main = $("main");

    if (!main) return;

    let panel = $("#persistentCalendarBookings");

    if (!panel) {
      panel = document.createElement("section");
      panel.id = "persistentCalendarBookings";
      panel.className = "mt-6 rounded-xl bg-white p-5 shadow-sm";
      main.append(panel);
    }

    function render() {
      const bookings = state.requests.filter(item =>
        ["pending", "approved", "borrowed", "waitlist"]
          .includes(item.category)
      );

      panel.innerHTML = `
        <h2 class="text-xl font-semibold mb-3">
          Bookings for your equipment
        </h2>
      ` + (
        bookings.length
          ? bookings.map(item => `
            <div class="border-b py-3">

              <div class="flex flex-wrap justify-between gap-2">
                <strong>
                  ${esc(item.equipmentName)} · ${esc(item.title)}
                </strong>

                <span>
                  ${esc(requestLabel(item.category))}
                </span>
              </div>

              <div class="text-sm text-on-surface-variant">
                ${esc(formatDate(item.date))}
                –
                ${esc(formatDate(item.endDate))}
                · Quantity: ${item.requestedQuantity}
              </div>

            </div>
          `).join("")
          : `
            <p class="text-sm text-on-surface-variant">
              No bookings are scheduled for your equipment.
            </p>
          `
      );
    }

    $$(".sample-booking").forEach(node => node.remove());

    render();

    window.refreshCalendarPage = render;
  }

  // ==================================================
  // HISTORY PAGE
  // ==================================================

  function setupHistoryPage() {
    const main = $("main");

    if (!main) return;

    let panel = $("#persistentCompletedHistory");

    if (!panel) {
      panel = document.createElement("section");
      panel.id = "persistentCompletedHistory";
      panel.className = "mt-6 rounded-xl bg-white p-5 shadow-sm";
      main.append(panel);
    }

    $$("tbody tr, .history-row, [data-transaction]")
      .forEach(row => {
        row.hidden = true;
      });

    const search = $("#global-search-input");

    function exportCsv() {
      const rows = [
        [
          "Equipment",
          "Student",
          "Date",
          "Duration",
          "Status",
          "Quantity"
        ],
        ...state.history.map(item => [
          item.equipment,
          item.user,
          item.date,
          item.duration,
          item.status,
          item.quantity
        ])
      ];

      const csv = rows
        .map(row =>
          row.map(value =>
            `"${String(value ?? "").replace(/"/g, '""')}"`
          ).join(",")
        )
        .join("\n");

      const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv" })
      );

      const link = document.createElement("a");

      link.href = url;
      link.download = "campusshare-equipment-history.csv";
      link.click();

      URL.revokeObjectURL(url);
    }

    function render() {
      const query =
        (search?.value || "").toLowerCase().trim();

      const rows = state.history.filter(item =>
        !query ||
        [item.equipment, item.user, item.status]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );

      panel.innerHTML = `
        <div class="flex flex-wrap justify-between gap-3 mb-3">
          <h2 class="text-lg font-semibold">
            Borrowing and return history
          </h2>

          <button
            id="exportLiveHistory"
            class="px-3 py-2 rounded border text-sm"
          >
            Export CSV
          </button>
        </div>
      ` + (
        rows.length
          ? rows.map(item => `
            <div class="py-3 border-b text-sm">
              <strong>${esc(item.equipment)}</strong>
              · ${esc(item.user)}
              · ${esc(item.status)}
              · ${esc(formatDate(item.date))}
              · Quantity: ${item.quantity}
              · ${esc(item.duration)}
            </div>
          `).join("")
          : `
            <p class="text-sm text-on-surface-variant">
              No borrowing or return records have been recorded for your equipment.
            </p>
          `
      );

      $("#exportLiveHistory")?.addEventListener(
        "click",
        exportCsv
      );
    }

    search?.addEventListener("input", render);

    $("#btn-export-csv")?.addEventListener(
      "click",
      exportCsv
    );

    $("#btn-export-pdf")?.addEventListener(
      "click",
      () => window.print()
    );

    render();

    window.refreshHistoryPage = render;
  }

  // ==================================================
  // DASHBOARD
  // ==================================================

  function renderDashboard() {
    const counts = equipmentCounts();

    const pending = state.requests.filter(
      item => item.category === "pending"
    ).length;

    const approved = state.requests.filter(
      item => item.category === "approved"
    ).length;

    const borrowed = state.requests.filter(
      item => item.category === "borrowed"
    ).length;

    const returned = state.history.filter(
      item => item.status === "Returned"
    ).length;

    // Dashboard IDs from the updated dashboard.html.
    setText("#dashboardTotalInventory", counts.total);
    setText("#dashboardAvailable", counts.available);
    setText("#dashboardPending", pending);
    setText("#dashboardApproved", approved);
    setText("#dashboardBorrowed", borrowed);
    setText("#dashboardReturned", returned);

    const badge = $(
      'a[data-path="booking-requests"] [data-pending-count]'
    );

    if (badge) {
      badge.textContent = String(pending);
    }

    const recent = $("#dashboardRecentRequests");

    if (recent) {
      const requests = state.requests.slice(0, 5);

      recent.innerHTML = requests.length
        ? requests.map(item => `
          <article class="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/30 py-3">

            <div class="min-w-0">
              <p class="font-semibold">
                ${esc(item.equipmentName)}
              </p>

              <p class="text-sm text-on-surface-variant">
                ${esc(item.title)}
                · ${esc(formatDate(item.date))}
              </p>
            </div>

            <span class="rounded-full bg-surface-container px-3 py-1 text-xs font-semibold">
              ${esc(requestLabel(item.category))}
            </span>

          </article>
        `).join("")
        : `
          <p class="py-6 text-center text-sm text-on-surface-variant">
            No booking requests have been submitted for your equipment yet.
          </p>
        `;
    }
  }

  // ==================================================
  // REFRESH CURRENT PAGE
  // ==================================================

  function renderCurrentPage() {
    const page = location.pathname.split("/").pop().toLowerCase();

    if (page === "dashboard.html") {
      renderDashboard();
    }

    if (page === "equipment.html") {
      renderEquipment();
    }

    if (page === "requests.html") {
      window.renderStudentPortalRequests?.();
    }

    if (page === "calendar.html") {
      window.refreshCalendarPage?.();
    }

    if (page === "history.html") {
      window.refreshHistoryPage?.();
    }
  }

  // ==================================================
  // COMPATIBILITY WITH EXISTING HTML BUTTONS
  // ==================================================

  window.filterRequests = (filter, button) => {
    const panel = $("#dashboardRecentRequests");

    if (!panel) return;

    $$("[data-live-status]", panel).forEach(item => {
      item.hidden =
        filter !== "all" &&
        item.dataset.liveStatus !== filter;
    });

    $$(".filter-btn").forEach(item => {
      item.classList.remove("active-tab");
    });

    button?.classList.add("active-tab");
  };

  window.toggleEquipmentStatus = () => {
    toast(
      "Manage equipment availability from My Equipment and booking actions."
    );
  };

  window.openRejectModal = () => {
    toast("Decline requests from the live Booking Requests list.");
  };

  window.closeRejectModal = () => {
    $("#reject-modal")?.classList.add("hidden");
  };

  window.confirmRejection = () => {
    toast("Decline requests from the live Booking Requests list.");
  };

  window.confirmRejectAction = () => {
    window.confirmRejection();
  };

  window.openWaitlistModal = () => {
    $("#waitlistModal")?.classList.remove("hidden");
  };

  window.closeWaitlistModal = () => {
    $("#waitlistModal")?.classList.add("hidden");
  };

  window.openReturnInspectionModal = () => {
    $("#returnInspectionModal")?.classList.remove("hidden");
  };

  window.closeReturnInspectionModal = () => {
    $("#returnInspectionModal")?.classList.add("hidden");
  };

  window.confirmReturnSignOff = async () => {
    try {
      await completeReturn(state.selectedRequest);
    } catch (error) {
      toast(error.message || "Could not complete return.");
    }
  };

  window.insertReason = value => {
    if ($("#rejectionReasonInput")) {
      $("#rejectionReasonInput").value = value;
    }
  };

  window.insertInspectionNotes = value => {
    if ($("#returnInspectionNotes")) {
      $("#returnInspectionNotes").value = value;
    }
  };

  window.openChatDrawer = (name, equipment, id) => {
    $("#chatDrawerPanel")?.classList.remove("translate-x-full");

    $("#chatDrawerOverlay")?.classList.remove(
      "opacity-0",
      "pointer-events-none"
    );

    setText("#chatDrawerUserName", name || "Student");
    setText("#chatDrawerEqId", id || equipment || "");
  };

  window.closeChatDrawer = () => {
    $("#chatDrawerPanel")?.classList.add("translate-x-full");

    $("#chatDrawerOverlay")?.classList.add(
      "opacity-0",
      "pointer-events-none"
    );
  };

  window.insertQuickChatPrompt = value => {
    if ($("#chatInputMessage")) {
      $("#chatInputMessage").value = value;
    }
  };

  window.toggleDetails = (id, button) => {
    const element = document.getElementById(id);

    if (!element) return;

    element.classList.toggle("hidden");

    if (button) {
      button.textContent =
        element.classList.contains("hidden")
          ? "View details"
          : "Hide details";
    }
  };

  window.downloadCheckinSlip = (name, requestId) => {
    toast(
      `Check-in: ${name || "Student"} · ${requestId || "Request"}`
    );
  };

  window.openAuditDrawer = (
    equipmentId,
    userName,
    userId,
    institution,
    date,
    duration,
    status,
    condition,
    hash
  ) => {
    $("#audit-drawer-backdrop")?.classList.remove(
      "opacity-0",
      "pointer-events-none"
    );

    $("#audit-drawer-panel")?.classList.remove("translate-x-full");

    setText("#drawer-eq-id", equipmentId);
    setText("#drawer-user-name", userName);

    setText(
      "#drawer-user-meta",
      [userId, institution].filter(Boolean).join(" · ")
    );

    setText("#drawer-hash", hash);
  };

  window.closeAuditDrawer = () => {
    $("#audit-drawer-backdrop")?.classList.add(
      "opacity-0",
      "pointer-events-none"
    );

    $("#audit-drawer-panel")?.classList.add("translate-x-full");
  };

  // ==================================================
  // INITIALIZE
  // ==================================================

  async function init() {
    if (!window.CampusDB) {
      throw new Error(
        "CampusDB is not initialized. Check the Supabase script tags."
      );
    }

    await loadStaffProfile();
    await loadEquipment();
    await loadRequests();
    await loadHistory();

    const page = location.pathname.split("/").pop().toLowerCase();

    if (page === "equipment.html") {
      setupEquipmentPage();
    }

    if (page === "requests.html") {
      setupRequestsPage();
    }

    if (page === "calendar.html") {
      setupCalendarPage();
    }

    if (page === "history.html") {
      setupHistoryPage();
    }

    renderCurrentPage();
  }

  init().catch(error => {
    console.error(
      "CampusShare staff portal initialization failed:",
      error
    );

    toast(
      error.message ||
      "Could not load staff portal. Check the browser Console and Supabase permissions."
    );
  });

})();
