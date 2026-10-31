
(() => {
  "use strict";

  // CampusShare - Borrowing History & Custody Log
  // Displays only actual borrow_records linked to the signed-in student.
  // Unsupported demo claims such as certificates, serial numbers,
  // inspection reports and institutional standing are not invented.

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
    rows: [],
    filtered: [],
    activeFilter: "all",
    page: 1,
    pageSize: 10,
    toastTimer: null
  };

  const el = {
    rows: $("#historyRows"),
    search: $("#recordSearch"),
    facility: $("#facilityFilter"),
    dateRange: $("#semesterFilter"),
    empty: $("#emptyState"),
    tableScroll: $(".table-scroll"),
    resultCount: $("#resultCount"),
    pageSummary: $("#pageSummary"),
    pagination: $("#pagination"),
    modal: $("#modalBackdrop"),
    modalTitle: $("#modalTitle"),
    modalContent: $("#modalContent"),
    toast: $("#toast")
  };

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;"
    })[char]);
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

  function formatDuration(startValue, endValue) {
    if (!startValue || !endValue) {
      return "Duration not available";
    }

    const start = new Date(startValue).getTime();
    const end = new Date(endValue).getTime();

    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      return "Duration not available";
    }

    const totalHours = Math.floor((end - start) / 3600000);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    return `${days} day${days === 1 ? "" : "s"}, ${hours} hour${hours === 1 ? "" : "s"}`;
  }

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function toast(message, isError = false) {
    if (!el.toast) return;

    el.toast.textContent = message;
    el.toast.classList.toggle("error", Boolean(isError));
    el.toast.classList.add("show");

    clearTimeout(state.toastTimer);

    state.toastTimer = setTimeout(() => {
      el.toast.classList.remove("show");
    }, 3000);
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

  function shortId(value) {
    return String(value || "")
      .replace(/-/g, "")
      .slice(0, 8)
      .toUpperCase();
  }

  function updateIdentity() {
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

    const campusId =
      metadata.campus_id ||
      metadata.campusId ||
      metadata.student_id ||
      "";

    const chip = $(".user-chip");

    if (chip) {
      const avatar = $(".avatar", chip);
      const nameNode = $("b", chip);
      const subNode = $("small", chip);

      if (avatar) avatar.textContent = initials(name);
      if (nameNode) nameNode.textContent = name;

      if (subNode) {
        subNode.textContent = campusId
          ? `Student ID · ${campusId}`
          : department;
      }

      chip.title = email;
    }
  }

  function setMetricLabel(label, text) {
    if (!label) return;

    const icon = $(".metric-icon", label);

    [...label.childNodes].forEach(node => {
      if (node !== icon) node.remove();
    });

    const textNode = document.createTextNode(text + " ");

    if (icon) {
      label.insertBefore(textNode, icon);
    } else {
      label.append(textNode);
    }
  }

  function setMetric(index, labelText, valueHTML, footText, footClass = "") {
    const card = $$(".metric-card")[index];

    if (!card) return;

    setMetricLabel($(".metric-label", card), labelText);

    const value = $(".metric-value, .standing", card);

    if (value) {
      value.classList.remove("standing");
      value.classList.add("metric-value");
      value.innerHTML = valueHTML;
    }

    const foot = $(".metric-foot", card);

    if (foot) {
      foot.textContent = footText;
      foot.className = `metric-foot ${footClass}`.trim();
    }

    $$(".metric-foot", card).slice(1).forEach(node => node.remove());
  }

  function clearDemoContent() {
    if (el.rows) el.rows.replaceChildren();

    // The original Impacted and Reports categories are not backed
    // by any columns or tables in the current Supabase schema.
    const tabLabels = [
      ["all", "All records"],
      ["returned", "Returned"],
      ["active", "Outstanding"]
    ];

    $$(".filter-tab").forEach((tab, index) => {
      if (index >= tabLabels.length) {
        tab.remove();
        return;
      }

      tab.dataset.filter = tabLabels[index][0];
      tab.innerHTML = `${tabLabels[index][1]} <b>(0)</b>`;
      tab.classList.toggle("active", index === 0);
      tab.setAttribute("aria-selected", String(index === 0));
    });

    // Semester information is not stored in the available tables.
    // Use dates instead.
    if (el.dateRange) {
      el.dateRange.innerHTML = `
        <option value="all">All dates</option>
        <option value="30">Last 30 days</option>
        <option value="365">Last 12 months</option>
        <option value="older">Older records</option>
      `;
    }

    if (el.facility) {
      el.facility.innerHTML =
        '<option value="all">All equipment locations</option>';
    }

    setMetric(0, "Units borrowed",
      "— <small>Units</small>",
      "From your borrowing records");

    setMetric(1, "On-time return rate",
      "— <small>Not calculated</small>",
      "Requires completed returns with due dates");

    setMetric(2, "Average borrow duration",
      "— <small>Days / record</small>",
      "Based on completed records only");

    setMetric(3, "Units outstanding",
      "— <small>Units</small>",
      "Quantity not yet returned");

    const heading = $(".page-heading h1");
    if (heading) heading.textContent = "Borrowing History & Custody Log";

    const subheading = $(".page-heading .subheading");
    if (subheading) {
      subheading.textContent =
        "Your borrowing and return records saved in CampusShare.";
    }

    const banner = $(".integrity-banner");

    if (banner) {
      const strong = $("strong", banner);
      const paragraph = $("p", banner);
      const link = $("a", banner);

      if (strong) strong.textContent = "About your borrowing history";

      if (paragraph) {
        paragraph.textContent =
          "This page is generated from your CampusShare booking and borrowing records. It is not a digitally signed institutional audit certificate.";
      }

      if (link) link.remove();
    }

    const headings = $$("#historyRows")
      .flatMap(() => $$("thead th"));

    const headingLabels = [
      "Equipment / Resource ID",
      "Borrow & Return Timeline",
      "Equipment Location",
      "Listed Equipment Condition",
      "Borrow Status",
      "Record Details"
    ];

    headings.forEach((heading, index) => {
      if (headingLabels[index]) {
        heading.textContent = headingLabels[index];
      }
    });

    const exportButton = $("#exportBtn");
    if (exportButton) {
      exportButton.innerHTML = "↓ Export History CSV";
    }

    const auditButton = $("#auditBtn");
    if (auditButton) {
      auditButton.innerHTML = "↓ Download History Summary";
    }

    const syncNote = $(".sync-note");
    if (syncNote) syncNote.textContent = "Live account records";

    const verifiedNote = $(".verified-note");

    if (verifiedNote) {
      verifiedNote.textContent = "Records loaded from your account";
      verifiedNote.classList.remove("verified-note");
    }

    if (el.empty) {
      el.empty.hidden = true;
      el.empty.textContent =
        "No borrowing records are available for your account.";
    }

    // Remove the unsupported placeholder policy link.
    $("#policyLink")?.remove();
  }

  function outstanding(record) {
    return Math.max(
      0,
      number(record.quantity_borrowed) -
      number(record.quantity_returned)
    );
  }

  function isReturned(record) {
    const status = String(record.return_status || "")
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    return (
      (outstanding(record) === 0 &&
        number(record.quantity_borrowed) > 0) ||
      [
        "returned",
        "fully_returned",
        "complete",
        "completed",
        "closed"
      ].includes(status)
    );
  }

  function isActive(record) {
    return !isReturned(record) && outstanding(record) > 0;
  }

  function getRequestItem(record) {
    return state.requestItems.find(
      item => item.id === record.request_item_id
    ) || null;
  }

  function getRequest(record) {
    const item = getRequestItem(record);

    return item
      ? state.requests.find(request => request.id === item.request_id) || null
      : null;
  }

  function getResource(record) {
    const item = getRequestItem(record);

    return item
      ? state.resources.get(item.resource_id) || null
      : null;
  }

  function getImage(resource) {
    if (!resource) return "";

    const raw =
      resource.image_url ||
      state.images.get(resource.id) ||
      "";

    if (!raw) return "";

    try {
      const url = new URL(String(raw), window.location.href);

      return ["https:", "http:"].includes(url.protocol)
        ? url.href
        : "";

    } catch (_) {
      return "";
    }
  }

  function categoryName(resource) {
    if (!resource?.category_id) return "Not categorized";

    return state.categories.get(resource.category_id) ||
      "Not categorized";
  }

  function showPageError(message) {
    if (el.tableScroll) el.tableScroll.hidden = true;

    if (el.empty) {
      el.empty.hidden = false;
      el.empty.textContent = message;
    }

    if (el.resultCount) {
      el.resultCount.textContent = "History could not be loaded";
    }

    if (el.pageSummary) el.pageSummary.textContent = "";
  }

  function calculateMetrics() {
    const totalUnitsBorrowed = state.borrowRecords.reduce(
      (sum, record) =>
        sum + Math.max(0, number(record.quantity_borrowed)),
      0
    );

    const outstandingUnits = state.borrowRecords.reduce(
      (sum, record) => sum + outstanding(record),
      0
    );

    const completed = state.borrowRecords.filter(record =>
      isReturned(record) &&
      record.borrowed_at &&
      record.returned_at
    );

    const verifiableReturns = completed.filter(record =>
      record.due_date && record.returned_at
    );

    const onTimeCount = verifiableReturns.filter(record =>
      new Date(record.returned_at).getTime() <=
      new Date(record.due_date).getTime()
    ).length;

    const onTimeRate = verifiableReturns.length
      ? Math.round(onTimeCount / verifiableReturns.length * 100)
      : null;

    const durations = completed.map(record => {
      const start = new Date(record.borrowed_at).getTime();
      const end = new Date(record.returned_at).getTime();

      return Number.isFinite(start) &&
        Number.isFinite(end) &&
        end >= start
          ? (end - start) / 86400000
          : null;
    }).filter(value => value !== null);

    const averageDuration = durations.length
      ? durations.reduce((sum, value) => sum + value, 0) / durations.length
      : null;

    const activeRecords = state.borrowRecords.filter(isActive).length;

    setMetric(
      0,
      "Units borrowed",
      `${totalUnitsBorrowed} <small>Units</small>`,
      `${state.borrowRecords.length} borrowing record${state.borrowRecords.length === 1 ? "" : "s"}`
    );

    setMetric(
      1,
      "On-time return rate",
      onTimeRate === null
        ? `— <small>Not available</small>`
        : `${onTimeRate}% <small>On time</small>`,
      verifiableReturns.length
        ? `${onTimeCount} of ${verifiableReturns.length} completed returns on time`
        : "No completed returns with both due and return dates",
      onTimeRate === null ? "" : (onTimeRate === 100 ? "positive" : "")
    );

    setMetric(
      2,
      "Average borrow duration",
      averageDuration === null
        ? `— <small>Days / record</small>`
        : `${averageDuration.toFixed(1)} <small>Days / record</small>`,
      durations.length
        ? `Calculated from ${durations.length} completed return record${durations.length === 1 ? "" : "s"}`
        : "No completed records with borrow and return dates"
    );

    setMetric(
      3,
      "Units outstanding",
      `${outstandingUnits} <small>Units</small>`,
      `${activeRecords} active borrow record${activeRecords === 1 ? "" : "s"}`
    );
  }

  function recordStatus(record) {
    if (isReturned(record)) return "Returned & Closed";

    if (outstanding(record) > 0) {
      const due = record.due_date
        ? new Date(record.due_date).getTime()
        : null;

      if (due !== null && Number.isFinite(due) && due < Date.now()) {
        return "Outstanding · Past due";
      }

      const status = String(record.return_status || "").toLowerCase();

      if (status.includes("partial")) {
        return "Partially returned";
      }

      return "Outstanding";
    }

    return String(record.return_status || "Status not recorded")
      .replace(/[_-]+/g, " ");
  }

  function makeSearchText(record) {
    const resource = getResource(record);
    const item = getRequestItem(record);
    const request = getRequest(record);

    return [
      record.id,
      record.return_status,
      resource?.name,
      resource?.id,
      resource?.location,
      resource?.description,
      resource?.condition,
      categoryName(resource),
      item?.id,
      request?.id
    ].filter(Boolean).join(" ").toLowerCase();
  }

  function populateFacilityFilter() {
    if (!el.facility) return;

    const locations = [
      ...new Set(
        state.borrowRecords
          .map(record => getResource(record)?.location)
          .filter(Boolean)
      )
    ].sort((a, b) => a.localeCompare(b));

    el.facility.innerHTML =
      '<option value="all">All equipment locations</option>' +
      locations.map(location =>
        `<option value="${esc(location)}">${esc(location)}</option>`
      ).join("");
  }

  function withinDateRange(record) {
    const value = record.borrowed_at || record.due_date;
    const range = el.dateRange?.value || "all";

    if (range === "all") return true;
    if (!value) return false;

    const date = new Date(value).getTime();

    if (!Number.isFinite(date)) return false;

    const yearAgo = Date.now() - 365 * 86400000;

    if (range === "older") {
      return date < yearAgo;
    }

    const cutoff = Date.now() - Number(range) * 86400000;

    return date >= cutoff;
  }

  function getFilteredRecords() {
    const query = (el.search?.value || "")
      .trim()
      .toLowerCase();

    const location = el.facility?.value || "all";

    return state.rows.filter(record => {
      const statusMatch =
        state.activeFilter === "all" ||
        (state.activeFilter === "returned" && isReturned(record)) ||
        (state.activeFilter === "active" && isActive(record));

      const resource = getResource(record);

      const locationMatch =
        location === "all" ||
        resource?.location === location;

      const searchMatch =
        !query ||
        makeSearchText(record).includes(query);

      return statusMatch &&
        locationMatch &&
        searchMatch &&
        withinDateRange(record);
    });
  }

  function renderPagination(pageCount) {
    if (!el.pagination) return;

    if (pageCount <= 1) {
      el.pagination.innerHTML = "";
      el.pagination.hidden = true;
      return;
    }

    el.pagination.hidden = false;

    const buttons = [
      `<button data-page="prev" ${state.page === 1 ? "disabled" : ""}>Previous</button>`
    ];

    for (let page = 1; page <= pageCount; page++) {
      buttons.push(`
        <button
          data-page="${page}"
          class="${page === state.page ? "current" : ""}"
          ${page === state.page ? 'aria-current="page"' : ""}>
          ${page}
        </button>
      `);
    }

    buttons.push(
      `<button data-page="next" ${state.page === pageCount ? "disabled" : ""}>Next</button>`
    );

    el.pagination.innerHTML = buttons.join("");
  }

  function updateTabCounts() {
    const counts = {
      all: state.rows.length,
      returned: state.rows.filter(isReturned).length,
      active: state.rows.filter(isActive).length
    };

    $$(".filter-tab").forEach(tab => {
      const count = counts[tab.dataset.filter] ?? 0;
      const bold = $("b", tab);

      if (bold) bold.textContent = `(${count})`;
    });
  }

  function renderRows() {
    if (!el.rows) return;

    const filtered = getFilteredRecords();
    state.filtered = filtered;

    const pageCount = Math.max(
      1,
      Math.ceil(filtered.length / state.pageSize)
    );

    state.page = Math.min(state.page, pageCount);

    const startIndex = (state.page - 1) * state.pageSize;

    const pageItems = filtered.slice(
      startIndex,
      startIndex + state.pageSize
    );

    el.rows.innerHTML = pageItems.map(record => {
      const resource = getResource(record);
      const request = getRequest(record);
      const image = getImage(resource);

      const borrowedAt = record.borrowed_at;
      const returnedAt = record.returned_at;
      const dueDate = record.due_date;

      const duration = returnedAt
        ? formatDuration(borrowedAt, returnedAt)
        : borrowedAt
          ? `Elapsed: ${formatDuration(borrowedAt, new Date().toISOString())}`
          : "Duration not recorded";

      const imageMarkup = image
        ? `<img src="${esc(image)}"
             alt="${esc(resource?.name || "Equipment")}"
             loading="lazy"
             style="width:40px;height:42px;object-fit:cover;border-radius:5px;">`
        : `<div class="asset-thumb" aria-hidden="true">▣</div>`;

      const condition =
        resource?.condition ||
        "Not recorded on equipment listing";

      const status = recordStatus(record);
      const badgeClass = isReturned(record) ? "" : "flagged";

      const location =
        resource?.location || "Location not recorded";

      const requestId = request?.id
        ? shortId(request.id)
        : "Not linked";

      const resourceId = resource?.id
        ? shortId(resource.id)
        : "Resource unavailable";

      const quantityText =
        `${number(record.quantity_borrowed)} borrowed · ` +
        `${number(record.quantity_returned)} returned · ` +
        `${outstanding(record)} outstanding`;

      return `
        <tr>
          <td>
            <div class="asset-cell">
              ${imageMarkup}

              <div class="asset-info">
                <strong>
                  ${esc(resource?.name || "Equipment record unavailable")}
                </strong>

                <small>Resource ID: ${esc(resourceId)}</small>
                <small>Request: ${esc(requestId)}</small>
                <small>${esc(quantityText)}</small>
              </div>
            </div>
          </td>

          <td>
            <div class="date-line">
              Borrowed: ${esc(formatDate(borrowedAt, true))}
            </div>

            <div class="time-line">
              Due: ${esc(formatDate(dueDate, true))}
            </div>

            <div class="duration">
              ${esc(returnedAt
                ? `Returned: ${formatDate(returnedAt, true)}`
                : "Not yet returned")}
            </div>

            <div class="duration">${esc(duration)}</div>
          </td>

          <td>
            <div class="facility-name">${esc(location)}</div>
            <div class="facility-sub">
              Equipment location from inventory
            </div>
          </td>

          <td>
            <div class="clearance">${esc(condition)}</div>
            <div class="clearance-detail">
              This is the current equipment listing condition,
              not a separate checkout or inspection certificate.
            </div>
          </td>

          <td>
            <span class="status-pill ${badgeClass}">
              ${esc(status)}
            </span>
          </td>

          <td>
            <div class="record-actions">
              <button
                class="text-action"
                type="button"
                data-action="details"
                data-id="${esc(record.id)}">
                View borrowing details
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    const noMatches = filtered.length === 0;

    if (el.empty) {
      el.empty.hidden = !noMatches;

      el.empty.textContent = state.rows.length === 0
        ? "No borrowing records are linked to your student account yet. Borrowed equipment will appear here after it is checked out and recorded."
        : "No records match your search or filters. Try clearing the filters.";
    }

    if (el.tableScroll) {
      el.tableScroll.hidden = noMatches;
    }

    if (el.resultCount) {
      el.resultCount.textContent = filtered.length === 0
        ? `Showing 0 of ${state.rows.length} borrowing records`
        : `Showing ${pageItems.length} of ${filtered.length} matching records (${state.rows.length} total)`;
    }

    if (el.pageSummary) {
      el.pageSummary.textContent =
        `Page ${state.page} of ${pageCount} · ${filtered.length} records for your account`;
    }

    renderPagination(pageCount);
    updateTabCounts();
  }

  function csvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;

    document.body.append(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportCSV() {
    const headings = [
      "Borrow Record ID",
      "Booking Request ID",
      "Resource ID",
      "Equipment",
      "Location",
      "Borrowed At",
      "Due Date",
      "Returned At",
      "Quantity Borrowed",
      "Quantity Returned",
      "Outstanding Quantity",
      "Return Status"
    ];

    const lines = [
      headings.map(csvCell).join(",")
    ];

    state.filtered.forEach(record => {
      const resource = getResource(record);
      const request = getRequest(record);

      lines.push([
        record.id,
        request?.id,
        resource?.id,
        resource?.name,
        resource?.location,
        record.borrowed_at,
        record.due_date,
        record.returned_at,
        record.quantity_borrowed,
        record.quantity_returned,
        outstanding(record),
        record.return_status || recordStatus(record)
      ].map(csvCell).join(","));
    });

    downloadFile(
      "campusshare-borrowing-history.csv",
      lines.join("\n"),
      "text/csv;charset=utf-8"
    );

    toast(
      `Exported ${state.filtered.length} actual borrowing records.`
    );
  }

  function exportSummary() {
    const profileName =
      state.profile?.full_name ||
      state.user?.email ||
      "Student";

    const lines = [
      "CAMPUSSHARE - BORROWING HISTORY SUMMARY",
      `Generated: ${new Date().toLocaleString()}`,
      `Student: ${profileName}`,
      `Student email: ${state.profile?.email || state.user?.email || "Not available"}`,
      `Records included: ${state.filtered.length}`,
      "",
      "This is a user-generated export of records available in CampusShare. It is not a digitally signed or certified institutional audit transcript.",
      ""
    ];

    state.filtered.forEach((record, index) => {
      const resource = getResource(record);
      const request = getRequest(record);

      lines.push(
        `${index + 1}. ${resource?.name || "Equipment record unavailable"}`,
        `   Borrow record ID: ${record.id}`,
        `   Booking request ID: ${request?.id || "Not linked"}`,
        `   Borrowed: ${formatDate(record.borrowed_at, true)}`,
        `   Due: ${formatDate(record.due_date, true)}`,
        `   Returned: ${formatDate(record.returned_at, true)}`,
        `   Quantity borrowed: ${number(record.quantity_borrowed)}`,
        `   Quantity returned: ${number(record.quantity_returned)}`,
        `   Outstanding: ${outstanding(record)}`,
        `   Location: ${resource?.location || "Not recorded"}`,
        `   Status: ${recordStatus(record)}`,
        ""
      );
    });

    downloadFile(
      "campusshare-history-summary.txt",
      lines.join("\n"),
      "text/plain;charset=utf-8"
    );

    toast(
      `Downloaded ${state.filtered.length} history records.`
    );
  }

  function openRecordDetails(record) {
    const resource = getResource(record);
    const request = getRequest(record);
    const item = getRequestItem(record);

    const details = [
      ["Equipment", resource?.name || "Unavailable"],
      ["Resource ID", resource?.id || "Not available"],
      ["Booking request ID", request?.id || "Not linked"],
      ["Booking item ID", item?.id || "Not linked"],
      ["Borrow record ID", record.id],
      ["Category", categoryName(resource)],
      ["Equipment location", resource?.location || "Not recorded"],
      ["Current listed condition", resource?.condition || "Not recorded"],
      ["Borrowed at", formatDate(record.borrowed_at, true)],
      ["Due date", formatDate(record.due_date, true)],
      ["Returned at", formatDate(record.returned_at, true)],
      ["Quantity borrowed", number(record.quantity_borrowed)],
      ["Quantity returned", number(record.quantity_returned)],
      ["Outstanding quantity", outstanding(record)],
      ["Return status", record.return_status || recordStatus(record)]
    ];

    const content = details.map(([label, value]) =>
      `<div class="modal-content-line">
        <b>${esc(label)}:</b> ${esc(value)}
      </div>`
    ).join("");

    if (el.modalTitle) {
      el.modalTitle.textContent = "Borrowing record details";
    }

    if (el.modalContent) {
      el.modalContent.innerHTML = content;
    }

    if (el.modal) {
      el.modal.hidden = false;
    }
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
      "Supabase did not initialize. Check the script tags at the bottom of history/index.html."
    );
  }

  async function loadHistory() {
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
        "History profile lookup:",
        profileError.message
      );
    }

    state.profile = profile || null;
    updateIdentity();

    // First, get only this student's requests.
    const {
      data: requests,
      error: requestError
    } = await state.client
      .from("booking_requests")
      .select("id, student_id, request_date, start_date, due_date, status, created_at")
      .eq("student_id", state.user.id);

    if (requestError) {
      throw new Error(
        `Could not load your booking requests: ${requestError.message}`
      );
    }

    state.requests = Array.isArray(requests) ? requests : [];

    const requestIds = state.requests
      .map(row => row.id)
      .filter(Boolean);

    state.requestItems = [];
    state.borrowRecords = [];

    state.resources = new Map();
    state.categories = new Map();
    state.images = new Map();

    // Load the request items for those requests.
    if (requestIds.length) {
      const {
        data: items,
        error: itemsError
      } = await state.client
        .from("booking_request_items")
        .select("id, request_id, resource_id, requested_quantity, approved_quantity, item_status")
        .in("request_id", requestIds);

      if (itemsError) {
        throw new Error(
          `Could not load your requested equipment: ${itemsError.message}`
        );
      }

      state.requestItems = Array.isArray(items) ? items : [];

      const itemIds = state.requestItems
        .map(row => row.id)
        .filter(Boolean);

      // Get borrow_records linked to those request items.
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
            `Could not load your borrowing history: ${borrowError.message}`
          );
        }

        state.borrowRecords = Array.isArray(borrowRecords)
          ? borrowRecords
          : [];
      }
    }

    // Load the equipment referenced by the student's request items.
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
          `Could not load equipment details: ${resourcesError.message}`
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
          error: categoryError
        } = await state.client
          .from("categories")
          .select("id, category_name")
          .in("id", categoryIds);

        if (categoryError) {
          console.warn(
            "Category lookup:",
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
          "Equipment image lookup:",
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

    state.rows = [...state.borrowRecords].sort((a, b) =>
      new Date(b.borrowed_at || 0).getTime() -
      new Date(a.borrowed_at || 0).getTime()
    );

    populateFacilityFilter();
    calculateMetrics();
    renderRows();
  }

  function setupEvents() {
    document.addEventListener("click", event => {
      const tab = event.target.closest(".filter-tab");

      if (tab) {
        state.activeFilter = tab.dataset.filter || "all";
        state.page = 1;

        $$(".filter-tab").forEach(button => {
          const active = button === tab;

          button.classList.toggle("active", active);
          button.setAttribute("aria-selected", String(active));
        });

        renderRows();
        return;
      }

      const pageButton = event.target.closest("[data-page]");

      if (pageButton) {
        const page = pageButton.dataset.page;

        const pageCount = Math.max(
          1,
          Math.ceil(state.filtered.length / state.pageSize)
        );

        if (page === "prev") {
          state.page = Math.max(1, state.page - 1);
        } else if (page === "next") {
          state.page = Math.min(pageCount, state.page + 1);
        } else {
          state.page = Number(page) || 1;
        }

        renderRows();
        return;
      }

      const action = event.target.closest('[data-action="details"]');

      if (action) {
        const record = state.rows.find(
          row => row.id === action.dataset.id
        );

        if (record) openRecordDetails(record);
      }
    });

    [el.search, el.facility, el.dateRange].forEach(control => {
      control?.addEventListener(
        control === el.search ? "input" : "change",
        () => {
          state.page = 1;
          renderRows();
        }
      );
    });

    $("#exportBtn")?.addEventListener("click", exportCSV);
    $("#auditBtn")?.addEventListener("click", exportSummary);

    $("#modalClose")?.addEventListener("click", () => {
      if (el.modal) el.modal.hidden = true;
    });

    $("#modalDone")?.addEventListener("click", () => {
      if (el.modal) el.modal.hidden = true;
    });

    el.modal?.addEventListener("click", event => {
      if (event.target === el.modal) {
        el.modal.hidden = true;
      }
    });

    $("#menuToggle")?.addEventListener("click", () => {
      $("#sidebar")?.classList.toggle("open");
    });

    document.addEventListener("keydown", event => {
      if (
        event.key === "Escape" &&
        el.modal &&
        !el.modal.hidden
      ) {
        el.modal.hidden = true;
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        el.search?.focus();
      }
    });
  }

  async function init() {
    clearDemoContent();
    setupEvents();

    if (el.rows) {
      el.rows.innerHTML =
        '<tr><td colspan="6">Loading your actual borrowing records…</td></tr>';
    }

    try {
      state.client = await waitForSupabase();
      await loadHistory();

    } catch (error) {
      console.error(
        "CampusShare history page failed:",
        error
      );

      showPageError(
        error.message || "Could not load your borrowing history."
      );

      toast(
        error.message || "Could not load borrowing history.",
        true
      );
    }
  }

  init();

})();
vvv
