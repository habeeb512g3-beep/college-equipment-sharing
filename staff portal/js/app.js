(() => {
  "use strict";

  // CampusShare staff portal
  // Data source: Supabase. Browser storage is not used for inventory or bookings.

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const client = () => window.supabaseClient;

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

  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

  const normalizeStatus = value =>
    String(value || "pending").toLowerCase().replace(/[_\s]+/g, "-");

  const dateText = value => {
    if (!value) return "Not specified";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleString();
  };

  const toast = message => {
    let element = $("#appToast") || $("#toastNotification") || $("#toast-notification");

    if (!element) {
      element = document.createElement("div");
      element.id = "appToast";
      element.style.cssText =
        "position:fixed;bottom:22px;right:22px;z-index:99999;background:#213145;color:white;padding:12px 18px;border-radius:10px;box-shadow:0 4px 18px #0003;max-width:360px";
      document.body.append(element);
    }

    const textElement = $("#toastText", element) || $("#toast-text", element);

    if (textElement) {
      textElement.textContent = message;
    } else {
      element.textContent = message;
    }

    element.hidden = false;
    element.classList.add("show");

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
      element.hidden = true;
      element.classList.remove("show");
    }, 3200);
  };

  window.showToast = toast;

  function setText(selector, value) {
    const element = $(selector);
    if (element) element.textContent = value;
  }

  // --------------------------------------------------
  // BRANDING
  // --------------------------------------------------

  function updateBranding() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );

    const nodes = [];

    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach(node => {
      node.nodeValue = node.nodeValue
        .replace(/ShareSpace/g, "CampusShare")
        .replace(
          /MIT NanoFab & Molecular Bio Lab \(Building 76\)/gi,
          "CampusShare Equipment Portal"
        )
        .replace(/MIT/gi, "CampusShare")
        .replace(/Harvard BioMed/gi, "CampusShare");
    });

    $$('img[alt*="ShareSpace"], img[alt*="MIT"]').forEach(image => {
      image.alt = "CampusShare";
    });
  }

  // --------------------------------------------------
  // STAFF PROFILE AND LOGOUT
  // --------------------------------------------------

  function updateStaffIdentity() {
    const name =
      state.profile?.full_name ||
      state.user?.email?.split("@")[0] ||
      "Staff member";

    const email =
      state.profile?.email ||
      state.user?.email ||
      "";

    const department =
      state.profile?.department ||
      "Staff";

    const heading = $("main h1");

    if (heading && /^Welcome back,/i.test(heading.textContent.trim())) {
      heading.textContent = `Welcome back, ${name}`;
    }

    $$("header span, header div, header p").forEach(element => {
      const text = element.textContent.trim();

      if (
        /^Dr\. Eleanor Vance$|^Lab Director • Biotech Research Core$|^Verified Owner$/i.test(text)
      ) {
        if (/^Dr\. Eleanor Vance$/i.test(text)) {
          element.textContent = name;
        } else if (/^Lab Director/i.test(text)) {
          element.textContent = department;
        } else {
          element.textContent =
            state.profile?.role === "owner"
              ? "Verified Staff"
              : "Staff";
        }
      }
    });

    const profileArea =
      $("header .pl-space-xs") ||
      $("header .flex.items-center.gap-space-sm.pl-space-xs");

    if (profileArea) {
      profileArea.title = `${name}${email ? ` · ${email}` : ""}`;
    }

    // Add logout button.
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

    // Hide nonfunctional links.
    $$('a[data-path="settings"], a[data-path="help-and-support"]')
      .forEach(link => {
        link.hidden = true;
      });
  }

  async function logout() {
    try {
      const { error } = await client().auth.signOut();

      if (error) throw error;

      window.location.href = "../index.html";

    } catch (error) {
      console.error("CampusShare sign-out failed:", error);

      toast(
        error.message ||
        "Could not log out. Please try again."
      );
    }
  }

  // --------------------------------------------------
  // CHECK STAFF LOGIN
  // --------------------------------------------------

  async function requireStaffSession() {
    if (!client()) {
      throw new Error(
        "Supabase is not initialized. Check the Supabase script tags."
      );
    }

    const { data, error } = await client().auth.getUser();

    if (error) throw error;

    if (!data?.user) {
      window.location.href = "../index.html";

      throw new Error(
        "Please sign in to access the staff portal."
      );
    }

    state.user = data.user;

    const { data: profile, error: profileError } = await client()
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
      toast("This account does not have approved staff access.");

      await client().auth.signOut();

      window.location.href = "../index.html";

      throw new Error("Approved staff access is required.");
    }

    state.profile = profile;

    updateStaffIdentity();
  }

  // --------------------------------------------------
  // LOAD EQUIPMENT FROM SUPABASE
  // --------------------------------------------------

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

    const categoryMap = new Map(
      (categories || []).map(category => [
        category.id,
        category.category_name
      ])
    );

    state.categories = categories || [];

    state.equipment = (resources || []).map(item => ({
      id: item.id,
      name: item.name || "Unnamed equipment",
      description: item.description || "",
      image: item.image_url || "",
      location: item.location || "",
      categoryId: item.category_id || null,
      category: categoryMap.get(item.category_id) || "Other",
      totalQuantity: Number(item.total_quantity || 0),
      availableQuantity: Number(item.available_quantity || 0),
      condition: item.condition || "",
      status: item.status || "available",
      ownerId: item.owner_id
    }));

    return state.equipment;
  }

  // --------------------------------------------------
  // CONVERT DATABASE BOOKING STATUS
  // --------------------------------------------------

  function toDisplayStatus(value) {
    const status = normalizeStatus(value);

    if (["ready", "approved"].includes(status)) {
      return "approved";
    }

    if (["rejected", "declined", "cancelled"].includes(status)) {
      return "rejected";
    }

    if (["waitlist", "waitlisted"].includes(status)) {
      return "waitlist";
    }

    if (["borrowed", "in-use", "issued"].includes(status)) {
      return "borrowed";
    }

    if (["returned", "completed"].includes(status)) {
      return "returned";
    }

    return "pending";
  }

  // --------------------------------------------------
  // LOAD STUDENT BOOKING REQUESTS
  // --------------------------------------------------

  async function loadRequests() {
    state.requests = [];

    const resourceIds = state.equipment.map(item => item.id);

    if (!resourceIds.length) {
      return state.requests;
    }

    const { data: requestItems, error: itemsError } = await client()
      .from("booking_request_items")
      .select(
        "id, request_id, resource_id, requested_quantity, approved_quantity, item_status"
      )
      .in("resource_id", resourceIds);

    if (itemsError) throw itemsError;

    if (!requestItems?.length) {
      return state.requests;
    }

    const requestIds = [
      ...new Set(
        requestItems
          .map(item => item.request_id)
          .filter(Boolean)
      )
    ];

    const studentIds = [];

    const [
      { data: requests, error: requestsError },
      { data: resources, error: resourcesError }
    ] = await Promise.all([
      client()
        .from("booking_requests")
        .select(
          "id, student_id, request_date, start_date, due_date, status, created_at"
        )
        .in("id", requestIds),

      client()
        .from("resources")
        .select(
          "id, name, owner_id, location, total_quantity, available_quantity"
        )
        .in("id", resourceIds)
    ]);

    if (requestsError) throw requestsError;
    if (resourcesError) throw resourcesError;

    const requestMap = new Map(
      (requests || []).map(request => [
        request.id,
        request
      ])
    );

    const resourceMap = new Map(
      (resources || []).map(resource => [
        resource.id,
        resource
      ])
    );

    (requests || []).forEach(request => {
      if (request.student_id) {
        studentIds.push(request.student_id);
      }
    });

    let profileMap = new Map();

    if (studentIds.length) {
      const { data: students, error: studentError } = await client()
        .from("profiles")
        .select("id, full_name, email, department")
        .in("id", [...new Set(studentIds)]);

      if (studentError) {
        console.warn(
          "Student profile details are not readable under the current RLS policy:",
          studentError
        );
      } else {
        profileMap = new Map(
          (students || []).map(student => [
            student.id,
            student
          ])
        );
      }
    }

    state.requests = requestItems.map(item => {
      const request = requestMap.get(item.request_id) || {};
      const resource = resourceMap.get(item.resource_id) || {};
      const student = profileMap.get(request.student_id) || {};

      return {
        id: item.id,
        sourceId: request.id || item.request_id,
        studentId: request.student_id,
        title: student.full_name || student.email || "Student",
        studentEmail: student.email || "",
        department: student.department || "",
        equipmentName: resource.name || "Equipment",
        equipment: resource.id || item.resource_id,
        resourceId: resource.id || item.resource_id,
        requestedQuantity: Number(item.requested_quantity || 1),
        approvedQuantity: Number(item.approved_quantity || 0),
        date: request.start_date || "",
        endDate: request.due_date || "",
        createdAt: request.created_at || request.request_date || "",
        category: toDisplayStatus(
          item.item_status || request.status
        ),
        requestStatus: request.status || "pending",
        itemStatus: item.item_status || "pending"
      };
    }).sort((a, b) =>
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    return state.requests;
  }

  // --------------------------------------------------
  // LOAD BORROWING AND RETURN HISTORY
  // --------------------------------------------------

  async function loadHistory() {
    state.history = [];

    const itemIds = state.requests.map(request => request.id);

    if (itemIds.length) {
      const { data: borrowRecords, error } = await client()
        .from("borrow_records")
        .select(
          "id, request_item_id, quantity_borrowed, quantity_returned, borrowed_at, due_date, returned_at, return_status, handed_over_by, received_by"
        )
        .in("request_item_id", itemIds)
        .order("borrowed_at", {
          ascending: false
        });

      if (error) throw error;

      const requestByItem = new Map(
        state.requests.map(request => [
          request.id,
          request
        ])
      );

      state.history = (borrowRecords || []).map(record => {
        const request =
          requestByItem.get(record.request_item_id) || {};

        return {
          id: record.id,
          requestId: request.sourceId || record.request_item_id,
          equipment: request.equipmentName || "Equipment",
          user: request.title || "Student",
          institution: request.department || "",
          date: record.returned_at || record.borrowed_at,
          duration:
            record.borrowed_at && record.returned_at
              ? formatDuration(
                  new Date(record.returned_at) -
                  new Date(record.borrowed_at)
                )
              : "Not returned",
          status: record.returned_at ? "Returned" : "Borrowed",
          quantity: Number(record.quantity_borrowed || 0),
          returnStatus: record.return_status || ""
        };
      });
    }

    return state.history;
  }

  function formatDuration(milliseconds) {
    const minutes = Math.max(
      0,
      Math.floor(Number(milliseconds || 0) / 60000)
    );

    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  // --------------------------------------------------
  // ACTIVITY LOG
  // --------------------------------------------------

  async function logActivity(action, details) {
    try {
      const { error } = await client()
        .from("activity_logs")
        .insert({
          user_id: state.user.id,
          action,
          details: details || {}
        });

      if (error) {
        console.warn("Activity log could not be saved:", error);
      }

    } catch (error) {
      console.warn("Activity log could not be saved:", error);
    }
  }

  // --------------------------------------------------
  // INVENTORY COUNTS
  // --------------------------------------------------

  function equipmentCounts() {
    const total = state.equipment.reduce(
      (sum, item) => sum + item.totalQuantity,
      0
    );

    const available = state.equipment.reduce(
      (sum, item) => sum + item.availableQuantity,
      0
    );

    const inUse = Math.max(0, total - available);

    const maintenance = state.equipment
      .filter(item =>
        normalizeStatus(item.status).includes("maintenance")
      )
      .reduce(
        (sum, item) =>
          sum + Math.max(0, item.totalQuantity - item.availableQuantity),
        0
      );

    const overdue = state.requests.filter(request => {
      return (
        request.category === "borrowed" &&
        request.endDate &&
        new Date(request.endDate) < new Date()
      );
    }).length;

    return {
      total,
      available,
      inUse,
      maintenance,
      overdue
    };
  }

  function renderEquipmentCounts() {
    const counts = equipmentCounts();

    setText("#availableCount", `${counts.available} Units`);
    setText("#inUseCount", `${counts.inUse} Units`);
    setText("#maintenanceCount", `${counts.maintenance} Units`);
    setText("#overdueCount", `${counts.overdue} Overdue`);
    setText("#totalEquipmentCount", counts.total);
    setText("#visibleCount", state.equipment.length);

    const statusSelect = $("#statusFilter");

    if (statusSelect) {
      const labels = {
        all: "All Statuses",
        available: "Available",
        "in-use": "In-Use",
        maintenance: "Maintenance",
        overdue: "Overdue / Delays"
      };

      const values = {
        all: counts.total,
        available: counts.available,
        "in-use": counts.inUse,
        maintenance: counts.maintenance,
        overdue: counts.overdue
      };

      Array.from(statusSelect.options).forEach(option => {
        if (labels[option.value] !== undefined) {
          option.textContent =
            `${labels[option.value]} (${values[option.value]})`;
        }
      });
    }
  }

  // --------------------------------------------------
  // DISPLAY EQUIPMENT
  // --------------------------------------------------

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
        card.dataset.status = normalizeStatus(item.status);
        card.dataset.category = item.category;

        const image = item.image
          ? `
            <img
              src="${escapeHTML(item.image)}"
              alt="${escapeHTML(item.name)}"
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
              ${escapeHTML(item.name)}
            </h2>

            <p class="text-sm text-on-surface-variant mt-2">
              ${escapeHTML(item.description)}
            </p>

            <p class="text-sm mt-3">
              Location: ${escapeHTML(item.location || "Not specified")}
            </p>

            <p class="text-sm mt-2">
              ${escapeHTML(item.category)}
              ·
              ${item.availableQuantity}/${item.totalQuantity} available
            </p>

            <p class="text-sm mt-1">
              Status: ${escapeHTML(item.status)}
            </p>

            <div class="flex gap-2 mt-5">
              <button
                type="button"
                data-edit="${escapeHTML(item.id)}"
                class="px-3 py-2 rounded bg-surface-container"
              >
                Edit
              </button>

              <button
                type="button"
                data-delete="${escapeHTML(item.id)}"
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
              <strong>${escapeHTML(item.name)}</strong>
              <div class="text-xs">${escapeHTML(item.id)}</div>
            </td>

            <td class="px-4 py-3">
              ${escapeHTML(item.category)}
            </td>

            <td class="px-4 py-3">
              ${escapeHTML(item.location)}
            </td>

            <td class="px-4 py-3">
              ${escapeHTML(item.status)}
            </td>

            <td class="px-4 py-3">
              ${item.availableQuantity}/${item.totalQuantity}
            </td>

            <td class="px-4 py-3 text-right">
              <button
                type="button"
                data-edit="${escapeHTML(item.id)}"
                class="px-2 py-1 bg-surface-container rounded"
              >
                Edit
              </button>

              <button
                type="button"
                data-delete="${escapeHTML(item.id)}"
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

    renderEquipmentCounts();
    applyEquipmentFilters();
  }

  // --------------------------------------------------
  // EQUIPMENT SEARCH AND FILTERS
  // --------------------------------------------------

  function applyEquipmentFilters() {
    const grid = $("#equipmentGridContainer");

    if (!grid) return;

    const search =
      ($("#equipmentSearchInput")?.value || "")
        .toLowerCase()
        .trim();

    const category = $("#categoryFilter")?.value || "all";
    const status = $("#statusFilter")?.value || "all";
    const location = $("#locationFilter")?.value || "all";

    let visible = 0;

    $$(".equipment-card", grid).forEach(card => {
      const item = state.equipment.find(
        entry => String(entry.id) === card.dataset.id
      );

      const textMatch =
        !search ||
        `${card.dataset.name} ${card.dataset.id} ${card.dataset.room}`
          .toLowerCase()
          .includes(search);

      const categoryMatch =
        category === "all" ||
        normalizeStatus(card.dataset.category) === normalizeStatus(category);

      const statusMatch =
        status === "all" ||
        normalizeStatus(card.dataset.status) === normalizeStatus(status);

      const locationMatch =
        location === "all" ||
        card.dataset.room.toLowerCase().includes(location.toLowerCase());

      const show =
        Boolean(item) &&
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

  // --------------------------------------------------
  // EQUIPMENT PAGE: ADD, EDIT AND DELETE
  // --------------------------------------------------

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

      modal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }

    function closeModal() {
      modal.classList.add("hidden");
      document.body.style.overflow = "";
    }

    $("#openAddModalBtn")?.addEventListener(
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

    file?.addEventListener("change", () => {
      const selected = file.files?.[0];

      if (!selected) return;

      if (!selected.type.startsWith("image/")) {
        return toast("Please choose an image file.");
      }

      if (selected.size > 2 * 1024 * 1024) {
        return toast("Image must be 2 MB or smaller.");
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

      const equipmentName = name?.value.trim() || "";
      const equipmentDescription = description?.value.trim() || "";
      const equipmentLocation = location?.value.trim() || "";

      if (!equipmentName || !equipmentLocation) {
        return toast("Enter the equipment name and location.");
      }

      const button = $("#publishEquipmentBtn");
      const draftButton = $("#saveDraftBtn");

      if (button) button.disabled = true;
      if (draftButton) draftButton.disabled = true;

      try {
        const payload = {
          name: equipmentName,
          description: equipmentDescription,
          location: equipmentLocation,
          image_url: state.selectedImage || null,
          condition: "good",
          status: "available"
        };

        if (editingId) {
          const updated = await window.CampusDB.update(
            "resources",
            {
              id: editingId,
              owner_id: state.user.id
            },
            payload
          );

          if (!updated?.length) {
            throw new Error(
              "No equipment was updated. Check that this item belongs to your account."
            );
          }

          toast("Equipment updated.");

        } else {
          await window.CampusDB.insert(
            "resources",
            {
              ...payload,
              owner_id: state.user.id,
              total_quantity: 1,
              available_quantity: 1,
              category_id: null
            }
          );

          toast("Equipment added to your inventory.");
        }

        closeModal();

        if (name) name.value = "";
        if (description) description.value = "";
        if (location) location.value = "";
        if (file) file.value = "";

        state.selectedImage = null;

        await loadEquipment();
        await loadRequests();

        renderEquipment();

      } catch (error) {
        console.error(
          "CampusShare equipment save failed:",
          error
        );

        toast(error.message || "Could not save equipment.");

      } finally {
        if (button) button.disabled = false;
        if (draftButton) draftButton.disabled = false;
      }
    }

    // One listener per button.
    $("#publishEquipmentBtn")?.addEventListener(
      "click",
      saveEquipment
    );

    $("#saveDraftBtn")?.addEventListener(
      "click",
      saveEquipment
    );

    grid.addEventListener("click", async event => {
      const edit = event.target.closest("[data-edit]");
      const remove = event.target.closest("[data-delete]");

      if (edit) {
        const item = state.equipment.find(
          entry => String(entry.id) === edit.dataset.edit
        );

        if (item) openModal(item);
      }

      if (remove) {
        const itemId = remove.dataset.delete;

        if (!window.confirm("Delete this equipment record?")) {
          return;
        }

        try {
          const deleted = await window.CampusDB.remove(
            "resources",
            {
              id: itemId,
              owner_id: state.user.id
            }
          );

          if (!deleted?.length) {
            throw new Error(
              "No equipment was deleted. It may have bookings or may not belong to your account."
            );
          }

          await loadEquipment();
          await loadRequests();

          renderEquipment();

          toast("Equipment deleted.");

        } catch (error) {
          console.error(
            "CampusShare equipment deletion failed:",
            error
          );

          toast(error.message || "Could not delete equipment.");
        }
      }
    });

    $("#gridToggleBtn")?.addEventListener("click", () => {
      grid.classList.remove("hidden");
      $("#equipmentTableContainer")?.classList.add("hidden");
    });

    $("#tableToggleBtn")?.addEventListener("click", () => {
      grid.classList.add("hidden");
      $("#equipmentTableContainer")?.classList.remove("hidden");
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

    window.refreshEquipmentPage = renderEquipment;

    renderEquipment();
  }

  // --------------------------------------------------
  // BOOKING REQUEST STATUS LABELS
  // --------------------------------------------------

  function requestStatusLabel(status) {
    return ({
      pending: "Pending review",
      approved: "Approved",
      waitlist: "Waitlisted",
      rejected: "Declined",
      borrowed: "Currently borrowed",
      returned: "Returned"
    })[status] || status;
  }

  // --------------------------------------------------
  // APPROVE, WAITLIST OR REJECT A REQUEST
  // --------------------------------------------------

  async function recordDecision(request, decision, reason = "") {
    if (!request) return;

    const normalized =
      decision === "Approved"
        ? "approved"
        : decision === "Waitlisted"
          ? "waitlist"
          : decision === "Pending"
            ? "pending"
            : "rejected";

    const itemChanges = {
      item_status: normalized
    };

    if (normalized === "approved") {
      itemChanges.approved_quantity = request.requestedQuantity;
    }

    const { error: itemError } = await client()
      .from("booking_request_items")
      .update(itemChanges)
      .eq("id", request.id);

    if (itemError) throw itemError;

    const requestStatus =
      normalized === "waitlist"
        ? "waitlist"
        : normalized;

    const { error: requestError } = await client()
      .from("booking_requests")
      .update({
        status: requestStatus
      })
      .eq("id", request.sourceId);

    if (requestError) throw requestError;

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

    await loadRequests();
    await loadHistory();

    renderCurrentPage();
  }

  // --------------------------------------------------
  // START BORROWING
  // --------------------------------------------------

  async function startBorrowing(request) {
    const item = state.equipment.find(
      entry => String(entry.id) === String(request.resourceId)
    );

    const quantity = Math.max(
      1,
      Number(request.approvedQuantity || request.requestedQuantity || 1)
    );

    if (!item) {
      throw new Error("The equipment record could not be found.");
    }

    if (item.availableQuantity < quantity) {
      throw new Error(
        `Only ${item.availableQuantity} unit(s) are available.`
      );
    }

    const now = new Date().toISOString();

    const { error: insertError } = await client()
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

    const newAvailable = item.availableQuantity - quantity;

    const { error: resourceError } = await client()
      .from("resources")
      .update({
        available_quantity: newAvailable,
        status: newAvailable > 0 ? "available" : "in-use"
      })
      .eq("id", item.id)
      .eq("owner_id", state.user.id);

    if (resourceError) throw resourceError;

    const { error: itemError } = await client()
      .from("booking_request_items")
      .update({
        item_status: "borrowed",
        approved_quantity: quantity
      })
      .eq("id", request.id);

    if (itemError) throw itemError;

    const { error: requestError } = await client()
      .from("booking_requests")
      .update({
        status: "borrowed"
      })
      .eq("id", request.sourceId);

    if (requestError) throw requestError;

    await logActivity(
      "Equipment checked out",
      {
        booking_request_id: request.sourceId,
        request_item_id: request.id,
        resource_id: item.id,
        quantity
      }
    );

    await reloadAll();

    toast("Borrowing started and saved.");
  }

  // --------------------------------------------------
  // COMPLETE RETURN
  // --------------------------------------------------

  async function completeReturn(request) {
    const { data: records, error: recordError } = await client()
      .from("borrow_records")
      .select("id, quantity_borrowed, quantity_returned")
      .eq("request_item_id", request.id)
      .is("returned_at", null)
      .order("borrowed_at", {
        ascending: false
      })
      .limit(1);

    if (recordError) throw recordError;

    const borrowRecord = records?.[0];

    if (!borrowRecord) {
      throw new Error(
        "No active borrow record was found for this request."
      );
    }

    const quantity = Math.max(
      0,
      Number(borrowRecord.quantity_borrowed || 0) -
      Number(borrowRecord.quantity_returned || 0)
    );

    const now = new Date().toISOString();

    const condition =
      $("input[name='returnCondition']:checked")?.value || "good";

    const notes =
      $("#returnInspectionNotes")?.value?.trim() || "";

    const { error: returnError } = await client()
      .from("borrow_records")
      .update({
        quantity_returned: Number(borrowRecord.quantity_borrowed || 0),
        returned_at: now,
        return_status: "returned",
        received_by: state.user.id
      })
      .eq("id", borrowRecord.id);

    if (returnError) throw returnError;

    const item = state.equipment.find(
      entry => String(entry.id) === String(request.resourceId)
    );

    if (item) {
      const available =
        condition === "good"
          ? Math.min(
              item.totalQuantity,
              item.availableQuantity + quantity
            )
          : item.availableQuantity;

      const { error: resourceError } = await client()
        .from("resources")
        .update({
          available_quantity: available,
          condition: condition,
          status:
            condition === "maintenance" || condition === "damaged"
              ? "maintenance"
              : available > 0
                ? "available"
                : "in-use"
        })
        .eq("id", item.id)
        .eq("owner_id", state.user.id);

      if (resourceError) throw resourceError;
    }

    const { error: itemError } = await client()
      .from("booking_request_items")
      .update({
        item_status: "returned"
      })
      .eq("id", request.id);

    if (itemError) throw itemError;

    const { error: requestError } = await client()
      .from("booking_requests")
      .update({
        status: "completed"
      })
      .eq("id", request.sourceId);

    if (requestError) throw requestError;

    await logActivity(
      "Equipment returned",
      {
        booking_request_id: request.sourceId,
        request_item_id: request.id,
        resource_id: request.resourceId,
        quantity,
        condition,
        notes
      }
    );

    await reloadAll();

    $("#returnInspectionModal")?.classList.add("hidden");
    $("#returnInspectionModal")?.classList.remove("flex");

    toast("Return completed and added to history.");
  }

  // --------------------------------------------------
  // REQUESTS PAGE
  // --------------------------------------------------

  function requestPage() {
    const container =
      $("#requestsContainer") ||
      $("main");

    if (!container) return;

    $$(".request-card", container).forEach(card => {
      card.hidden = true;
    });

    const oldItems = $$(".request-item", container);

    oldItems.forEach(item => {
      item.hidden = true;
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
    let selected = new Set();

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

      const items = state.requests
        .filter(item =>
          filter === "all" || item.category === filter
        )
        .filter(item =>
          !query ||
          [
            item.title,
            item.studentEmail,
            item.equipmentName,
            item.sourceId
          ].join(" ").toLowerCase().includes(query)
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
                ${key === "all" ? "All" : requestStatusLabel(key)}
              </span>
              <strong class="text-lg">${counts[key]}</strong>
            </button>
          `).join("")}
        </div>

        <div class="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            id="liveRequestSearch"
            value="${escapeHTML(query)}"
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
              ? items.map(request => {
                  const canReview = [
                    "pending",
                    "waitlist"
                  ].includes(request.category);

                  return `
                    <article
                      class="border rounded-xl p-4"
                      data-live-id="${escapeHTML(request.id)}"
                    >
                      <div class="flex flex-wrap justify-between gap-3">
                        <div class="flex items-start gap-2">
                          <input
                            type="checkbox"
                            data-select-live="${escapeHTML(request.id)}"
                            aria-label="Select request"
                            ${selected.has(request.id) ? "checked" : ""}
                          >

                          <div>
                            <div class="font-semibold">
                              ${escapeHTML(request.title)}
                            </div>

                            <div class="text-xs text-on-surface-variant">
                              ${escapeHTML(request.studentEmail || "Email unavailable")}
                              · Request ${escapeHTML(request.sourceId)}
                            </div>
                          </div>
                        </div>

                        <span class="px-2 py-1 rounded-full text-xs font-semibold">
                          ${escapeHTML(requestStatusLabel(request.category))}
                        </span>
                      </div>

                      <div class="grid sm:grid-cols-2 gap-2 mt-3 text-sm">
                        <div>
                          <span class="text-on-surface-variant">
                            Equipment
                          </span>

                          <div class="font-medium">
                            ${escapeHTML(request.equipmentName)}
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
                            ${escapeHTML(dateText(request.date))}
                            –
                            ${escapeHTML(dateText(request.endDate))}
                          </div>
                        </div>
                      </div>

                      <div class="flex flex-wrap gap-2 mt-4">
                        ${
                          canReview
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
                  `;
                }).join("")
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
          toast("Requests refreshed.");
        } catch (error) {
          toast(error.message);
        }

        return;
      }

      if (event.target.closest("[data-select-visible]")) {
        state.requests
          .filter(item =>
            (filter === "all" || item.category === filter) &&
            (
              !query ||
              [
                item.title,
                item.studentEmail,
                item.equipmentName
              ].join(" ").toLowerCase().includes(query)
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
          for (const target of targets) {
            await recordDecision(target, "Approved");
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

        } else if (action === "waitlist") {
          await recordDecision(request, "Waitlisted");

        } else if (action === "reject") {
          const reason = window.prompt(
            "Enter the reason for declining this booking:"
          );

          if (reason === null) return;

          if (!reason.trim()) {
            return toast("A decline reason is required.");
          }

          await recordDecision(
            request,
            "Declined",
            reason.trim()
          );

        } else if (action === "start") {
          await startBorrowing(request);

        } else if (action === "return") {
          state.selectedRequest = request;

          $("#returnInspectionModal")?.classList.remove("hidden");
          $("#returnInspectionModal")?.classList.add("flex");

        } else if (action === "reopen") {
          await recordDecision(request, "Pending");
        }

      } catch (error) {
        console.error("Booking action failed:", error);

        toast(error.message || "Could not update the booking.");
      }
    });
  }

  // --------------------------------------------------
  // CALENDAR PAGE
  // --------------------------------------------------
