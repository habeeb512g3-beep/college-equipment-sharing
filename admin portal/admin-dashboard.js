
'use strict';

/* CampusShare Admin Dashboard - live Supabase data only. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const n = v => Number.isFinite(Number(v)) ? Number(v) : 0;

  const state = {
    db: null,
    admin: null,
    profile: null,
    resources: [],
    categories: [],
    profiles: [],
    requests: [],
    items: [],
    loans: [],
    owners: [],
    incidents: [],
    activity: [],
    errors: {},
    loading: false,
    toastTimer: null
  };

  function toast(message, error = false) {
    const node = $('#toast');
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('error', !!error);
    node.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => node.classList.remove('show'), 3500);
  }

  function dateText(value, time = true) {
    if (!value || Number.isNaN(new Date(value).getTime())) return 'Not recorded';
    return new Intl.DateTimeFormat(undefined, time
      ? { dateStyle: 'medium', timeStyle: 'short' }
      : { dateStyle: 'medium' }).format(new Date(value));
  }

  function initials(value) {
    return String(value || 'Admin').trim().split(/\s+/).filter(Boolean)
      .slice(0, 2).map(x => x[0].toUpperCase()).join('') || 'AD';
  }

  const profile = id => state.profiles.find(x => x.id === id) || null;
  const resource = id => state.resources.find(x => x.id === id) || null;
  const category = id => state.categories.find(x => x.id === id)?.category_name || 'Uncategorized';
  const item = id => state.items.find(x => x.id === id) || null;
  const request = id => state.requests.find(x => x.id === id) || null;

  const requestForLoan = loan => {
    const row = item(loan.request_item_id);
    return row ? request(row.request_id) : null;
  };

  const resourceForLoan = loan => {
    const row = item(loan.request_item_id);
    return row ? resource(row.resource_id) : null;
  };

  const outstanding = loan =>
    Math.max(0, n(loan.quantity_borrowed) - n(loan.quantity_returned));

  const activeLoan = loan => {
    const status = String(loan.return_status || '')
      .toLowerCase().replace(/[\s-]+/g, '_');

    return outstanding(loan) > 0 &&
      !loan.returned_at &&
      !['returned', 'fully_returned', 'complete', 'completed', 'closed'].includes(status);
  };

  const overdue = loan =>
    activeLoan(loan) &&
    loan.due_date &&
    new Date(loan.due_date).getTime() < Date.now();

  const appName = row =>
    row.full_name ||
    profile(row.user_id)?.full_name ||
    row.staff_id ||
    row.email ||
    'Staff applicant';

  const appEmail = row =>
    row.email ||
    profile(row.user_id)?.email ||
    'Email not provided';

  const appDept = row =>
    row.department ||
    profile(row.user_id)?.department ||
    'Department not provided';

  function appCategories(row) {
    const value = row.resource_categories;

    if (Array.isArray(value)) {
      return value.map(String).filter(Boolean);
    }

    if (typeof value !== 'string') return [];

    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch (_) {}

    return value.replace(/[{}]/g, '')
      .split(',')
      .map(x => x.trim())
      .filter(Boolean);
  }

  async function waitForClient() {
    for (let i = 0; i < 100; i++) {
      if (
        window.supabaseClient?.auth &&
        typeof window.supabaseClient.from === 'function'
      ) {
        return window.supabaseClient;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(
      'Supabase did not initialize. Check the script tags in admin portal/index.html.'
    );
  }

  async function waitForAdminGuard() {
    for (let i = 0; i < 100; i++) {
      if (document.body.classList.contains('admin-authorized')) return;

      if (!document.body.classList.contains('auth-pending')) {
        throw new Error(
          'Admin access was not verified. Sign in with an administrator account.'
        );
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(
      'Administrator verification timed out. Refresh and sign in again.'
    );
  }

  async function verifyAdmin() {
    const { data, error } = await state.db.auth.getUser();

    if (error) throw error;

    if (!data?.user) {
      throw new Error('No administrator session was found.');
    }

    const result = await state.db
      .from('profiles')
      .select('id,full_name,email,department,role')
      .eq('id', data.user.id)
      .maybeSingle();

    if (result.error) throw result.error;

    if (
      !result.data ||
      String(result.data.role).toLowerCase() !== 'admin'
    ) {
      throw new Error(
        'This page is restricted to CampusShare administrators.'
      );
    }

    state.admin = data.user;
    state.profile = result.data;

    const name = $('.admin-identity strong');
    const email = $('.admin-identity small');
    const avatar = $('.admin-identity .avatar');

    if (name) {
      name.textContent =
        result.data.full_name || data.user.email || 'Administrator';
    }

    if (email) {
      email.textContent = data.user.email || 'Administrator';
    }

    if (avatar) {
      avatar.textContent = initials(
        result.data.full_name || data.user.email
      );
    }
  }

  async function readTable(table, configure) {
    let query = state.db.from(table).select('*');

    if (configure) query = configure(query);

    const { data, error } = await query;

    if (error) throw error;

    return Array.isArray(data) ? data : [];
  }

  async function optionalTable(table, configure) {
    try {
      state.errors[table] = '';
      return await readTable(table, configure);
    } catch (error) {
      state.errors[table] = error.message || `Unable to load ${table}`;
      console.warn(`${table}:`, error);
      return [];
    }
  }

  async function loadDashboard() {
    if (state.loading) return;

    state.loading = true;

    try {
      state.errors = {};

      const data = await Promise.all([
        optionalTable('resources', q =>
          q.order('created_at', { ascending: false })
        ),

        optionalTable('categories', q =>
          q.order('category_name', { ascending: true })
        ),

        optionalTable('profiles', q =>
          q.order('created_at', { ascending: false })
        ),

        optionalTable('booking_requests', q =>
          q.order('created_at', { ascending: false })
        ),

        optionalTable('booking_request_items'),

        optionalTable('borrow_records', q =>
          q.order('borrowed_at', { ascending: false })
        ),

        optionalTable('owner_applications', q =>
          q.order('created_at', { ascending: false })
        ),

        optionalTable('incidents'),

        optionalTable('activity_logs', q =>
          q.order('created_at', { ascending: false }).limit(8)
        )
      ]);

      [
        state.resources,
        state.categories,
        state.profiles,
        state.requests,
        state.items,
        state.loans,
        state.owners,
        state.incidents,
        state.activity
      ] = data;

      renderAll();

    } finally {
      state.loading = false;
    }
  }

  function renderMetrics() {
    const total = state.resources.reduce(
      (s, x) => s + Math.max(0, n(x.total_quantity)), 0
    );

    const available = state.resources.reduce(
      (s, x) => s + Math.max(0, n(x.available_quantity)), 0
    );

    const unavailable = Math.max(0, total - available);

    const maintenance = state.resources.filter(x =>
      String(x.status || '').toLowerCase().includes('maintenance')
    ).length;

    const active = state.loans.filter(activeLoan);

    const activeBorrowers = new Set(
      active.map(x => requestForLoan(x)?.student_id).filter(Boolean)
    );

    const pending = state.owners.filter(x =>
      ['pending', 'pending_verification', 'submitted', 'under_review', 'review']
        .includes(String(x.status || '').toLowerCase().replace(/[\s-]+/g, '_'))
    ).length;

    const overdueCount = state.loans.filter(overdue).length;

    const setValue = (selector, value) => {
      const node = $(selector);
      if (node) node.innerHTML = value;
    };

    setValue(
      '#inventoryTotal',
      state.errors.resources
        ? '— <small>unavailable</small>'
        : `${total.toLocaleString()} <small>units</small>`
    );

    setValue(
      '#borrowerTotal',
      state.errors.booking_requests ||
      state.errors.booking_request_items ||
      state.errors.borrow_records ||
      state.errors.profiles
        ? '— <small>unavailable</small>'
        : `${activeBorrowers.size.toLocaleString()} <small>students</small>`
    );

    setValue(
      '#pendingTotal',
      state.errors.owner_applications
        ? '— <small>unavailable</small>'
        : `${pending} <small class="neutral">Awaiting review</small>`
    );

    setValue(
      '#overdueTotal',
      state.errors.borrow_records
        ? '— <small>unavailable</small>'
        : `${overdueCount} <small class="negative">current overdue loans</small>`
    );

    const inventoryCard = $('#inventoryTotal')?.closest('.metric-card');
    const mini = $('.mini-stats', inventoryCard || document);

    if (mini) {
      mini.innerHTML = state.errors.resources
        ? '<span>Inventory data unavailable</span>'
        : `
          <span>● ${available.toLocaleString()} <small>Available</small></span>
          <span>● ${unavailable.toLocaleString()} <small>Unavailable</small></span>
          <span>● ${maintenance} <small>Maintenance listings</small></span>`;
    }

    const borrowerFoot = $('.metric-foot',
      $('#borrowerTotal')?.closest('.metric-card') || document);

    if (borrowerFoot) {
      borrowerFoot.innerHTML =
        `<small>${active.length} outstanding borrow record(s)</small>`;
    }

    const pendingFoot = $('.metric-foot',
      $('#pendingTotal')?.closest('.metric-card') || document);

    if (pendingFoot) {
      pendingFoot.innerHTML =
        `<small>${state.owners.length} total application record(s)</small>`;
    }

    const overdueFoot = $('.metric-foot',
      $('#overdueTotal')?.closest('.metric-card') || document);

    if (overdueFoot) {
      overdueFoot.innerHTML =
        `<small>${state.loans.filter(activeLoan).length} outstanding loan record(s)</small>`;
    }

    const usersCard = $$('.metric-card').find(card =>
      card.textContent.includes('REGISTERED USERS')
    );

    if (usersCard) {
      const value = $('.metric-value', usersCard);

      if (value) {
        value.innerHTML = state.errors.profiles
          ? '— <small>unavailable</small>'
          : `${state.profiles.length} <small>profiles</small>`;
      }

      const p = $('p', usersCard);

      if (p) {
        p.textContent =
          'User profiles currently visible to the administrator.';
      }

      const foot = $('.metric-foot', usersCard);

      if (foot) {
        foot.innerHTML = '<small>Live profiles table</small>';
      }
    }

    const ownerCount = $('#ownerQueueCount');

    if (ownerCount) {
      ownerCount.textContent = `${pending} Pending`;
    }

    const openIncidents = state.incidents.filter(x =>
      !['resolved', 'closed', 'completed'].includes(
        String(x.status || x.incident_status || '').toLowerCase()
      )
    ).length;

    const incidentCount = $('#incidentCount');

    if (incidentCount) {
      incidentCount.textContent =
        `${state.errors.incidents ? '—' : openIncidents} Open`;
    }

    const eyebrow = $('.page-heading .eyebrow');

    if (eyebrow) {
      eyebrow.textContent = 'LIVE CAMPUS OPERATIONS · SUPABASE DATA';
    }

    const rosterSub = $('.roster-panel .panel-heading p');

    if (rosterSub) {
      rosterSub.textContent =
        'Recent active loans and booking requests awaiting approval.';
    }

    const overdueLabel = $('.metric-card.accent-red .metric-head span');

    if (overdueLabel) {
      overdueLabel.textContent = 'OVERDUE LOANS';
    }

    const overdueSub = $('.metric-card.accent-red > p');

    if (overdueSub) {
      overdueSub.textContent =
        'Outstanding borrowing records past their due date.';
    }

    const nodePill = $('.node-pill');

    if (nodePill) {
      nodePill.innerHTML =
        '<span class="live-dot"></span> CampusShare Live Data';
    }

    const footerLabel = $('.page-footer > span:first-child');

    if (footerLabel) {
      footerLabel.textContent =
        'CampusShare Admin Console · Live Database';
    }
  }

  function buildRoster() {
    const rows = [];
    const representedItems = new Set();

    state.loans.filter(activeLoan).forEach(loan => {
      const line = item(loan.request_item_id);
      const req = line ? request(line.request_id) : null;
      const equip = line ? resource(line.resource_id) : null;
      const borrower = req ? profile(req.student_id) : null;

      const due = loan.due_date || req?.due_date || null;
      const isLate = overdue(loan);
      const dueToday =
        due && new Date(due).toDateString() === new Date().toDateString();

      rows.push({
        id: loan.id,
        name: borrower?.full_name || borrower?.email || 'Student profile unavailable',
        email: borrower?.email || '',
        equipment: equip?.name || 'Equipment details unavailable',
        resourceId: equip?.id || '',
        location: equip?.location || 'Location not recorded',
        status: isLate ? 'Overdue' : dueToday ? 'Due Today' : 'Active',
        due,
        date: loan.borrowed_at,
        type: 'loan',
        requestId: req?.id || ''
      });

      if (line?.id) representedItems.add(line.id);
    });

    state.requests.filter(req =>
      ['pending', 'submitted', 'under_review', 'review']
        .includes(String(req.status || '').toLowerCase().replace(/[\s-]+/g, '_'))
    ).forEach(req => {
      state.items.filter(line => line.request_id === req.id).forEach(line => {
        if (representedItems.has(line.id)) return;

        const equip = resource(line.resource_id);
        const borrower = profile(req.student_id);

        rows.push({
          id: req.id,
          name: borrower?.full_name || borrower?.email || 'Student profile unavailable',
          email: borrower?.email || '',
          equipment: equip?.name || 'Equipment details unavailable',
          resourceId: equip?.id || '',
          location: equip?.location || 'Location not recorded',
          status: 'Pending',
          due: req.due_date,
          date: req.request_date || req.created_at,
          type: 'request',
          requestId: req.id
        });
      });
    });

    return rows
      .sort((a, b) =>
        new Date(b.date || 0) - new Date(a.date || 0)
      )
      .slice(0, 8);
  }

  function renderRoster() {
    const body = $('#rosterBody');

    if (!body) return;

    const issue =
      state.errors.booking_requests ||
      state.errors.booking_request_items ||
      state.errors.borrow_records;

    if (issue) {
      body.innerHTML =
        `<tr><td colspan="4" class="empty-state">Booking data unavailable: ${esc(issue)}</td></tr>`;

      if ($('#rosterCount')) {
        $('#rosterCount').textContent = 'Roster unavailable';
      }

      return;
    }

    const rows = buildRoster();

    body.innerHTML = rows.length
      ? rows.map(row => {
          const cls =
            row.status === 'Overdue'
              ? 'overdue'
              : row.status === 'Due Today'
                ? 'due'
                : row.status === 'Pending'
                  ? 'pending'
                  : 'active';

          const dot =
            cls === 'active'
              ? 'green'
              : cls === 'pending'
                ? 'purple'
                : cls === 'due'
                  ? 'amber'
                  : 'red';

          const action = row.type === 'request'
            ? `<button class="action-button" data-action="approve-booking" data-id="${esc(row.requestId)}">Approve</button>`
            : `<button class="action-button ${cls === 'overdue' ? 'danger' : ''}" data-action="check-in" data-id="${esc(row.id)}">Check in</button>`;

          return `
            <tr>
              <td>
                <div class="borrower-cell">
                  <span class="avatar">${esc(initials(row.name))}</span>
                  <span>
                    <strong>${esc(row.name)}</strong>
                    <small>${esc(row.email || 'Student')}</small>
                  </span>
                </div>
              </td>

              <td>
                <div class="equipment-cell">
                  <strong>${esc(row.equipment)}</strong>
                  <small>
                    ${esc(row.location)} ·
                    ${esc(row.resourceId ? `Resource ${row.resourceId.slice(0, 8)}` : 'No resource linked')}
                  </small>
                </div>
              </td>

              <td>
                <span class="table-status ${cls}">
                  <i class="status-dot ${dot}"></i>
                  ${esc(row.status)}
                </span>
                <small class="subline">${esc(dateText(row.date))}</small>
              </td>

              <td>
                <strong class="due-text">
                  ${esc(row.status === 'Pending' ? 'Awaiting approval' : dateText(row.due))}
                </strong>
                <div class="row-action">${action}</div>
              </td>
            </tr>`;
        }).join('')
      : '<tr><td colspan="4" class="empty-state">No borrowing or pending booking records have been created yet.</td></tr>';

    if ($('#rosterCount')) {
      $('#rosterCount').textContent =
        `Showing ${rows.length} current record(s)`;
    }
  }

  function renderOwners() {
    const box = $('#ownerQueue');

    if (!box) return;

    if (state.errors.owner_applications) {
      box.innerHTML =
        `<div class="empty-state">Owner applications unavailable: ${esc(state.errors.owner_applications)}</div>`;
      return;
    }

    const rows = state.owners.filter(row =>
      ['pending', 'pending_verification', 'submitted', 'under_review', 'review']
        .includes(String(row.status || '').toLowerCase().replace(/[\s-]+/g, '_'))
    ).slice(0, 3);

    box.innerHTML = rows.length
      ? rows.map(row => {
          const cats = appCategories(row);

          return `
            <article class="owner-card">
              <div class="owner-card-head">
                <span class="avatar">${esc(initials(appName(row)))}</span>
                <span>
                  <strong>${esc(appName(row))}</strong>
                  <small>${esc(appDept(row))} · ${esc(String(row.id).slice(0, 8))}</small>
                </span>
              </div>

              <p>${esc(row.purpose || 'No purpose statement provided.')}</p>
              <small>${esc(cats.join(', ') || 'No resource categories provided')}</small>

              <div class="owner-actions">
                <button class="approve-btn" data-action="review-owner" data-id="${esc(row.id)}">
                  Review application
                </button>
              </div>
            </article>`;
        }).join('')
      : '<div class="empty-state">No pending owner applications in the database.</div>';
  }

  function incidentField(row, keys, fallback = '') {
    for (const key of keys) {
      if (
        row?.[key] != null &&
        String(row[key]).trim()
      ) {
        return row[key];
      }
    }

    return fallback;
  }

  function renderIncidents() {
    const box = $('#incidentList');

    if (!box) return;

    if (state.errors.incidents) {
      box.innerHTML =
        `<div class="empty-state">Incident data unavailable: ${esc(state.errors.incidents)}</div>`;
      return;
    }

    const rows = state.incidents.filter(row =>
      !['resolved', 'closed', 'completed'].includes(
        String(incidentField(row, ['status', 'incident_status'], '')).toLowerCase()
      )
    ).slice(0, 3);

    box.innerHTML = rows.length
      ? rows.map(row => {
          const title = incidentField(
            row,
            ['title', 'incident_title', 'name', 'category', 'incident_type'],
            'Incident record'
          );

          const description = incidentField(
            row,
            ['description', 'details', 'reported_issue', 'remarks'],
            'No description recorded.'
          );

          const severity = incidentField(
            row,
            ['severity', 'priority'],
            'Not specified'
          );

          const status = incidentField(
            row,
            ['status', 'incident_status'],
            'Open'
          );

          const equipment = resource(
            incidentField(row, ['resource_id', 'equipment_id'], '')
          );

          return `
            <article class="incident-card">
              <div class="incident-card-head">
                <span class="severity">
                  ${esc(severity)} · ${esc(String(row.id).slice(0, 8))}
                </span>
              </div>

              <strong>${esc(equipment?.name || title)}</strong>
              <p>${esc(description)}</p>
              <small>${esc(status)} · ${esc(dateText(incidentField(row, ['created_at', 'reported_at', 'created_on'], null)))}</small>

              <div class="incident-actions">
                <button class="primary" data-action="open-incident" data-id="${esc(row.id)}">Review Case</button>
                <button class="secondary" data-action="resolve-incident" data-id="${esc(row.id)}">Mark Resolved</button>
              </div>
            </article>`;
        }).join('')
      : '<div class="empty-state">No open incident records.</div>';
  }

  function renderCategories() {
    const grid = $('#departmentGrid');

    if (!grid) return;

    if (state.errors.resources) {
      grid.innerHTML =
        `<div class="empty-state">Inventory unavailable: ${esc(state.errors.resources)}</div>`;
      return;
    }

    const title = $('.utilization-panel .panel-heading h2');
    const sub = $('.utilization-panel .panel-heading p');

    if (title) title.textContent = 'Inventory by Equipment Category';

    if (sub) {
      sub.textContent =
        'Equipment counts grouped by categories saved in CampusShare.';
    }

    const groups = new Map();

    state.resources.forEach(row => {
      const key = category(row.category_id);
      const value = groups.get(key) || {
        listings: 0,
        total: 0,
        available: 0
      };

      value.listings++;
      value.total += Math.max(0, n(row.total_quantity));
      value.available += Math.max(0, n(row.available_quantity));

      groups.set(key, value);
    });

    if (!groups.size) {
      grid.innerHTML =
        '<div class="empty-state">No equipment has been added yet. Category totals appear after equipment is saved.</div>';
    } else {
      const max = Math.max(
        1,
        ...[...groups.values()].map(x => x.total)
      );

      grid.innerHTML = [...groups.entries()].map(([key, v]) => {
        const percentage = Math.round(
          v.available / Math.max(1, v.total) * 100
        );

        const width = Math.round(v.total / max * 100);

        return `
          <article class="department-card">
            <div>
              <strong>${esc(key)}</strong>
              <b>${percentage}% <small>available</small></b>
            </div>

            <span class="progress">
              <i style="width:${width}%"></i>
            </span>

            <small>
              ${v.listings} listing(s) · ${v.available} available of ${v.total} total units
            </small>
          </article>`;
      }).join('');
    }

    const chartTitle = $('.chart-heading');

    if (chartTitle) {
      chartTitle.innerHTML =
        '<strong>LIVE INVENTORY BY CATEGORY</strong><span>Calculated from saved resource records</span>';
    }

    if ($('.chart-wrap')) {
      $('.chart-wrap').hidden = true;
    }
  }

  function renderActivity() {
    const list = $('.telemetry-list');

    if (!list) return;

    const title = $('.telemetry-panel .panel-heading h2');
    const sub = $('.telemetry-panel .panel-heading p');
    const tag = $('.telemetry-panel .small-green');

    if (title) title.textContent = 'Recent Account Activity';

    if (sub) {
      sub.textContent =
        'Latest activity log records visible to the administrator.';
    }

    if (tag) tag.textContent = 'From activity_logs';

    if (state.errors.activity_logs) {
      list.innerHTML =
        `<div class="empty-state">Activity logs unavailable: ${esc(state.errors.activity_logs)}</div>`;
      return;
    }

    list.innerHTML = state.activity.length
      ? state.activity.slice(0, 5).map(row => {
          let detail = row.details;

          if (detail && typeof detail === 'object') {
            detail =
              detail.message ||
              detail.description ||
              JSON.stringify(detail);
          }

          const actor = profile(row.user_id);

          return `
            <div>
              <span class="status-dot green"></span>
              <p>
                <strong>${esc(String(row.action || 'Account activity').replace(/[_-]+/g, ' '))}</strong>
                <small>
                  ${esc(actor?.full_name || actor?.email || row.user_id || 'User not identified')}
                  ${detail ? ` · ${esc(detail)}` : ''}
                </small>
              </p>
              <time>${esc(dateText(row.created_at))}</time>
            </div>`;
        }).join('')
      : '<div class="empty-state">No activity log records have been created yet.</div>';
  }

  function renderAll() {
    renderMetrics();
    renderRoster();
    renderOwners();
    renderIncidents();
    renderCategories();
    renderActivity();

    const now = new Date();

    if ($('#snapshotTime')) {
      $('#snapshotTime').textContent = dateText(now.toISOString());
    }

    if ($('#footerTime')) {
      $('#footerTime').textContent =
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  function modal(title, html) {
    if (!$('#modalBackdrop')) return;

    $('#modalTitle').textContent = title;
    $('#modalContent').innerHTML = html;
    $('#modalBackdrop').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if ($('#modalBackdrop')) {
      $('#modalBackdrop').hidden = true;
    }

    if ($('#modalContent')) {
      $('#modalContent').innerHTML = '';
    }

    document.body.style.overflow = '';
  }

  function download(filename, content, type = 'text/csv;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;

    document.body.append(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportReport() {
    const total = state.resources.reduce((s, x) => s + n(x.total_quantity), 0);
    const available = state.resources.reduce((s, x) => s + n(x.available_quantity), 0);
    const loans = state.loans.filter(activeLoan);

    const pending = state.owners.filter(x =>
      ['pending', 'pending_verification', 'submitted', 'under_review', 'review']
        .includes(String(x.status || '').toLowerCase().replace(/[\s-]+/g, '_'))
    );

    const rows = [
      ['Report', 'CampusShare Admin Dashboard'],
      ['Generated at', new Date().toISOString()],
      [],
      ['Metric', 'Value'],
      ['Total inventory units', state.errors.resources ? 'Unavailable' : total],
      ['Available units', state.errors.resources ? 'Unavailable' : available],
      ['Unavailable units', state.errors.resources ? 'Unavailable' : Math.max(0, total - available)],
      ['Registered profiles', state.errors.profiles ? 'Unavailable' : state.profiles.length],
      ['Outstanding borrow records', state.errors.borrow_records ? 'Unavailable' : loans.length],
      ['Pending owner applications', state.errors.owner_applications ? 'Unavailable' : pending.length],
      ['Overdue borrow records', state.errors.borrow_records ? 'Unavailable' : state.loans.filter(overdue).length],
      [],
      [
        'Borrow Record ID',
        'Student',
        'Email',
        'Equipment',
        'Location',
        'Borrowed At',
        'Due Date',
        'Borrowed Qty',
        'Returned Qty',
        'Outstanding Qty',
        'Status'
      ],
      ...loans.map(row => {
        const req = requestForLoan(row);
        const borrower = req ? profile(req.student_id) : null;
        const equipment = resourceForLoan(row);

        return [
          row.id,
          borrower?.full_name || '',
          borrower?.email || '',
          equipment?.name || '',
          equipment?.location || '',
          row.borrowed_at || '',
          row.due_date || '',
          row.quantity_borrowed,
          row.quantity_returned,
          outstanding(row),
          overdue(row) ? 'Overdue' : 'Active'
        ];
      })
    ];

    const quote = value =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;

    download(
      `campusshare-admin-report-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map(row => row.map(quote).join(',')).join('\r\n')
    );

    toast('Live CampusShare report exported.');
  }

  async function approveOwner(id) {
    const row = state.owners.find(x => String(x.id) === String(id));

    if (!row) return;

    if (!confirm(`Approve ${appName(row)} as an equipment owner?`)) return;

    const { error } = await state.db
      .from('owner_applications')
      .update({
        status: 'approved',
        reviewed_by: state.admin.id,
        reviewed_at: new Date().toISOString(),
        reviewer_note: 'Approved by CampusShare administrator.'
      })
      .eq('id', row.id);

    if (error) throw error;

    let warning = '';

    if (row.user_id) {
      const result = await state.db
        .from('profiles')
        .update({ role: 'owner' })
        .eq('id', row.user_id);

      if (result.error) {
        warning =
          ` The application is approved, but role promotion failed: ${result.error.message}`;
      }
    }

    await state.db.from('activity_logs').insert({
      user_id: state.admin.id,
      action: 'owner_application_approved',
      details: {
        application_id: row.id,
        applicant_user_id: row.user_id
      }
    });

    await loadDashboard();

    toast(`Owner application approved.${warning}`, !!warning);
  }

  async function approveBooking(id) {
    if (!confirm('Approve this booking request?')) return;

    const { error } = await state.db
      .from('booking_requests')
      .update({ status: 'approved' })
      .eq('id', id);

    if (error) throw error;

    for (const line of state.items.filter(x => x.request_id === id)) {
      const result = await state.db
        .from('booking_request_items')
        .update({
          item_status: 'approved',
          approved_quantity: line.requested_quantity
        })
        .eq('id', line.id);

      if (result.error) {
        console.warn(
          'Request item update failed:',
          result.error.message
        );
      }
    }

    await loadDashboard();

    toast(
      'Booking request approved. A separate checkout record is created when equipment is handed over.'
    );
  }

  async function checkIn(recordId) {
    const loan = state.loans.find(x => String(x.id) === String(recordId));

    if (!loan || !activeLoan(loan)) return;

    const quantity = outstanding(loan);

    if (!confirm(`Record return of all ${quantity} outstanding unit(s)?`)) return;

    const { error } = await state.db
      .from('borrow_records')
      .update({
        quantity_returned: n(loan.quantity_borrowed),
        returned_at: new Date().toISOString(),
        return_status: 'returned',
        received_by: state.admin.id
      })
      .eq('id', loan.id);

    if (error) throw error;

    const equipment = resourceForLoan(loan);
    let warning = '';

    if (equipment) {
      const newAvailable = Math.min(
        n(equipment.total_quantity),
        n(equipment.available_quantity) + quantity
      );

      const result = await state.db
        .from('resources')
        .update({ available_quantity: newAvailable })
        .eq('id', equipment.id);

      if (result.error) {
        warning =
          ` The return was recorded, but the inventory quantity could not be updated: ${result.error.message}`;
      }
    }

    await loadDashboard();

    toast(`Equipment return recorded.${warning}`, !!warning);
  }

  async function resolveIncident(id) {
    const row = state.incidents.find(x => String(x.id) === String(id));

    if (!row) return;

    const column =
      Object.prototype.hasOwnProperty.call(row, 'status')
        ? 'status'
        : Object.prototype.hasOwnProperty.call(row, 'incident_status')
          ? 'incident_status'
          : null;

    if (!column) {
      return toast(
        'Cannot resolve this incident: no status column was found in its record.',
        true
      );
    }

    if (!confirm('Mark this incident as resolved?')) return;

    const { error } = await state.db
      .from('incidents')
      .update({ [column]: 'resolved' })
      .eq('id', row.id);

    if (error) throw error;

    await loadDashboard();
    toast('Incident marked as resolved.');
  }

  function reviewOwner(id) {
    const row = state.owners.find(x => String(x.id) === String(id));

    if (!row) return;

    const categories = appCategories(row);

    modal('Owner application details', `
      <div class="detail-card">
        <strong>${esc(appName(row))}</strong>
        <p>${esc(appEmail(row))}</p>
        <p>Staff ID: ${esc(row.staff_id || 'Not provided')}</p>
        <p>Department: ${esc(appDept(row))}</p>
        <p>Application ID: ${esc(row.id)}</p>
        <p>Submitted: ${esc(dateText(row.created_at))}</p>
        <p>Status: ${esc(row.status)}</p>
        <p>Requested categories: ${esc(categories.join(', ') || 'Not provided')}</p>
        <p>Purpose: ${esc(row.purpose || 'Not provided')}</p>
        <p>Remarks: ${esc(row.remarks || 'None')}</p>
        <p>Reviewer note: ${esc(row.reviewer_note || 'None')}</p>

        <div class="notice">
          Your owner_applications table has no document attachment columns.
          No certificates are shown or marked verified.
        </div>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-light" data-close-modal>Close</button>

        ${['pending', 'pending_verification', 'submitted', 'under_review', 'review']
          .includes(String(row.status || '').toLowerCase().replace(/[\s-]+/g, '_'))
          ? `<button type="button" class="btn btn-primary" data-action="approve-owner" data-id="${esc(row.id)}">Approve Owner</button>`
          : ''}
      </div>
    `);
  }

  function reviewIncident(id) {
    const row = state.incidents.find(x => String(x.id) === String(id));

    if (!row) return;

    modal('Incident case review', `
      <div class="detail-card">
        <h3>${esc(row.title || row.incident_title || row.name || row.category || row.incident_type || 'Incident record')}</h3>
        <p><strong>Case ID:</strong> ${esc(row.id)}</p>
        <p><strong>Severity:</strong> ${esc(row.severity || row.priority || 'Not recorded')}</p>
        <p><strong>Status:</strong> ${esc(row.status || row.incident_status || 'Not recorded')}</p>
        <p><strong>Created:</strong> ${esc(dateText(row.created_at || row.reported_at))}</p>
        <p>${esc(row.description || row.details || row.reported_issue || row.remarks || 'No description recorded.')}</p>
      </div>

      <div class="modal-actions">
        <button class="btn btn-light" data-close-modal>Close</button>
        <button class="btn btn-primary" data-action="resolve-incident" data-id="${esc(row.id)}">Mark Resolved</button>
      </div>
    `);
  }

  function addEquipmentModal() {
    if (!state.categories.length) {
      return toast(
        'Add a category in the categories table before adding equipment.',
        true
      );
    }

    const options = state.categories.map(row =>
      `<option value="${esc(row.id)}">${esc(row.category_name)}</option>`
    ).join('');

    modal('Add equipment to CampusShare', `
      <form id="equipmentForm">
        <div class="form-grid">

          <div class="form-field full">
            <label for="equipmentName">Equipment name</label>
            <input id="equipmentName" name="name" required maxlength="120">
          </div>

          <div class="form-field full">
            <label for="equipmentDescription">Description</label>
            <textarea id="equipmentDescription" name="description" rows="3"></textarea>
          </div>

          <div class="form-field">
            <label for="equipmentCategory">Category</label>
            <select id="equipmentCategory" name="category_id" required>
              <option value="">Select category</option>
              ${options}
            </select>
          </div>

          <div class="form-field">
            <label for="equipmentQuantity">Total quantity</label>
            <input id="equipmentQuantity" name="total_quantity" type="number" min="1" step="1" value="1" required>
          </div>

          <div class="form-field">
            <label for="equipmentLocation">Location</label>
            <input id="equipmentLocation" name="location" maxlength="160">
          </div>

          <div class="form-field">
            <label for="equipmentCondition">Condition</label>
            <select id="equipmentCondition" name="condition">
              <option value="good">Good</option>
              <option value="new">New</option>
              <option value="fair">Fair</option>
              <option value="needs_inspection">Needs inspection</option>
            </select>
          </div>

        </div>

        <p class="muted-note">
          Newly added units start as available. Asset tag and department are omitted
          because they are not columns in your resources table.
        </p>

        <div class="modal-actions">
          <button type="button" class="btn btn-light" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn-primary">Save to inventory</button>
        </div>
      </form>
    `);
  }

  async function saveEquipment(form) {
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const quantity = Number(data.get('total_quantity'));

    if (!name || !Number.isInteger(quantity) || quantity < 1) {
      return toast('Enter a valid equipment name and quantity.', true);
    }

    const { error } = await state.db
      .from('resources')
      .insert({
        name,
        description: String(data.get('description') || '').trim() || null,
        category_id: String(data.get('category_id') || '') || null,
        total_quantity: quantity,
        available_quantity: quantity,
        owner_id: state.admin.id,
        condition: String(data.get('condition') || 'good'),
        status: 'available',
        location: String(data.get('location') || '').trim() || null,
        created_at: new Date().toISOString()
      });

    if (error) throw error;

    closeModal();
    await loadDashboard();

    toast(`${name} added. Inventory counts updated from Supabase.`);
  }

  function scannerModal() {
    modal('Find a CampusShare record', `
      <form id="scannerForm">
        <div class="form-field full">
          <label for="scanCode">Resource ID, booking ID or borrow record ID</label>
          <input id="scanCode" name="code" required placeholder="Paste the record UUID">
        </div>

        <p class="muted-note">
          Your current schema has no asset-tag column and no camera/RFID integration.
          This searches database record IDs only.
        </p>

        <div class="modal-actions">
          <button type="button" class="btn btn-light" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn-primary">Find record</button>
        </div>
      </form>

      <div id="scanResult"></div>
    `);
  }

  function runScanner(form) {
    const code = String(new FormData(form).get('code') || '')
      .trim().toLowerCase();

    const equipment = state.resources.find(
      x => String(x.id).toLowerCase() === code
    );

    const booking = state.requests.find(
      x => String(x.id).toLowerCase() === code
    );

    const loan = state.loans.find(
      x => String(x.id).toLowerCase() === code
    );

    let html =
      '<div class="scan-result">No matching database record ID was found.</div>';

    if (equipment) {
      html = `
        <div class="scan-result">
          <strong>Equipment found</strong><br>
          ${esc(equipment.name)}<br>
          Total: ${n(equipment.total_quantity)}
          · Available: ${n(equipment.available_quantity)}
        </div>`;
    } else if (booking) {
      html = `
        <div class="scan-result">
          <strong>Booking found</strong><br>
          Status: ${esc(booking.status)}<br>
          Due: ${esc(dateText(booking.due_date))}
        </div>`;
    } else if (loan) {
      html = `
        <div class="scan-result">
          <strong>Borrow record found</strong><br>
          Borrowed: ${n(loan.quantity_borrowed)}
          · Returned: ${n(loan.quantity_returned)}
          · Outstanding: ${outstanding(loan)}
        </div>`;
    }

    if ($('#scanResult')) {
      $('#scanResult').innerHTML = html;
    }
  }

  function bind() {
    $('#openAddEquipment')?.addEventListener('click', addEquipmentModal);
    $('#openScanner')?.addEventListener('click', scannerModal);
    $('#exportReport')?.addEventListener('click', exportReport);
    $('#closeModal')?.addEventListener('click', closeModal);

    $('#modalBackdrop')?.addEventListener('click', e => {
      if (e.target.id === 'modalBackdrop') closeModal();
    });

    document.addEventListener('click', async e => {
      if (e.target.closest('[data-close-modal]')) {
        closeModal();
        return;
      }

      const button = e.target.closest('[data-action]');
      if (!button) return;

      const { action, id } = button.dataset;

      try {
        if (action === 'approve-owner') await approveOwner(id);
        else if (action === 'review-owner') reviewOwner(id);
        else if (action === 'approve-booking') await approveBooking(id);
        else if (action === 'check-in') await checkIn(id);
        else if (action === 'open-incident') reviewIncident(id);
        else if (action === 'resolve-incident') await resolveIncident(id);

      } catch (error) {
        console.error(`CampusShare ${action} failed:`, error);
        toast(error.message || 'Action failed.', true);
      }
    });

    $('#modalContent')?.addEventListener('submit', async e => {
      e.preventDefault();

      try {
        if (e.target.id === 'equipmentForm') {
          await saveEquipment(e.target);
        }

        if (e.target.id === 'scannerForm') {
          runScanner(e.target);
        }

      } catch (error) {
        console.error(error);
        toast(error.message || 'Could not complete action.', true);
      }
    });

    $('#mobileMenu')?.addEventListener('click', () => {
      $('#sidebar')?.classList.toggle('open');
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        $('#globalSearch')?.focus();
      }
    });

    // admin-auth.js already connects #adminLogoutBtn to Supabase sign-out.
  }

  async function init() {
    bind();

    if ($('#snapshotTime')) {
      $('#snapshotTime').textContent = 'Loading…';
    }

    if ($('#rosterBody')) {
      $('#rosterBody').innerHTML =
        '<tr><td colspan="4">Loading live CampusShare records…</td></tr>';
    }

    try {
      for (let i = 0; i < 100; i++) {
        if (
          window.supabaseClient?.auth &&
          typeof window.supabaseClient.from === 'function'
        ) {
          state.db = window.supabaseClient;
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!state.db) {
        throw new Error(
          'Supabase did not initialize. Check admin portal/index.html script tags.'
        );
      }

      let authorized = false;

      for (let i = 0; i < 100; i++) {
        if (document.body.classList.contains('admin-authorized')) {
          authorized = true;
          break;
        }

        if (!document.body.classList.contains('auth-pending')) {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!authorized) {
        throw new Error(
          'Admin access was not verified. Sign in with an administrator account.'
        );
      }

      await verifyAdmin();
      await loadDashboard();

      setInterval(async () => {
        if (document.hidden || state.loading) return;

        try {
          await loadDashboard();
        } catch (error) {
          console.warn('Dashboard refresh failed:', error);
        }
      }, 60000);

    } catch (error) {
      console.error('CampusShare admin dashboard failed:', error);

      if ($('#rosterBody')) {
        $('#rosterBody').innerHTML =
          `<tr><td colspan="4" class="empty-state">${esc(error.message || 'Could not load dashboard data.')}</td></tr>`;
      }

      if ($('#ownerQueue')) {
        $('#ownerQueue').innerHTML =
          `<div class="empty-state">Dashboard unavailable: ${esc(error.message || 'Check admin access and Supabase permissions.')}</div>`;
      }

      toast(error.message || 'Could not load admin dashboard.', true);
    }
  }

  init();
})();
