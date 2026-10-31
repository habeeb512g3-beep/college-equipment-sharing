(() => {
  "use strict";

  // CampusShare Browse Equipment page.
  // Counts, categories, equipment and student identity are loaded from Supabase.
  // No sample equipment or sample statistics are used.

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const state = {
    client: null,
    user: null,
    profile: null,
    categories: [],
    resources: [],
    images: [],
    filtered: [],
    selected: null,
    selectedCategory: "",
    savedIds: new Set(),
    toastTimer: null
  };

  const el = {
    result: $("#resultCount"),
    categoryStrip: $("#categoryStrip"),
    search: $("#catalogSearch"),
    globalSearch: $("#globalSearch"),
    lab: $("#labFilter"),
    sort: $("#sortFilter"),
    category: $("#categoryFilter"),
    availability: $("#availabilityFilter"),
    grid: $("#equipmentGrid"),
    empty: $("#emptyState"),
    activeFilters: $(".active-filters"),
    browseView: $("#browseView"),
    detailsView: $("#detailsView"),
    modal: $("#requestModal"),
    form: $("#requestForm"),
    toast: $("#toast")
  };

  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  function setText(selector, value, root = document) {
    const node = $(selector, root);
    if (node) node.textContent = value ?? "";
  }

  function toast(message, isError = false) {
    if (!el.toast) return;
    el.toast.textContent = message;
    el.toast.classList.toggle("error", isError);
    el.toast.classList.add("show");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => el.toast.classList.remove("show"), 3500);
  }

  function initials(name) {
    return String(name || "Student").trim().split(/\s+/).filter(Boolean)
      .slice(0, 2).map(part => part[0].toUpperCase()).join("") || "ST";
  }

  function qty(row, key) {
    const number = Number(row?.[key]);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function isAvailable(item) {
    const blocked = ["inactive", "archived", "maintenance", "unavailable", "retired", "disabled"];
    return qty(item, "available_quantity") > 0 &&
      !blocked.includes(String(item.status || "").toLowerCase());
  }

  function categoryName(item) {
    return state.categories.find(category => category.id === item.category_id)?.category_name || "Uncategorized";
  }

  function imageFor(item) {
    return item.image_url ||
      state.images.find(image => image.resource_id === item.id)?.image_url || "";
  }

  function safeImage(url) {
    if (!url) return "";
    try {
      const parsed = new URL(String(url), window.location.href);
      return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
    } catch (_) {
      return "";
    }
  }

  function clearDemoContent() {
    el.categoryStrip?.replaceChildren();
    el.grid?.replaceChildren();
    if (el.result) el.result.textContent = "Loading live inventory…";
    el.empty?.classList.add("hidden");
    if (el.activeFilters) el.activeFilters.innerHTML = "<span>Active Filters:</span>";

    const savedCount = $("#savedButton .count-bubble");
    if (savedCount) savedCount.textContent = "0";
    setText(".sidebar-user .avatar", "…");
    setText(".sidebar-user strong", "Loading student…");
    setText(".sidebar-user small", "");
    setText("#profileBtn", "…");

    // Remove template-only demo values that are not stored in the current schema.
    if ($(".pagination")) $(".pagination").hidden = true;
    $("#notificationsBtn i")?.remove();
    [".custodians-card", ".eligibility-box", ".requirements", ".detail-metrics", ".small-assurance"]
      .forEach(selector => {
        const node = $(selector);
        if (node) node.hidden = true;
      });

    const safetyText = $(".safety-banner p");
    if (safetyText) {
      safetyText.textContent =
        "Equipment use and return are subject to the borrowing rules provided by your campus administrator.";
    }
  }

  function updateStudentHeader() {
    const metadata = state.user?.user_metadata || {};
    const name = state.profile?.full_name || metadata.full_name || metadata.fullName ||
      state.user?.email?.split("@")[0] || "Student";
    const email = state.profile?.email || state.user?.email || "";
    const department = state.profile?.department || metadata.department || "";
    const sidebar = $(".sidebar-user");

    if (sidebar) {
      setText(".avatar", initials(name), sidebar);
      setText("strong", name, sidebar);
      setText("small", department || "Student account", sidebar);
      sidebar.title = email;
    }

    const profileButton = $("#profileBtn");
    if (profileButton) {
      profileButton.textContent = `${initials(name)}⌄`;
      profileButton.title = [name, email].filter(Boolean).join(" · ");
      profileButton.setAttribute("aria-label", `Signed in as ${name}`);
    }
  }

  async function readRows(table, configure) {
    let query = state.client.from(table).select("*");
    if (configure) query = configure(query);
    const { data, error } = await query;
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }

  function configureFilters() {
    // These filters are not supported by any column in the resources table.
    ["#durationFilter", "#departmentFilter"].forEach(selector => {
      const select = $(selector);
      if (select?.closest("label")) select.closest("label").hidden = true;
    });

    if (el.availability) {
      el.availability.innerHTML = `
        <option value="">All availability</option>
        <option value="available">Available</option>
        <option value="unavailable">Unavailable</option>`;
    }
    if (el.sort) {
      el.sort.innerHTML = `
        <option value="newest">Sort: Newest first</option>
        <option value="name">Name: A to Z</option>
        <option value="available">Available first</option>`;
      el.sort.value = "newest";
    }
  }

  async function loadData() {
    state.client = window.supabaseClient;
    if (!state.client?.auth || typeof state.client.from !== "function") {
      throw new Error("Supabase did not initialize. Check the script tags in browse/index.html.");
    }

    const { data: authData, error: authError } = await state.client.auth.getUser();
    if (authError) throw authError;
    if (!authData?.user) throw new Error("Your session has expired. Please sign in again.");
    state.user = authData.user;

    const { data: profile, error: profileError } = await state.client
      .from("profiles")
      .select("id, full_name, email, department, role")
      .eq("id", state.user.id)
      .maybeSingle();
    if (profileError) console.warn("Profile lookup failed:", profileError.message);
    state.profile = profile || null;
    updateStudentHeader();

    // The resources table is essential. Categories/images are optional for display.
    const [resources, categories, images] = await Promise.all([
      readRows("resources", query => query.order("created_at", { ascending: false })),
      readRows("categories", query => query.order("category_name", { ascending: true }))
        .catch(error => { console.warn("Categories unavailable:", error.message); return []; }),
      readRows("resource_images", query => query.order("created_at", { ascending: false }))
        .catch(error => { console.warn("Equipment images unavailable:", error.message); return []; })
    ]);

    state.resources = resources;
    state.categories = categories;
    state.images = images;

    const savedKey = `campusshare:saved-resources:${state.user.id}`;
    try {
      const saved = JSON.parse(localStorage.getItem(savedKey) || "[]");
      state.savedIds = new Set(Array.isArray(saved) ? saved : []);
    } catch (_) {
      state.savedIds = new Set();
    }

    const savedCount = $("#savedButton .count-bubble");
    if (savedCount) savedCount.textContent = String(state.savedIds.size);

    configureFilters();
    renderCategoryTiles();
    populateFilterOptions();
    renderCatalog();
  }

  function renderCategoryTiles() {
    if (!el.categoryStrip) return;

    const totalUnits = state.resources.reduce((sum, item) => sum + qty(item, "total_quantity"), 0);
    const availableUnits = state.resources.reduce((sum, item) =>
      sum + (isAvailable(item) ? qty(item, "available_quantity") : 0), 0);

    const tiles = [{
      key: "", title: "All Equipment", icon: "▤",
      text: `${state.resources.length} ${state.resources.length === 1 ? "listing" : "listings"} · ${totalUnits} total units`
    }];

    state.categories.forEach(category => {
      const items = state.resources.filter(item => item.category_id === category.id);
      const units = items.reduce((sum, item) => sum + qty(item, "total_quantity"), 0);
      tiles.push({
        key: category.category_name, title: category.category_name, icon: "▦",
        text: `${items.length} ${items.length === 1 ? "listing" : "listings"} · ${units} units`
      });
    });

    tiles.push({
      key: "__available__", title: "Available Now", icon: "◉", dark: true,
      text: `${availableUnits} available ${availableUnits === 1 ? "unit" : "units"}`
    });

    el.categoryStrip.innerHTML = tiles.map(tile => `
      <button type="button"
        class="category-tile ${state.selectedCategory === tile.key ? "selected" : ""} ${tile.dark ? "dark-tile" : ""}"
        data-category="${esc(tile.key)}"
        aria-pressed="${state.selectedCategory === tile.key}">
        <span class="cat-icon">${esc(tile.icon)}</span>
        <span><strong>${esc(tile.title)}</strong><small>${esc(tile.text)}</small></span>
      </button>`).join("");
  }

  function populateFilterOptions() {
    if (el.category) {
      el.category.innerHTML = `<option value="">All Categories</option>` + state.categories.map(category =>
        `<option value="${esc(category.category_name)}">${esc(category.category_name)}</option>`).join("");
    }

    if (el.lab) {
      const locations = [...new Set(state.resources.map(item =>
        String(item.location || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      el.lab.innerHTML = `<option value="">All locations</option>` + locations.map(location =>
        `<option value="${esc(location)}">${esc(location)}</option>`).join("");
    }
  }

  function cardHTML(item) {
    const image = safeImage(imageFor(item));
    const availableQty = qty(item, "available_quantity");
    const totalQty = qty(item, "total_quantity");
    const canRequest = isAvailable(item);
    const photo = image
      ? `<img loading="lazy" src="${esc(image)}" alt="${esc(item.name || "Equipment")}">`
      : `<div class="no-photo">No equipment photo added</div>`;

    return `
      <article class="equipment-card">
        <div class="product-image" data-open="${esc(item.id)}">
          ${photo}
          <span class="image-code">${esc(String(item.id).slice(0, 8))}</span>
          <span class="stock-label ${canRequest ? "available" : "borrowed"}">
            ${canRequest ? `${availableQty} available` : "Unavailable"}
          </span>
        </div>
        <div class="product-content">
          <div class="product-tags">
            <span class="tag">${esc(categoryFor(item))}</span>
            <span class="tag">${esc(item.location || "Location not recorded")}</span>
          </div>
          <h3 data-open="${esc(item.id)}">${esc(item.name || "Unnamed equipment")}</h3>
          <p>${esc(item.description || "No description has been added by the equipment owner.")}</p>
          <div class="spec-pills">
            <span>Total quantity: ${totalQty}</span>
            <span>Condition: ${esc(item.condition || "Not recorded")}</span>
          </div>
          <div class="product-footer">
            <span class="loan-time">${availableQty} of ${totalQty} available</span>
            <button type="button" class="card-action" data-open="${esc(item.id)}">
              View details${canRequest ? " & reserve" : ""} →
            </button>
          </div>
        </div>
      </article>`;
  }

  function renderActiveFilters() {
    if (!el.activeFilters) return;
    const chips = [];
    if (el.search?.value.trim()) chips.push(["Search", el.search.value.trim(), "search"]);
    if (el.lab?.value) chips.push(["Location", el.lab.value, "location"]);
    if (el.category?.value) chips.push(["Category", el.category.value, "category"]);
    if (el.availability?.value) chips.push(["Availability", el.availability.value, "availability"]);
    if (state.selectedCategory === "__available__") chips.push(["Quick filter", "Available now", "quick"]);

    el.activeFilters.innerHTML = `<span>Active Filters:</span>` +
      chips.map(([label, value, key]) =>
        `<button type="button" class="filter-chip" data-remove-filter="${key}">${esc(label)}: ${esc(value)} ×</button>`
      ).join("") +
      `<button type="button" id="clearFilters" class="text-button">Clear all filters</button>`;
  }

  function renderCatalog() {
    const search = (el.search?.value || "").trim().toLowerCase();
    const location = el.lab?.value || "";
    const category = el.category?.value || "";
    const availability = el.availability?.value || "";

    let list = state.resources.filter(item => {
      const searchable = [item.name, item.description, item.location, item.condition,
        item.status, categoryName(item), item.id].join(" ").toLowerCase();
      const matchesSearch = !search || searchable.includes(search);
      const matchesLocation = !location || item.location === location;
      const matchesCategory = !category || categoryName(item) === category;
      const matchesAvailability = !availability ||
        (availability === "available" ? isAvailable(item) : !isAvailable(item));
      const matchesTile = !state.selectedCategory ||
        (state.selectedCategory === "__available__"
          ? isAvailable(item)
          : categoryName(item) === state.selectedCategory);
      return matchesSearch && matchesLocation && matchesCategory && matchesAvailability && matchesTile;
    });

    const sort = el.sort?.value || "newest";
    if (sort === "name") list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    else if (sort === "available") list.sort((a, b) => Number(isAvailable(b)) - Number(isAvailable(a)));
    else list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    state.filtered = list;
    if (el.grid) el.grid.innerHTML = list.map(cardHTML).join("");

    const noInventory = state.resources.length === 0;
    el.grid?.classList.toggle("hidden", list.length === 0);
    el.empty?.classList.toggle("hidden", list.length > 0);

    if (el.empty) {
      const heading = $("h3", el.empty);
      const message = $("p", el.empty);
      if (heading) heading.textContent = noInventory ? "No equipment has been added yet" : "No matching equipment found";
      if (message) message.textContent = noInventory
        ? "The CampusShare inventory is empty. Equipment will appear here after an owner or administrator adds it."
        : "Try changing your search or clearing some filters.";
    }

    const availableListings = state.resources.filter(isAvailable).length;
    const availableUnits = state.resources.reduce((sum, item) =>
      sum + (isAvailable(item) ? qty(item, "available_quantity") : 0), 0);

    if (el.result) {
      el.result.textContent = noInventory
        ? "No equipment has been added to the inventory yet."
        : `Showing ${list.length} of ${state.resources.length} equipment listings · ${availableUnits} available units across ${availableListings} available listings`;
    }

    const toolbar = $(".catalog-toolbar");
    if (toolbar) {
      const note = $(".muted:last-child", toolbar);
      if (note) note.textContent = `${state.resources.length} live listings`;
    }

    if ($(".pagination")) $(".pagination").hidden = true;
    renderActiveFilters();
  }

  function clearFilters() {
    [el.search, el.globalSearch, el.lab, el.category, el.availability].forEach(control => {
      if (control) control.value = "";
    });
    state.selectedCategory = "";
    renderCategoryTiles();
    renderCatalog();
  }

  function showView(view) {
    el.browseView?.classList.toggle("active", view === "browse");
    el.detailsView?.classList.toggle("active", view === "details");
    $$(".nav-link").forEach(button => {
      button.classList.toggle("active", button.dataset.nav === (view === "details" ? "browse" : view));
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderRecommendations(selected) {
    const section = $(".recommendations-section");
    const grid = $("#recommendGrid");
    if (!grid) return;

    setText("h2", "More equipment in this category", section || document);
    setText("p", "Other equipment listings from the same category.", section || document);

    const matches = state.resources
      .filter(item => item.id !== selected.id && item.category_id === selected.category_id)
      .slice(0, 3);

    if (!matches.length) {
      if (section) section.hidden = true;
      grid.replaceChildren();
      return;
    }

    if (section) section.hidden = false;
    grid.innerHTML = matches.map(item => {
      const image = safeImage(imageFor(item));
      return `
        <article class="recommend-card" data-open="${esc(item.id)}">
          ${image ? `<img src="${esc(image)}" alt="${esc(item.name)}" loading="lazy">` : `<div class="no-photo">No photo</div>`}
          <div><small>${esc(categoryName(item))}</small><strong>${esc(item.name || "Unnamed equipment")}</strong><span>View details →</span></div>
        </article>`;
    }).join("");
  }

  function renderDetails(item) {
    state.selected = item;
    setText("#detailBreadcrumbName", item.name || "Equipment details");
    setText("#detailsTitle", item.name || "Unnamed equipment");
    setText("#detailCategory", categoryName(item));
    setText("#detailDescription", item.description || "No description has been added by the equipment owner.");
    setText("#detailStatus", isAvailable(item)
      ? `${qty(item, "available_quantity")} available for reservation`
      : "Currently unavailable");
    $("#detailStatus")?.classList.toggle("available", isAvailable(item));
    $("#detailStatus")?.classList.toggle("borrowed", !isAvailable(item));
    setText("#pickupLocation", item.location || "Pickup location not recorded");
    setText("#handlingText", item.condition
      ? `Recorded condition: ${item.condition}`
      : "Handling instructions have not been added.");

    const photo = safeImage(imageFor(item));
    const hero = $("#detailHeroImage");
    const label = $("#heroImageLabel");
    if (hero) {
      hero.hidden = !photo;
      if (photo) hero.src = photo;
      else hero.removeAttribute("src");
    }
    if (label) {
      label.hidden = Boolean(photo);
      label.textContent = photo ? "" : "No equipment photo has been uploaded";
    }
    $("#thumbnailRow")?.replaceChildren();

    const specs = {
      "Category": categoryName(item),
      "Total quantity": qty(item, "total_quantity"),
      "Available quantity": qty(item, "available_quantity"),
      "Availability": isAvailable(item) ? "Available" : "Unavailable",
      "Condition": item.condition || "Not recorded",
      "Location": item.location || "Not recorded",
      "Resource ID": item.id
    };
    const specGrid = $("#specGrid");
    if (specGrid) {
      specGrid.innerHTML = Object.entries(specs).map(([key, value]) =>
        `<div class="spec-item"><span>${esc(key)}</span><strong>${esc(value)}</strong></div>`
      ).join("");
    }

    // The supplied database schema has no custodian contact, loan-limit,
    // replacement-value or eligibility columns. Hide sample-only HTML sections.
    [".custodians-card", ".eligibility-box", ".requirements", ".detail-metrics", ".small-assurance"]
      .forEach(selector => { const node = $(selector); if (node) node.hidden = true; });

    const requestButton = $("#requestEquipment");
    if (requestButton) {
      requestButton.disabled = !isAvailable(item);
      requestButton.textContent = isAvailable(item) ? "＋ Request This Equipment" : "Currently unavailable";
    }
    const favorite = $("#favoriteButton");
    if (favorite) {
      favorite.textContent = state.savedIds.has(item.id) ? "♥" : "♡";
      favorite.classList.toggle("saved", state.savedIds.has(item.id));
    }

    renderRecommendations(item);
    showView("details");
  }

  function openRequestModal() {
    const item = state.selected;
    if (!item || !isAvailable(item)) return toast("This equipment is not currently available.", true);

    setText("#modalEquipmentName", item.name);
    // The supplied booking_requests table has no purpose column.
    const purposeLabel = $("#requestPurpose")?.closest("label");
    if (purposeLabel) purposeLabel.hidden = true;
    if ($("#requestPurpose")) $("#requestPurpose").disabled = true;

    let quantityInput = $("#requestQuantity");
    if (!quantityInput) {
      const label = document.createElement("label");
      label.textContent = "Quantity requested";
      quantityInput = document.createElement("input");
      quantityInput.id = "requestQuantity";
      quantityInput.type = "number";
      quantityInput.min = "1";
      quantityInput.value = "1";
      quantityInput.required = true;
      label.append(quantityInput);
      $("#startDate")?.closest("label")?.insertAdjacentElement("beforebegin", label);
    }
    quantityInput.max = String(Math.max(1, qty(item, "available_quantity")));
    quantityInput.value = "1";

    const start = new Date();
    start.setDate(start.getDate() + 1);
    const due = new Date(start);
    due.setDate(due.getDate() + 1);
    const localInputValue = date => {
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, 16);
    };
    if ($("#startDate")) $("#startDate").value = localInputValue(start);
    if ($("#endDate")) $("#endDate").value = localInputValue(due);

    const note = $(".form-note", el.modal);
    if (note) note.textContent = "Your request will be sent to CampusShare for review.";
    el.modal?.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeRequestModal() {
    el.modal?.classList.add("hidden");
    document.body.style.overflow = "";
  }

  async function submitRequest(event) {
    event.preventDefault();
    const item = state.selected;
    if (!state.user || !item) return toast("Please sign in again before requesting equipment.", true);

    const start = new Date($("#startDate")?.value);
    const due = new Date($("#endDate")?.value);
    const requestedQuantity = Number($("#requestQuantity")?.value || 1);
    const availableQuantity = qty(item, "available_quantity");

    if (Number.isNaN(start.getTime()) || Number.isNaN(due.getTime()) || due <= start) {
      return toast("Choose an end date and time after the start date.", true);
    }
    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1 || requestedQuantity > availableQuantity) {
      return toast(`Choose a quantity from 1 to ${availableQuantity}.`, true);
    }

    const submit = $("button[type='submit']", el.form);
    if (submit) submit.disabled = true;

    try {
      const now = new Date().toISOString();
      const { data: request, error: requestError } = await state.client
        .from("booking_requests")
        .insert({
          student_id: state.user.id,
          request_date: now,
          start_date: start.toISOString(),
          due_date: due.toISOString(),
          status: "pending",
          created_at: now
        })
        .select("id")
        .single();
      if (requestError) throw requestError;

      const { error: itemError } = await state.client
        .from("booking_request_items")
        .insert({
          request_id: request.id,
          resource_id: item.id,
          requested_quantity: requestedQuantity,
          approved_quantity: 0,
          item_status: "pending"
        });

      if (itemError) {
        // Best effort: remove the request header if its item row cannot be created.
        await state.client.from("booking_requests")
          .delete().eq("id", request.id).eq("student_id", state.user.id);
        throw itemError;
      }

      closeRequestModal();
      el.form?.reset();
      toast(`Request submitted for ${item.name}.`);
      setTimeout(() => {
        if (window.parent !== window) {
          window.parent.postMessage({ source: "campusshare-page", type: "navigate", route: "requests" }, "*");
        }
      }, 500);
    } catch (error) {
      console.error("CampusShare request failed:", error);
      toast(error.message || "The request could not be saved.", true);
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  function saveFavorites() {
    if (!state.user) return;
    const key = `campusshare:saved-resources:${state.user.id}`;
    localStorage.setItem(key, JSON.stringify([...state.savedIds]));
    const count = $("#savedButton .count-bubble");
    if (count) count.textContent = String(state.savedIds.size);
  }

  function setupEvents() {
    el.grid?.addEventListener("click", event => {
      const target = event.target.closest("[data-open]");
      if (!target) return;
      const item = state.resources.find(row => row.id === target.dataset.open);
      if (item) renderDetails(item);
    });

    $("#recommendGrid")?.addEventListener("click", event => {
      const target = event.target.closest("[data-open]");
      if (!target) return;
      const item = state.resources.find(row => row.id === target.dataset.open);
      if (item) renderDetails(item);
    });

    el.search?.addEventListener("input", () => {
      if (el.globalSearch) el.globalSearch.value = el.search.value;
      renderCatalog();
    });
    el.globalSearch?.addEventListener("input", () => {
      if (el.search) el.search.value = el.globalSearch.value;
      renderCatalog();
      showView("browse");
    });

    [el.lab, el.sort, el.category, el.availability].forEach(control => {
      control?.addEventListener("change", () => {
        if (control === el.category) state.selectedCategory = "";
        renderCategoryTiles();
        renderCatalog();
      });
    });

    el.categoryStrip?.addEventListener("click", event => {
      const tile = event.target.closest("[data-category]");
      if (!tile) return;
      state.selectedCategory = tile.dataset.category || "";
      if (el.category) el.category.value = state.selectedCategory === "__available__" ? "" : state.selectedCategory;
      renderCategoryTiles();
      renderCatalog();
    });

    el.activeFilters?.addEventListener("click", event => {
      if (event.target.closest("#clearFilters")) return clearFilters();
      const chip = event.target.closest("[data-remove-filter]");
      if (!chip) return;
      const key = chip.dataset.removeFilter;
      if (key === "search" && el.search) el.search.value = "";
      if (key === "location" && el.lab) el.lab.value = "";
      if (key === "category" && el.category) el.category.value = "";
      if (key === "availability" && el.availability) el.availability.value = "";
      if (key === "quick" || key === "category") state.selectedCategory = "";
      renderCategoryTiles();
      renderCatalog();
    });

    $("#emptyClear")?.addEventListener("click", clearFilters);
    $("#clearFilters")?.addEventListener("click", clearFilters);
    $("#backToBrowse")?.addEventListener("click", () => showView("browse"));
    $("#brandLink")?.addEventListener("click", event => {
      event.preventDefault();
      showView("browse");
    });

    $("#requestEquipment")?.addEventListener("click", openRequestModal);
    $("#directRequestButton")?.addEventListener("click", () => {
      const item = state.filtered.find(isAvailable) || state.resources.find(isAvailable);
      if (!item) return toast("No equipment is currently available to request.");
      state.selected = item;
      openRequestModal();
    });
    $("#closeModal")?.addEventListener("click", closeRequestModal);
    el.modal?.addEventListener("click", event => {
      if (event.target === el.modal) closeRequestModal();
    });
    el.form?.addEventListener("submit", submitRequest);

    $("#favoriteButton")?.addEventListener("click", () => {
      if (!state.selected) return;
      if (state.savedIds.has(state.selected.id)) state.savedIds.delete(state.selected.id);
      else state.savedIds.add(state.selected.id);
      saveFavorites();
      const button = $("#favoriteButton");
      if (button) {
        button.textContent = state.savedIds.has(state.selected.id) ? "♥" : "♡";
        button.classList.toggle("saved", state.savedIds.has(state.selected.id));
      }
      toast(state.savedIds.has(state.selected.id) ? "Equipment saved." : "Removed from saved list.");
    });

    $("#savedButton")?.addEventListener("click", () => {
      toast(`${state.savedIds.size} saved equipment ${state.savedIds.size === 1 ? "item" : "items"}.`);
    });
    $("#shareButton")?.addEventListener("click", async () => {
      if (!state.selected) return;
      try {
        await navigator.clipboard.writeText(`${location.href.split("#")[0]}#${state.selected.id}`);
        toast("Equipment link copied.");
      } catch (_) {
        toast(`Equipment ID: ${state.selected.id}`);
      }
    });
    $("#availabilityAlert")?.addEventListener("click", () => toast("Availability alerts are not stored in the current database."));
    $("#viewCalendar")?.addEventListener("click", () => toast("A lab calendar is not connected yet."));
    $("#viewLocation")?.addEventListener("click", () => toast(state.selected?.location || "No pickup location recorded."));
    $("#rulesButton")?.addEventListener("click", () => toast("Please follow the borrowing instructions provided by your campus administrator."));
    $("#reserveDeskButton")?.addEventListener("click", () => toast("Lab desk reservation is not connected yet."));
    $("#downloadSpecs")?.addEventListener("click", () => toast("PDF export is not available yet."));
    $("#expandImage")?.addEventListener("click", () => {
      const image = $("#detailHeroImage");
      if (image?.src) window.open(image.src, "_blank", "noopener");
    });
    $("#completeInventory")?.addEventListener("click", () => showView("browse"));
    $("#helpLink")?.addEventListener("click", () => toast("Please contact your campus equipment administrator for assistance."));
    $("#notificationsBtn")?.addEventListener("click", () => toast("Your notifications are available in the Student Portal dashboard."));
    $("#profileBtn")?.addEventListener("click", () => {
      if (window.parent !== window) {
        window.parent.postMessage({ source: "campusshare-page", type: "navigate", route: "profile" }, "*");
      } else {
        toast(`Signed in as ${state.profile?.email || state.user?.email || "student"}.`);
      }
    });

    $$(".nav-link").forEach(button => {
      button.addEventListener("click", () => {
        const routes = {
          dashboard: "dashboard", requests: "requests", borrowed: "borrowed",
          history: "history", settings: "profile"
        };
        const route = button.dataset.nav;
        if (route === "browse") return showView("browse");
        if (routes[route] && window.parent !== window) {
          window.parent.postMessage({ source: "campusshare-page", type: "navigate", route: routes[route] }, "*");
        }
      });
    });

    $("#mobileMenu")?.addEventListener("click", () => $("#sidebar")?.classList.toggle("open"));
    document.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        el.globalSearch?.focus();
      }
      if (event.key === "Escape") closeRequestModal();
    });
  }

  async function init() {
    clearDemoContent();
    configureFilters();
    setupEvents();
    try {
      await loadData();
    } catch (error) {
      console.error("Browse page could not load:", error);
      if (el.result) el.result.textContent = "Could not load live equipment inventory.";
      el.grid?.replaceChildren();
      el.grid?.classList.add("hidden");
      el.empty?.classList.remove("hidden");
      setText("h3", "Unable to load equipment", el.empty || document);
      setText("p", error.message || "Please refresh the page or sign in again.", el.empty || document);
      toast(error.message || "Could not load equipment from Supabase.", true);
    }
  }

  init();
})();