function calendarPage() {
    const main = $("main");
    if (!main) return;

    let currentDate = new Date();
    let selectedDate = new Date();
    let currentView = "month";
    let statusFilter = "all";
    let equipmentFilter = "";

    const pad = n => String(n).padStart(2, "0");

    const dateKey = d =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const parseDate = value => {
        if (!value) return null;
        const d = new Date(String(value).slice(0, 10) + "T00:00:00");
        return Number.isNaN(d.getTime()) ? null : d;
    };

    const sameDay = (a, b) => dateKey(a) === dateKey(b);

    function getBookings() {
        return state.requests.filter(r => {
            const d = parseDate(r.date);
            if (!d) return false;

            const status = String(r.category || "").toLowerCase();

            const statusMatch =
                statusFilter === "all" || status === statusFilter;

            const equipmentMatch =
                !equipmentFilter ||
                String(r.equipmentName || "")
                    .toLowerCase()
                    .includes(equipmentFilter);

            return statusMatch && equipmentMatch;
        });
    }

    function getBookingsForDate(date) {
        return getBookings().filter(r => {
            const start = parseDate(r.date);
            const end = parseDate(r.endDate) || start;

            return start && date >= start && date <= end;
        });
    }

    function render() {
        const bookings = getBookings();

        let startDate;
        let days;

        if (currentView === "day") {
            startDate = new Date(selectedDate);
            days = 1;
        } else if (currentView === "week") {
            startDate = new Date(selectedDate);
            const offset = (startDate.getDay() + 6) % 7;
            startDate.setDate(startDate.getDate() - offset);
            days = 7;
        } else {
            startDate = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                1
            );
            const offset = (startDate.getDay() + 6) % 7;
            startDate.setDate(startDate.getDate() - offset);
            days = Math.ceil(
                (offset + new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() + 1,
                    0
                ).getDate()) / 7
            ) * 7;
        }

        const cells = [];

        for (let i = 0; i < days; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);

            const dayBookings = getBookingsForDate(d);
            const inMonth = d.getMonth() === currentDate.getMonth();

            cells.push(`
                <button type="button"
                    data-date="${dateKey(d)}"
                    class="border rounded-lg p-3 min-h-24 text-left
                    ${sameDay(d, selectedDate)
                        ? "border-teal-600 ring-2 ring-teal-100"
                        : "border-slate-200"}
                    ${currentView === "month" && !inMonth
                        ? "bg-slate-50 text-slate-400"
                        : "bg-white"}">

                    <strong>${d.getDate()}</strong>

                    <span class="block text-xs text-teal-700 mt-2">
                        ${dayBookings.length} booking(s)
                    </span>
                </button>
            `);
        }

        const selectedBookings = getBookingsForDate(selectedDate);

        const heading = currentView === "day"
            ? selectedDate.toDateString()
            : currentView === "week"
                ? "Week of " + startDate.toDateString()
                : currentDate.toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric"
                });

        const bookingHTML = selectedBookings.length
            ? selectedBookings.map(r => `
                <div class="border rounded-lg p-3 bg-white">
                    <div class="font-semibold">
                        ${escapeHTML(r.equipmentName || "Equipment")}
                    </div>
                    <div class="text-sm text-slate-600">
                        ${escapeHTML(r.title || "Student")}
                    </div>
                    <div class="text-sm text-slate-600">
                        Status: ${escapeHTML(requestStatusLabel(r.category))}
                    </div>
                    <div class="text-sm text-slate-600">
                        Quantity: ${Number(r.requestedQuantity || 1)}
                    </div>
                    <div class="text-sm text-slate-600">
                        ${escapeHTML(dateText(r.date))}
                        - ${escapeHTML(dateText(r.endDate))}
                    </div>
                </div>
            `).join("")
            : `<p class="text-slate-500">No bookings for this date.</p>`;

        main.innerHTML = `
            <div class="space-y-5 pb-10">

                <div class="flex flex-wrap justify-between gap-3">
                    <div>
                        <h1 class="text-2xl font-bold">
                            Equipment Calendar
                        </h1>
                        <p class="text-sm text-slate-500">
                            Staff booking schedule
                        </p>
                    </div>

                    <div class="flex gap-2">
                        <button data-view="month">Month</button>
                        <button data-view="week">Week</button>
                        <button data-view="day">Day</button>
                    </div>
                </div>

                <div class="bg-white rounded-xl p-4 space-y-4">

                    <div class="flex flex-wrap items-center gap-3">

                        <button id="previousPeriod">Previous</button>

                        <strong>${escapeHTML(heading)}</strong>

                        <button id="nextPeriod">Next</button>

                        <button id="todayButton">Today</button>

                        <select id="calendarStatus"
                            class="border rounded p-2">
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="borrowed">Borrowed</option>
                            <option value="rejected">Rejected</option>
                            <option value="waitlist">Waitlisted</option>
                        </select>

                        <input id="equipmentSearch"
                            placeholder="Search equipment..."
                            class="border rounded p-2"
                            value="${escapeHTML(equipmentFilter)}">
                    </div>

                    <div class="grid grid-cols-7 gap-2">
                        ${currentView === "month"
                            ? ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
                                .map(d => `<div class="text-center font-semibold">${d}</div>`).join("")
                            : ""}
                        ${cells.join("")}
                    </div>

                </div>

                <div class="bg-white rounded-xl p-4 space-y-3">

                    <h2 class="font-bold text-lg">
                        Bookings for ${escapeHTML(selectedDate.toDateString())}
                    </h2>

                    <p>Total: ${selectedBookings.length}</p>

                    <p>Pending: ${
                        selectedBookings.filter(r =>
                            r.category === "pending"
                        ).length
                    }</p>

                    <div class="space-y-3">
                        ${bookingHTML}
                    </div>

                </div>
            </div>
        `;

        main.querySelectorAll("[data-date]").forEach(button => {
            button.addEventListener("click", () => {
                selectedDate = parseDate(button.dataset.date);
                render();
            });
        });

        main.querySelectorAll("[data-view]").forEach(button => {
            button.addEventListener("click", () => {
                currentView = button.dataset.view;
                render();
            });
        });

        main.querySelector("#previousPeriod").onclick = () => {
            if (currentView === "day") {
                selectedDate.setDate(selectedDate.getDate() - 1);
            } else if (currentView === "week") {
                selectedDate.setDate(selectedDate.getDate() - 7);
            } else {
                currentDate.setMonth(currentDate.getMonth() - 1);
            }
            render();
        };

        main.querySelector("#nextPeriod").onclick = () => {
            if (currentView === "day") {
                selectedDate.setDate(selectedDate.getDate() + 1);
            } else if (currentView === "week") {
                selectedDate.setDate(selectedDate.getDate() + 7);
            } else {
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
            render();
        };

        main.querySelector("#todayButton").onclick = () => {
            currentDate = new Date();
            selectedDate = new Date();
            render();
        };

        main.querySelector("#calendarStatus").onchange = e => {
            statusFilter = e.target.value;
            render();
        };

        main.querySelector("#equipmentSearch").oninput = e => {
            equipmentFilter = e.target.value.toLowerCase();
            const position = e.target.selectionStart;
            render();

            const input = main.querySelector("#equipmentSearch");
            input.focus();
            input.setSelectionRange(position, position);
        };
    }

    render();

    window.refreshCalendarPage = render;
}

  // --------------------------------------------------
  // HISTORY PAGE
  // --------------------------------------------------

  function historyPage() {
    const main = $("main");

    if (!main) return;

    let panel = $("#persistentCompletedHistory");

    if (!panel) {
      panel = document.createElement("section");
      panel.id = "persistentCompletedHistory";
      panel.className =
        "mt-6 p-5 rounded-xl bg-surface-container-lowest";

      main.append(panel);
    }

    $$("tbody tr, .history-row, [data-transaction]")
      .forEach(row => {
        row.hidden = true;
      });

    const search = $("#global-search-input");

    function render() {
      const query =
        (search?.value || "").toLowerCase().trim();

      const rows = state.history.filter(item =>
        !query ||
        [
          item.equipment,
          item.user,
          item.status
        ].join(" ").toLowerCase().includes(query)
      );

      panel.innerHTML = `
        <div class="flex justify-between items-center gap-3 mb-3">
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
                <strong>${escapeHTML(item.equipment)}</strong>
                · ${escapeHTML(item.user)}
                · ${escapeHTML(item.status)}
                · ${escapeHTML(dateText(item.date))}
                · Quantity: ${item.quantity || 0}
                · ${escapeHTML(item.duration)}
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

    function exportCsv() {
      const rows = [
        [
          "Equipment",
          "User",
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

      const link = document.createElement("a");

      link.href = URL.createObjectURL(
        new Blob([csv], {
          type: "text/csv"
        })
      );

      link.download = "campusshare-equipment-history.csv";

      link.click();

      URL.revokeObjectURL(link.href);
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

  // --------------------------------------------------
  // DASHBOARD
  // --------------------------------------------------

  function dashboard() {
    const main = $("main");

    if (!main) return;

    const counts = equipmentCounts();

    const pending = state.requests.filter(
      request => request.category === "pending"
    ).length;

    const approved = state.requests.filter(
      request => request.category === "approved"
    ).length;

    const borrowed = state.requests.filter(
      request => request.category === "borrowed"
    ).length;

    const returned = state.history.filter(
      item => item.status === "Returned"
    ).length;

    const cards = $$("main .grid > div")
      .filter(card =>
        card.querySelector(".font-headline-lg")
      )
      .slice(0, 6);

    const values = [
      `${counts.total} Units`,
      `${counts.available} Units`,
      `${pending} Requests`,
      `${approved} Active`,
      `${borrowed} In-Use`,
      `${returned} Returned`
    ];

    cards.forEach((card, index) => {
      const value = card.querySelector(".font-headline-lg");

      if (value) {
        value.textContent = values[index] ?? "0";
      }
    });

    const requestLink = $('a[data-path="booking-requests"]');
    const badge = requestLink?.querySelector("span:last-child");

    if (badge) {
      badge.textContent = String(pending);
    }

    let panel = $("#dashboardLiveStudentRequests");

    if (!panel) {
      panel = document.createElement("section");
      panel.id = "dashboardLiveStudentRequests";
      panel.className =
        "mt-6 rounded-xl bg-surface-container-lowest p-5";

      main.append(panel);
    }

    $$(".request-item").forEach(item => {
      item.hidden = true;
    });

    const recent = state.requests.slice(0, 5);

    panel.innerHTML = `
      <h2 class="text-lg font-semibold mb-3">
        Recent booking requests
      </h2>
    ` + (
      recent.length
        ? recent.map(request => `
            <div
              data-live-status="${escapeHTML(request.category)}"
              class="flex flex-wrap items-center justify-between gap-3 border-b py-3"
            >
              <div>
                <strong>${escapeHTML(request.title)}</strong>

                <p class="text-sm">
                  ${escapeHTML(request.equipmentName)}
                  · ${escapeHTML(dateText(request.date))}
                  · ${escapeHTML(requestStatusLabel(request.category))}
                </p>
              </div>
            </div>
          `).join("")
        : `
          <p class="text-sm text-on-surface-variant">
            No booking requests for your equipment yet.
          </p>
        `
    );
  }

  // --------------------------------------------------
  // REFRESH CURRENT PAGE
  // --------------------------------------------------

  function renderCurrentPage() {
    const page = location.pathname.split("/").pop();

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

    if (page === "dashboard.html") {
      dashboard();
    }
  }

  async function reloadAll() {
    await loadEquipment();
    await loadRequests();
    await loadHistory();

    renderCurrentPage();
  }

  // --------------------------------------------------
  // COMPATIBILITY FUNCTIONS FOR EXISTING HTML
  // --------------------------------------------------

  window.openRejectModal = user => {
    state.selectedRequest =
      state.requests.find(item => item.title === user) ||
      state.requests.find(item => item.category === "pending") ||
      null;

    $("#rejectionModal")?.classList.remove("hidden");
    $("#rejectionModal")?.classList.add("flex");
  };

  window.closeRejectModal = () => {
    $("#rejectionModal")?.classList.add("hidden");
    $("#rejectionModal")?.classList.remove("flex");
  };

  window.confirmRejection = async () => {
    const reason =
      $("#rejectionReasonInput")?.value?.trim() ||
      "Declined by staff";

    try {
      await recordDecision(
        state.selectedRequest,
        "Declined",
        reason
      );

      window.closeRejectModal();

      toast("Booking declined.");

    } catch (error) {
      toast(error.message || "Could not decline booking.");
    }
  };

  window.openBatchRejectModal = () => window.openRejectModal();

  window.confirmRejectAction = () => window.confirmRejection();

  window.sendChatMessage = event => {
    event?.preventDefault();

    const input = $("#chatInputMessage");

    if (input) {
      input.value = "";
    }

    toast(
      "Direct messaging is not connected to a messages table yet."
    );
  };

  window.filterRequests = (filter, button) => {
    const panel = $("#dashboardLiveStudentRequests");

    const items = panel
      ? $$("[data-live-status]", panel)
      : [];

    items.forEach(item => {
      item.hidden =
        filter !== "all" &&
        item.dataset.liveStatus !== filter;
    });

    $$(".filter-btn").forEach(element => {
      element.classList.remove("active-tab");
    });

    button?.classList.add("active-tab");
  };

  window.toggleEquipmentStatus = () => {
    toast(
      "Use My Equipment and booking actions to manage real equipment availability."
    );
  };

  window.openWaitlistModal = () => {
    $("#waitlistModal")?.classList.remove("hidden");
    $("#waitlistModal")?.classList.add("flex");
  };

  window.closeWaitlistModal = () => {
    $("#waitlistModal")?.classList.add("hidden");
    $("#waitlistModal")?.classList.remove("flex");
  };

  window.confirmWaitlistAction = async () => {
    try {
      await recordDecision(
        state.selectedRequest,
        "Waitlisted"
      );

      window.closeWaitlistModal();

      toast("Booking waitlisted.");

    } catch (error) {
      toast(error.message || "Could not update booking.");
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

  window.openReturnInspectionModal = () => {
    $("#returnInspectionModal")?.classList.remove("hidden");
    $("#returnInspectionModal")?.classList.add("flex");
  };

  window.closeReturnInspectionModal = () => {
    $("#returnInspectionModal")?.classList.add("hidden");
    $("#returnInspectionModal")?.classList.remove("flex");
  };

  window.confirmReturnSignOff = async () => {
    try {
      if (!state.selectedRequest) {
        throw new Error(
          "Select a borrowed request before completing a return."
        );
      }

      await completeReturn(state.selectedRequest);

    } catch (error) {
      toast(error.message || "Could not complete return.");
    }
  };

  window.downloadCheckinSlip = (name, requestId) => {
    toast(
      `Check-in details for ${name || "student"} · ${requestId || "request"}`
    );
  };

  window.openChatDrawer = (name, equipment, id, image) => {
    $("#chatDrawerPanel")?.classList.remove("translate-x-full");
    $("#chatDrawerPanel")?.classList.add("translate-x-0");

    $("#chatDrawerOverlay")?.classList.remove(
      "opacity-0",
      "pointer-events-none"
    );

    setText("#chatDrawerUserName", name || "Student");
    setText("#chatDrawerEqId", id || equipment || "");

    if (image && $("#chatAvatarImg")) {
      $("#chatAvatarImg").src = image;
    }
  };

  window.closeChatDrawer = () => {
    $("#chatDrawerPanel")?.classList.add("translate-x-full");
    $("#chatDrawerPanel")?.classList.remove("translate-x-0");

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

  window.contactResearcher = name => {
    toast(`Student contact: ${name || "not available"}`);
  };

  window.toggleDetails = (id, button) => {
    const element = document.getElementById(id);

    if (element) {
      element.classList.toggle("hidden");

      if (button) {
        button.textContent =
          element.classList.contains("hidden")
            ? "View details"
            : "Hide details";
      }
    }
  };

  window.filterEquipmentCards = applyEquipmentFilters;

  window.handleSearch = () => {
    $("#searchInput")?.dispatchEvent(new Event("input"));
  };

  window.switchTab = (button, category) => {
    $$(".request-card").forEach(card => {
      card.hidden =
        category !== "all" &&
        normalizeStatus(card.dataset.category) !== normalizeStatus(category);
    });
  };

  window.filterByTab = category => {
    window.switchTab(null, category);
  };

  window.updateBatchCounter = () => {};

  window.clearBatchSelection = () => {
    $$(".batch-checkbox").forEach(input => {
      input.checked = false;
    });
  };

  window.handleBatchAccept = () => {
    toast("Use the live booking request list to approve requests.");
  };

  window.approveDirect = () => {
    toast("Use the live booking request list to approve requests.");
  };

  window.promoteToApproved = () => {
    toast("Use the live booking request list to approve requests.");
  };

  window.removeFromWaitlist = () => {
    toast("Use the live booking request list to update requests.");
  };

  window.revokeAccess = () => {
    toast("Use the live booking request list to update requests.");
  };

  window.reopenReview = () => {
    toast("Reopen review from the live booking request list.");
  };

  window.openAuditDrawer = (
    equipmentId,
    userName,
    userId,
    institution,
    date,
    duration,
    status,
    postCondition,
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

  // --------------------------------------------------
  // INITIALIZE STAFF PORTAL
  // --------------------------------------------------

  async function init() {
    updateBranding();

    if (!window.CampusDB) {
      throw new Error(
        "CampusDB is not initialized. Check ../js/database.js."
      );
    }

    await requireStaffSession();

    await loadEquipment();
    await loadRequests();
    await loadHistory();

    const page = location.pathname.split("/").pop();

    if (page === "equipment.html") {
      setupEquipmentPage();
    }

    if (page === "requests.html") {
      requestPage();
    }

    if (page === "calendar.html") {
      calendarPage();
    }

    if (page === "history.html") {
      historyPage();
    }

    if (page === "dashboard.html") {
      dashboard();
    }

    renderCurrentPage();
  }

  init().catch(error => {
    console.error(
      "CampusShare staff portal failed to initialize:",
      error
    );

    toast(
      error.message ||
      "The staff portal could not load. Check the browser Console and Supabase permissions."
    );
  });

})();
