
(() => {
  "use strict";

  // CampusShare Admin - Owner Applications
  // All applications and decisions are loaded from Supabase.
  // No fictional applicants, document labels or sample counts are used.

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const state = {
    client: null,
    admin: null,
    adminProfile: null,
    applications: [],
    profiles: new Map(),
    activeTab: "pending",
    selectedId: null,
    loading: false,
    toastTimer: null
  };

  const els = {
    pendingCount: $("#pendingCount"),
    approvedCount: $("#approvedCount"),
    reviewCount: $("#reviewCount"),
    rejectionRate: $("#rejectionRate"),
    pendingTabCount: $("#pendingTabCount"),
    search: $("#applicationSearch"),
    department: $("#departmentFilter"),
    body: $("#applicationsTableBody"),
    empty: $("#emptyState"),
    resultCount: $("#resultCount"),
    pageSummary: $("#pageSummary"),
    modal: $("#modalBackdrop"),
    modalTitle: $("#modalTitle"),
    modalBody: $("#modalBody"),
    modalActions: $("#modalActions"),
    toast: $("#toast")
  };

  const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);

  function toast(message, isError = false) {
    if (!els.toast) return;

    els.toast.textContent = message;
    els.toast.classList.toggle("error", Boolean(isError));
    els.toast.classList.add("show");

    clearTimeout(state.toastTimer);

    state.toastTimer = setTimeout(
      () => els.toast.classList.remove("show"),
      3500
    );
  }

  function dateText(value, time = true) {
    if (!value) return "Not recorded";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not recorded";
    }

    return new Intl.DateTimeFormat(
      undefined,
      time
        ? { dateStyle: "medium", timeStyle: "short" }
        : { dateStyle: "medium" }
    ).format(date);
  }

  function initials(name) {
    return String(name || "Staff applicant")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join("") || "SA";
  }

  function normalizedStatus(value) {
    const status = String(value || "pending")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    if (["approved", "active", "accepted"].includes(status)) {
      return "approved";
    }

    if (["rejected", "declined", "denied", "cancelled", "canceled"].includes(status)) {
      return "rejected";
    }

    if (["under_review", "review", "in_review", "in_progress"].includes(status)) {
      return "review";
    }

    if (["pending", "pending_verification", "submitted", "new", ""].includes(status)) {
      return "pending";
    }

    return "other";
  }

  function statusLabel(row) {
    const status = normalizedStatus(row.status);

    if (status === "pending") return "Pending Verification";
    if (status === "review") return "Under Review";
    if (status === "approved") return "Approved";
    if (status === "rejected") return "Rejected";

    return String(row.status || "Status not set")
      .replace(/[_-]+/g, " ");
  }

  function statusClass(row) {
    const status = normalizedStatus(row.status);

    if (status === "approved") return "approved";
    if (status === "rejected") return "rejected";
    if (status === "review") return "review";

    return "pending";
  }

  function applicantProfile(row) {
    return state.profiles.get(row.user_id) || {};
  }

  function applicantName(row) {
    const profile = applicantProfile(row);

    return row.full_name ||
      profile.full_name ||
      row.staff_id ||
      row.email ||
      "Staff applicant";
  }

  function applicantEmail(row) {
    return row.email ||
      applicantProfile(row).email ||
      "Email not provided";
  }

  function applicantDepartment(row) {
    return row.department ||
      applicantProfile(row).department ||
      "Department not provided";
  }

  function categories(row) {
    const value = row.resource_categories;

    if (Array.isArray(value)) {
      return value.map(String).filter(Boolean);
    }

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);

        if (Array.isArray(parsed)) {
          return parsed.map(String).filter(Boolean);
        }
      } catch (_) {
        // Treat a non-JSON string as a comma-separated value.
      }

      return value
        .replace(/[{}]/g, "")
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);
    }

    return [];
  }

  function formatApplicationId(id) {
    return String(id || "")
      .replace(/-/g, "")
      .slice(0, 10)
      .toUpperCase();
  }

  function showLoading(message) {
    if (els.body) {
      els.body.innerHTML =
        `<tr><td colspan="7" class="loading-cell">${esc(message)}</td></tr>`;
    }

    if (els.empty) {
      els.empty.hidden = true;
    }
  }

  function showFatalError(message) {
    if (els.body) {
      els.body.innerHTML = "";
    }

    if (els.empty) {
      els.empty.hidden = false;

      const title = $("strong", els.empty);
      const paragraph = $("p", els.empty);

      if (title) {
        title.textContent = "Could not load owner applications";
      }

      if (paragraph) {
        paragraph.textContent = message;
      }
    }

    if (els.resultCount) {
      els.resultCount.textContent = "Application queue unavailable";
    }

    if (els.pageSummary) {
      els.pageSummary.textContent =
        "Check the error message and Supabase permissions.";
    }
  }

  function itemsForTab() {
    return state.applications.filter(row => {
      const status = normalizedStatus(row.status);

      if (state.activeTab === "approved") {
        return status === "approved";
      }

      if (state.activeTab === "rejected") {
        return status === "rejected";
      }

      return status === "pending" || status === "review";
    });
  }

  function filteredItems() {
    const query = (els.search?.value || "")
      .trim()
      .toLowerCase();

    const department = els.department?.value || "all";

    return itemsForTab().filter(row => {
      const text = [
        row.id,
        row.user_id,
        row.staff_id,
        applicantName(row),
        applicantEmail(row),
        applicantDepartment(row),
        row.purpose,
        row.remarks,
        row.reviewer_note,
        ...categories(row)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!query || text.includes(query)) &&
        (
          department === "all" ||
          applicantDepartment(row) === department
        )
      );
    });
  }

  function renderStats() {
    const pending = state.applications.filter(
      row => normalizedStatus(row.status) === "pending"
    ).length;

    const approved = state.applications.filter(
      row => normalizedStatus(row.status) === "approved"
    ).length;

    const review = state.applications.filter(
      row => normalizedStatus(row.status) === "review"
    ).length;

    const rejected = state.applications.filter(
      row => normalizedStatus(row.status) === "rejected"
    ).length;

    const total = state.applications.length;

    const rejectionRate = total
      ? Math.round(rejected / total * 100)
      : 0;

    if (els.pendingCount) {
      els.pendingCount.textContent = String(pending);
    }

    if (els.approvedCount) {
      els.approvedCount.textContent = String(approved);
    }

    if (els.reviewCount) {
      els.reviewCount.textContent = String(review);
    }

    if (els.rejectionRate) {
      els.rejectionRate.textContent = `${rejectionRate}%`;
    }

    if (els.pendingTabCount) {
      els.pendingTabCount.textContent = String(pending + review);
    }

    const tabs = $$(".queue-tab");

    const approvedTab = tabs.find(
      tab => tab.dataset.tab === "approved"
    );

    const rejectedTab = tabs.find(
      tab => tab.dataset.tab === "rejected"
    );

    if (approvedTab) {
      const count = $("b", approvedTab);

      if (count) {
        count.textContent = String(approved);
      }
    }

    if (rejectedTab) {
      const count = $("b", rejectedTab);

      if (count) {
        count.textContent = String(rejected);
      }
    }

    const paragraphs = $$(".stats-grid .stat-card p");

    if (paragraphs[0]) {
      paragraphs[0].textContent =
        "Applications awaiting an admin decision.";
    }

    if (paragraphs[1]) {
      paragraphs[1].textContent =
        "Applications approved in this database.";
    }

    if (paragraphs[2]) {
      paragraphs[2].textContent =
        "Applications marked for further review.";
    }

    if (paragraphs[3]) {
      paragraphs[3].textContent =
        `${rejected} rejected out of ${total} recorded applications.`;
    }
  }

  function renderDepartmentOptions() {
    if (!els.department) return;

    const previous = els.department.value || "all";

    const departments = [
      ...new Set(
        state.applications
          .map(applicantDepartment)
          .filter(value => value !== "Department not provided")
      )
    ].sort((a, b) => a.localeCompare(b));

    els.department.innerHTML =
      `<option value="all">All Departments</option>` +
      departments.map(value =>
        `<option value="${esc(value)}">${esc(value)}</option>`
      ).join("");

    els.department.value =
      departments.includes(previous) ? previous : "all";
  }

  function resourcesMarkup(row) {
    const values = categories(row);

    if (!values.length) {
      return `<span class="muted-text">No resource categories provided</span>`;
    }

    return `
      <div class="resource-tags">
        ${values.map(value =>
          `<span class="resource-tag">${esc(value)}</span>`
        ).join("")}
      </div>
    `;
  }

  function rowMarkup(row) {
    const name = applicantName(row);
    const email = applicantEmail(row);
    const department = applicantDepartment(row);
    const status = normalizedStatus(row.status);

    const canDecide =
      status === "pending" || status === "review";

    const appId = formatApplicationId(row.id);

    const actions = `
      <button
        class="row-action"
        type="button"
        data-action="review"
        data-id="${esc(row.id)}"
        title="Review application"
        aria-label="Review ${esc(name)}">◉</button>

      ${canDecide ? `
        <button
          class="row-action"
          type="button"
          data-action="approve"
          data-id="${esc(row.id)}"
          title="Approve application"
          aria-label="Approve ${esc(name)}">✓</button>

        <button
          class="row-action danger"
          type="button"
          data-action="reject"
          data-id="${esc(row.id)}"
          title="Reject application"
          aria-label="Reject ${esc(name)}">⊘</button>
      ` : ""}
    `;

    return `
      <tr>
        <td>
          <div class="applicant-cell">
            <span class="avatar">${esc(initials(name))}</span>

            <div>
              <div class="applicant-name">${esc(name)}</div>
              <div class="applicant-email">${esc(email)}</div>
              <span class="applicant-id">
                Application: ${esc(appId)}
              </span>

              ${row.staff_id ? `
                <span class="applicant-id">
                  Staff ID: ${esc(row.staff_id)}
                </span>
              ` : ""}
            </div>
          </div>
        </td>

        <td>
          <div class="department">${esc(department)}</div>
        </td>

        <td>${resourcesMarkup(row)}</td>

        <td>
          <div class="submitted">
            <strong>${esc(dateText(row.created_at))}</strong>
          </div>
        </td>

        <td>
          <div class="purpose-preview">
            ${row.purpose
              ? esc(row.purpose)
              : "No purpose statement provided."}
          </div>

          <small class="muted-text">
            No attachment fields exist in this table.
          </small>
        </td>

        <td>
          <span class="status-badge ${statusClass(row)}">
            ${esc(statusLabel(row))}
          </span>
        </td>

        <td class="actions-cell">${actions}</td>
      </tr>
    `;
  }

  function renderTable() {
    renderStats();

    const rows = filteredItems();

    if (els.body) {
      els.body.innerHTML = rows.map(rowMarkup).join("");
    }

    if (els.empty) {
      els.empty.hidden = rows.length > 0;

      const title = $("strong", els.empty);
      const paragraph = $("p", els.empty);

      if (title) {
        title.textContent = state.applications.length
          ? "No applications match these filters"
          : "No owner applications have been submitted";
      }

      if (paragraph) {
        paragraph.textContent = state.applications.length
          ? "Try another search term or reset the filters."
          : "Staff applications will appear here after a record is saved in the owner_applications table.";
      }
    }

    const tabLabel = state.activeTab === "approved"
      ? "approved applications"
      : state.activeTab === "rejected"
        ? "rejected applications"
        : "pending or under-review applications";

    if (els.resultCount) {
      els.resultCount.textContent =
        `Displaying ${rows.length} ${tabLabel}`;
    }

    if (els.pageSummary) {
      els.pageSummary.textContent =
        `Displaying ${rows.length} of ${itemsForTab().length} ${tabLabel} · ${state.applications.length} total application records.`;
    }
  }

  function switchTab(tab) {
    state.activeTab = tab;

    $$(".queue-tab").forEach(button => {
      const active = button.dataset.tab === tab;

      button.classList.toggle("active", active);

      button.setAttribute(
        "aria-selected",
        String(active)
      );
    });

    renderTable();
  }

  function openModal(title, body, actions = "") {
    if (!els.modal) return;

    els.modalTitle.textContent = title;
    els.modalBody.innerHTML = body;
    els.modalActions.innerHTML = actions;

    els.modal.hidden = false;

    $("#closeModal")?.focus();
  }

  function closeModal() {
    if (els.modal) {
      els.modal.hidden = true;
    }

    state.selectedId = null;
  }

  function findApplication(id) {
    return state.applications.find(
      row => String(row.id) === String(id)
    );
  }

  function reviewApplication(id) {
    const row = findApplication(id);

    if (!row) return;

    state.selectedId = row.id;

    const canDecide = [
      "pending",
      "review"
    ].includes(normalizedStatus(row.status));

    const categoryList = categories(row);

    const body = `
      <div class="detail-grid">

        <div class="detail-box">
          <label>Applicant</label>
          <strong>${esc(applicantName(row))}</strong>
        </div>

        <div class="detail-box">
          <label>Email</label>
          <strong>${esc(applicantEmail(row))}</strong>
        </div>

        <div class="detail-box">
          <label>Application ID</label>
          <strong>${esc(row.id)}</strong>
        </div>

        <div class="detail-box">
          <label>Staff ID</label>
          <strong>${esc(row.staff_id || "Not provided")}</strong>
        </div>

        <div class="detail-box">
          <label>Department</label>
          <strong>${esc(applicantDepartment(row))}</strong>
        </div>

        <div class="detail-box">
          <label>Current status</label>
          <strong>${esc(statusLabel(row))}</strong>
        </div>

        <div class="detail-box">
          <label>Submitted</label>
          <strong>${esc(dateText(row.created_at, true))}</strong>
        </div>

        <div class="detail-box">
          <label>Applicant user ID</label>
          <strong>${esc(row.user_id || "Not linked")}</strong>
        </div>

      </div>

      <div class="modal-section">
        <h3>Requested resource categories</h3>
        <p>
          ${categoryList.length
            ? categoryList.map(esc).join(", ")
            : "No resource categories provided."}
        </p>
      </div>

      <div class="modal-section">
        <h3>Application purpose</h3>
        <p>${esc(row.purpose || "No purpose statement provided.")}</p>
      </div>

      <div class="modal-section">
        <h3>Documents</h3>
        <p>
          No document or certificate attachment columns are present
          in owner_applications. Do not treat documents as submitted
          or verified.
        </p>
      </div>

      <div class="modal-section">
        <h3>Previous remarks</h3>
        <p>${esc(row.remarks || "No remarks recorded.")}</p>
      </div>

      <div class="modal-section">
        <h3>Previous reviewer note</h3>
        <p>${esc(row.reviewer_note || "No reviewer note recorded.")}</p>
      </div>

      ${canDecide ? `
        <label class="review-note-label" for="reviewerNote">
          Admin review note (optional)
        </label>

        <textarea
          class="decision-reason"
          id="reviewerNote"
          placeholder="Enter a clear reason or note for this decision..."></textarea>
      ` : ""}
    `;

    const actions = canDecide ? `
      <button
        type="button"
        class="button button-light"
        data-decision="under_review">
        Mark under review
      </button>

      <button
        type="button"
        class="button button-danger"
        data-decision="rejected">
        Reject application
      </button>

      <button
        type="button"
        class="button button-success"
        data-decision="approved">
        Approve owner
      </button>
    ` : `
      <button
        type="button"
        class="button button-primary"
        id="closeDone">
        Close
      </button>
    `;

    openModal(
      "Owner application review",
      body,
      actions
    );
  }

  async function recordActivity(action, application, note) {
    try {
      const { error } = await state.client
        .from("activity_logs")
        .insert({
          user_id: state.admin.id,
          action,
          details: {
            application_id: application.id,
            applicant_user_id: application.user_id,
            applicant_email: applicantEmail(application),
            note: note || null
          }
        });

      if (error) {
        console.warn(
          "Admin activity log was not saved:",
          error.message
        );
      }

    } catch (error) {
      console.warn(
        "Admin activity log was not saved:",
        error
      );
    }
  }

  async function decideApplication(id, decision, note = "") {
    const row = findApplication(id);

    if (!row) return;

    if (!state.admin?.id) {
      toast(
        "Your admin session could not be verified. Sign in again.",
        true
      );
      return;
    }

    const updates = {
      status: decision,
      reviewed_by: state.admin.id,
      reviewed_at: new Date().toISOString(),
      reviewer_note: note.trim() || null
    };

    try {
      // Save the decision in the real owner_applications table.
      const { error } = await state.client
        .from("owner_applications")
        .update(updates)
        .eq("id", row.id);

      if (error) throw error;

      let roleWarning = "";

      // Promote the staff applicant only after approval.
      if (decision === "approved" && row.user_id) {
        const { error: profileError } = await state.client
          .from("profiles")
          .update({ role: "owner" })
          .eq("id", row.user_id);

        if (profileError) {
          console.error(
            "Could not promote approved owner profile:",
            profileError
          );

          roleWarning =
            " The application was approved, but the profile role could not be changed to owner. An administrator UPDATE policy for profiles is required.";
        }
      }

      await recordActivity(
        `owner_application_${decision}`,
        row,
        note
      );

      closeModal();

      toast(
        `Application updated to ${decision.replace(/_/g, " ")}.${roleWarning}`,
        Boolean(roleWarning)
      );

      await loadApplications();

    } catch (error) {
      console.error(
        "Owner application decision failed:",
        error
      );

      toast(
        `Could not save decision: ${error.message || "Unknown Supabase error"}`,
        true
      );
    }
  }

  function renderReviewLog() {
    const decisions = state.applications
      .filter(row =>
        row.reviewed_at ||
        row.reviewed_by ||
        row.reviewer_note
      )
      .sort((a, b) =>
        new Date(b.reviewed_at || 0) -
        new Date(a.reviewed_at || 0)
      );

    const body = decisions.length
      ? `
        <div class="log-list">
          ${decisions.map(row => `
            <div class="log-item">
              <span class="log-dot"></span>

              <div>
                <strong>
                  ${esc(applicantName(row))}
                  · ${esc(statusLabel(row))}
                </strong>

                <small>
                  ${esc(row.id)}
                  · ${esc(dateText(row.reviewed_at, true))}
                </small>

                ${row.reviewer_note
                  ? `<small>${esc(row.reviewer_note)}</small>`
                  : ""}
              </div>
            </div>
          `).join("")}
        </div>
      `
      : `<p>No reviewed applications have been recorded yet.</p>`;

    openModal(
      "Application review history",
      body,
      '<button type="button" class="button button-primary" id="closeDone">Close</button>'
    );
  }

  function exportQueue() {
    const rows = filteredItems();

    const headers = [
      "Application ID",
      "User ID",
      "Staff ID",
      "Full Name",
      "Email",
      "Department",
      "Resource Categories",
      "Purpose",
      "Status",
      "Created At",
      "Reviewed By",
      "Reviewed At",
      "Remarks",
      "Reviewer Note"
    ];

    const cell = value =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const lines = [
      headers.map(cell).join(",")
    ];

    rows.forEach(row => {
      lines.push([
        row.id,
        row.user_id,
        row.staff_id,
        applicantName(row),
        applicantEmail(row),
        applicantDepartment(row),
        categories(row).join("; "),
        row.purpose,
        statusLabel(row),
        row.created_at,
        row.reviewed_by,
        row.reviewed_at,
        row.remarks,
        row.reviewer_note
      ].map(cell).join(","));
    });

    const blob = new Blob(
      [lines.join("\r\n")],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download =
      `campusshare-owner-applications-${state.activeTab}.csv`;

    document.body.append(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    toast(`Exported ${rows.length} application record(s).`);
  }

  function resetFilters() {
    if (els.search) els.search.value = "";
    if (els.department) els.department.value = "all";

    switchTab("pending");
    toast("Filters reset.");
  }

  async function verifyAdmin() {
    const {
      data: authData,
      error: authError
    } = await state.client.auth.getUser();

    if (authError) throw authError;

    const user = authData?.user;

    if (!user) {
      throw new Error(
        "No signed-in administrator session was found."
      );
    }

    const {
      data: profile,
      error: profileError
    } = await state.client
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(
        `Could not verify admin role: ${profileError.message}`
      );
    }

    if (
      !profile ||
      String(profile.role).toLowerCase() !== "admin"
    ) {
      throw new Error(
        "This page is restricted to CampusShare administrators."
      );
    }

    state.admin = user;
    state.adminProfile = profile;

    const identity =
      $(".account-copy strong") ||
      $(".admin-identity strong");

    const subtitle = $(".account-copy small");

    if (identity) {
      identity.textContent =
        profile.full_name ||
        user.email ||
        "Administrator";
    }

    if (subtitle) {
      subtitle.textContent =
        user.email ||
        "Administrator";
    }

    const avatar = $(".admin-avatar:not(.small)");

    if (avatar) {
      avatar.textContent = initials(
        profile.full_name || user.email
      );
    }
  }

  async function loadApplications() {
    state.loading = true;

    showLoading(
      "Loading owner applications from Supabase…"
    );

    const {
      data,
      error
    } = await state.client
      .from("owner_applications")
      .select(`
        id,
        user_id,
        staff_id,
        status,
        reviewed_by,
        reviewed_at,
        remarks,
        created_at,
        full_name,
        email,
        department,
        resource_categories,
        purpose,
        reviewer_note
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(
        `Could not load owner_applications: ${error.message}`
      );
    }

    state.applications = Array.isArray(data)
      ? data
      : [];

    state.profiles = new Map();

    const userIds = [
      ...new Set(
        state.applications
          .map(row => row.user_id)
          .filter(Boolean)
      )
    ];

    if (userIds.length) {
      const {
        data: profiles,
        error: profileError
      } = await state.client
        .from("profiles")
        .select("id, full_name, email, department, role")
        .in("id", userIds);

      if (profileError) {
        console.warn(
          "Applicant profiles could not be loaded:",
          profileError.message
        );

      } else {
        (profiles || []).forEach(profile => {
          state.profiles.set(profile.id, profile);
        });
      }
    }

    renderDepartmentOptions();
    renderTable();

    const demoNote = $(".demo-note");

    if (demoNote) {
      demoNote.textContent =
        "Live queue: applicant information is loaded from the CampusShare database. Document uploads are not stored in the owner_applications table.";
    }

    const sync = $(".sync-status");

    if (sync) {
      sync.textContent =
        `Loaded ${state.applications.length} database record(s) · ${new Date().toLocaleTimeString()}`;
    }

    state.loading = false;
  }

  function setupEvents() {
    $$(".queue-tab").forEach(button => {
      button.addEventListener("click", () => {
        switchTab(button.dataset.tab);
      });
    });

    els.search?.addEventListener("input", renderTable);
    els.department?.addEventListener("change", renderTable);

    $("#resetFilters")?.addEventListener(
      "click",
      resetFilters
    );

    $("#reviewLogButton")?.addEventListener(
      "click",
      renderReviewLog
    );

    $("#exportButton")?.addEventListener(
      "click",
      exportQueue
    );

    $("#closeModal")?.addEventListener(
      "click",
      closeModal
    );

    $("#cancelModal")?.addEventListener(
      "click",
      closeModal
    );

    els.modal?.addEventListener("click", event => {
      if (event.target === els.modal) {
        closeModal();
      }
    });

    els.body?.addEventListener("click", event => {
      const button = event.target.closest("[data-action]");

      if (!button) return;

      const row = findApplication(button.dataset.id);

      if (!row) return;

      if (
        button.dataset.action === "review" ||
        button.dataset.action === "approve" ||
        button.dataset.action === "reject"
      ) {
        reviewApplication(row.id);
      }
    });

    els.modalActions?.addEventListener("click", event => {
      const button = event.target.closest("[data-decision]");

      if (button) {
        const id = state.selectedId;
        const decision = button.dataset.decision;

        const note =
          $("#reviewerNote", els.modalBody)?.value || "";

        decideApplication(id, decision, note);
      }

      if (event.target.closest("#closeDone")) {
        closeModal();
      }
    });

    $("#modalBody")?.addEventListener("click", event => {
      if (event.target.closest("#closeDone")) {
        closeModal();
      }
    });

    $("#notificationButton")?.addEventListener("click", () => {
      toast(
        "Admin notifications are not connected to this page yet."
      );
    });

    $("#accountButton")?.addEventListener("click", () => {
      toast(
        `Signed in as ${state.adminProfile?.full_name || state.admin?.email || "Administrator"}.`
      );
    });

    document.addEventListener("keydown", event => {
      if (
        event.key === "Escape" &&
        els.modal &&
        !els.modal.hidden
      ) {
        closeModal();
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        $("[data-admin-global-search]")?.focus();
      }
    });
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
      "Supabase did not initialize. Check the Supabase script in owner-applications.html."
    );
  }

  async function init() {
    if (els.body) {
      els.body.innerHTML = "";
    }

    const paragraphs = $$(".stats-grid .stat-card p");

    if (paragraphs[0]) {
      paragraphs[0].textContent =
        "Applications awaiting an admin decision.";
    }

    if (paragraphs[1]) {
      paragraphs[1].textContent =
        "Applications approved in this database.";
    }

    if (paragraphs[2]) {
      paragraphs[2].textContent =
        "Applications marked for further review.";
    }

    if (paragraphs[3]) {
      paragraphs[3].textContent =
        "Calculated from recorded application outcomes.";
    }

    const docHeading = $(
      ".table-card thead th:nth-child(5)"
    );

    if (docHeading) {
      docHeading.textContent = "Application purpose / details";
    }

    const sync = $(".sync-status");

    if (sync) {
      sync.textContent =
        "Connecting to CampusShare database…";
    }

    const demoNote = $(".demo-note");

    if (demoNote) {
      demoNote.textContent =
        "Loading live owner applications from CampusShare…";
    }

    setupEvents();

    try {
      state.client = await waitForSupabase();

      await verifyAdmin();
      await loadApplications();

      // Refresh the queue periodically without generating demo records.
      window.setInterval(() => {
        if (
          !document.hidden &&
          !state.loading &&
          (!els.modal || els.modal.hidden)
        ) {
          loadApplications().catch(error => {
            console.warn(
              "Queue refresh failed:",
              error.message
            );
          });
        }
      }, 60000);

    } catch (error) {
      console.error(
        "CampusShare owner application page failed:",
        error
      );

      state.loading = false;

      showFatalError(
        error.message ||
          "Could not load the owner application queue."
      );

      toast(
        error.message ||
          "Could not load owner applications.",
        true
      );
    }
  }

  init();

})();
