(() => {
(() => {
  const list = document.getElementById('requestList');
  if (list) {
    let records = [];
    try { records = JSON.parse(localStorage.getItem('campusshareDemoRequests') || '[]'); } catch (_) {}
    const esc = value => String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    records.forEach(record => {
      const start = record.start ? new Date(record.start).toLocaleDateString() : 'Not set';
      const end = record.end ? new Date(record.end).toLocaleDateString() : 'Not set';
      const image = record.image || 'https://placehold.co/240x160/e8eef7/294b78?text=CampusShare';
      const card = document.createElement('article');
      card.className = 'request-card review';
      card.dataset.status = record.status || 'review';
      card.dataset.requestId = record.id || '';
      card.dataset.department = record.department || 'Engineering & Robotics';
      card.dataset.search = `${record.name} ${record.code} ${record.lab} ${record.purpose}`.toLowerCase();
      card.innerHTML = `<div class="card-main"><img class="equipment-thumb" src="${esc(image)}" alt="${esc(record.name)}"><div class="request-info"><div class="request-meta"><span>${esc(record.code)} · ${esc(record.lab)}</span><span class="status status-review">● Pending Approval · Demo</span></div><h2>${esc(record.name)}</h2><div class="request-dates"><span>◷ Requested: <b>${new Date().toLocaleDateString()}</b></span><span>▣ Period: <b>${esc(start)} – ${esc(end)}</b></span></div></div></div><div class="review-note"><span>ⓘ</span><div><strong>Request submitted from your student portal</strong><small>${esc(record.purpose || 'Academic project / coursework')}</small></div><b class="stage-label">Awaiting review</b><div class="progress-track"><span></span></div></div><div class="card-footer-actions"><span class="footer-note">Demo request · Awaiting equipment owner approval.</span><button class="soft-button" type="button" data-action="details">View Details</button><button class="soft-button danger-soft" type="button" data-action="cancel">Cancel Request</button></div>`;
      list.prepend(card);
    });
  }
})();

  const list = document.getElementById('requestList');
  const cards = [...list.querySelectorAll('.request-card')];
  const tabs = [...document.querySelectorAll('.tab')];
  const search = document.getElementById('requestSearch');
  const department = document.getElementById('departmentFilter');
  const emptyState = document.getElementById('emptyState');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalTitle = document.getElementById('modalTitle');
  const modalDescription = document.getElementById('modalDescription');
  const modalBody = document.getElementById('modalBody');
  const modalActions = document.getElementById('modalActions');
  const toast = document.getElementById('toast');
  let activeFilter = 'all';
  let toastTimer;
  let selectedCard = null;

  const statusCounts = () => {
    const visible = cards.filter(card => !card.hidden);
    const counts = {
      all: cards.filter(card => card.dataset.status !== 'completed').length,
      pending: cards.filter(card => card.dataset.status === 'pending').length,
      ready: cards.filter(card => card.dataset.status === 'ready').length,
      review: cards.filter(card => card.dataset.status === 'review').length,
      rejected: cards.filter(card => card.dataset.status === 'rejected').length,
      completed: cards.filter(card => card.dataset.status === 'completed').length
    };
    document.getElementById('activeCount').textContent = cards.filter(c => ['ready','review','pending'].includes(c.dataset.status)).length;
    document.getElementById('readyCount').textContent = counts.ready;
    document.getElementById('reviewCount').textContent = counts.review + counts.pending;
    document.getElementById('resolvedCount').textContent = counts.rejected + counts.completed + 2;
    document.getElementById('tabAll').textContent = counts.all;
    document.getElementById('tabPending').textContent = counts.pending;
    document.getElementById('tabReady').textContent = counts.ready;
    document.getElementById('tabReview').textContent = counts.review;
    document.getElementById('tabRejected').textContent = counts.rejected;
    document.getElementById('tabCompleted').textContent = counts.completed;
    return visible;
  };

  function applyFilters() {
    const term = search.value.trim().toLowerCase();
    const dept = department.value;
    let shown = 0;
    cards.forEach(card => {
      const statusMatch = activeFilter === 'all' || card.dataset.status === activeFilter;
      const departmentMatch = dept === 'all' || card.dataset.department === dept;
      const searchMatch = !term || (card.dataset.search + ' ' + card.innerText).toLowerCase().includes(term);
      card.hidden = !(statusMatch && departmentMatch && searchMatch);
      if (!card.hidden) shown++;
    });
    emptyState.hidden = shown !== 0;
    statusCounts();
  }

  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(item => {
      const selected = item === tab;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-selected', String(selected));
    });
    activeFilter = tab.dataset.filter;
    applyFilters();
  }));
  search.addEventListener('input', applyFilters);
  department.addEventListener('change', applyFilters);
  document.getElementById('resetFilters').addEventListener('click', resetFilters);
  document.getElementById('clearEmptyFilters').addEventListener('click', resetFilters);

  function resetFilters() {
    search.value = '';
    department.value = 'all';
    activeFilter = 'all';
    tabs.forEach(tab => {
      const selected = tab.dataset.filter === 'all';
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
    });
    applyFilters();
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function openModal({title, description, body = '', actions = '<button class="soft-button" data-close="true" type="button">Close</button>', symbol = '▣'}) {
    modalTitle.textContent = title;
    modalDescription.textContent = description;
    modalBody.innerHTML = body;
    modalActions.innerHTML = actions;
    document.getElementById('modalSymbol').textContent = symbol;
    modalBackdrop.hidden = false;
    const firstInput = modalBody.querySelector('input,select,button');
    if (firstInput) firstInput.focus();
    modalActions.querySelectorAll('[data-close="true"]').forEach(btn => btn.addEventListener('click', closeModal));
  }
  function closeModal() { modalBackdrop.hidden = true; selectedCard = null; }
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', event => { if (event.target === modalBackdrop) closeModal(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modalBackdrop.hidden) closeModal(); });

  function requestName(card) { return card.querySelector('h2')?.textContent || 'Equipment request'; }
  function detailsFor(card) {
    const id = card.querySelector('.request-meta > span')?.textContent || 'Campus inventory item';
    const dates = card.querySelector('.request-dates')?.innerText || 'Schedule not available';
    return `<div class="modal-details"><strong>${escapeHTML(requestName(card))}</strong><br>${escapeHTML(id)}<br><br>${escapeHTML(dates).replace(/\n/g,'<br>')}</div>`;
  }
  function escapeHTML(value) { return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }

  list.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const card = button.closest('.request-card');
    if (!card) return;
    selectedCard = card;
    const action = button.dataset.action;
    if (action === 'details') {
      openModal({title:'Reservation details',description:'Review the information associated with this equipment request.',body:detailsFor(card) + '<p><strong>Next step:</strong> Follow the collection instructions shown on this page. Please bring your physical campus ID.</p>',symbol:'ⓘ'});
    } else if (action === 'pass') {
      openModal({title:'QR pickup pass',description:'Demo pickup pass for your approved reservation.',body:`${detailsFor(card)}<div class="qr-placeholder" aria-label="Decorative demo QR code">QR</div><p style="text-align:center"><strong>Pickup pass · CS-REQ-0921</strong><br>Present your physical student ID at the lab desk. This demo code is not scannable.</p>`,actions:'<button class="soft-button" data-close="true" type="button">Close</button><button class="button button-primary" id="savePass" type="button">Save pass</button>',symbol:'▦'});
      document.getElementById('savePass')?.addEventListener('click', () => showToast('Demo pass is displayed; QR generation requires backend integration.'));
    } else if (action === 'edit' || action === 'modify' || action === 'reapply') {
      openModal({title: action === 'edit' ? 'Edit request' : action === 'modify' ? 'Modify reservation dates' : 'Re-apply with modified dates',description:'Update the dates and purpose for this demo request.',body:`${detailsFor(card)}<label class="modal-label" for="newStart">New start date</label><input class="modal-input" id="newStart" type="date" value="2025-06-02"><label class="modal-label" for="newEnd">New end date</label><input class="modal-input" id="newEnd" type="date" value="2025-06-04"><label class="modal-label" for="newPurpose">Academic purpose</label><input class="modal-input" id="newPurpose" type="text" value="Coursework / academic project">`,actions:'<button class="soft-button" data-close="true" type="button">Keep current</button><button class="button button-primary" id="saveRequest" type="button">Save changes</button>',symbol:'✎'});
      document.getElementById('saveRequest')?.addEventListener('click', () => {
        const start = document.getElementById('newStart').value;
        const end = document.getElementById('newEnd').value;
        if (!start || !end || end < start) { showToast('Please select a valid start and end date.'); return; }
        card.dataset.status = 'pending';
        if (card.dataset.requestId) { const all = JSON.parse(localStorage.getItem('campusshareDemoRequests') || '[]'); const rec = all.find(r => r.id === card.dataset.requestId); if (rec) { rec.status = 'pending'; rec.start = start; rec.end = end; rec.purpose = document.getElementById('newPurpose').value; localStorage.setItem('campusshareDemoRequests', JSON.stringify(all)); } }
        const status = card.querySelector('.status');
        if (status) { status.className = 'status status-review'; status.textContent = '● Updated · Pending Review'; }
        const dateLine = card.querySelector('.request-dates');
        if (dateLine) dateLine.lastElementChild.innerHTML = `▣ Period: <b>${new Date(start + 'T00:00:00').toLocaleDateString()} – ${new Date(end + 'T00:00:00').toLocaleDateString()}</b>`;
        closeModal(); applyFilters(); showToast('Request updated in this demo.');
      });
    } else if (action === 'cancel') {
      openModal({title:'Cancel this request?',description:'This will mark the request as cancelled in the local demo.',body:detailsFor(card) + '<p>You can submit a new request later, subject to equipment availability.</p>',actions:'<button class="soft-button" data-close="true" type="button">Keep request</button><button class="button button-primary" id="confirmCancel" type="button">Confirm cancellation</button>',symbol:'!'});
      document.getElementById('confirmCancel')?.addEventListener('click', () => {
        card.dataset.status = 'rejected';
        if (card.dataset.requestId) { const all = JSON.parse(localStorage.getItem('campusshareDemoRequests') || '[]'); const rec = all.find(r => r.id === card.dataset.requestId); if (rec) { rec.status = 'rejected'; localStorage.setItem('campusshareDemoRequests', JSON.stringify(all)); } }
        const status = card.querySelector('.status');
        if (status) { status.className = 'status status-rejected'; status.textContent = '● Cancelled by Student'; }
        closeModal(); applyFilters(); showToast('Request cancelled in this demo.');
      });
    } else if (action === 'dismiss') {
      card.remove();
      closeModalIfOpen();
      applyFilters();
      showToast('Request dismissed from this view.');
    }
  });
  function closeModalIfOpen() { if (!modalBackdrop.hidden) closeModal(); }

  document.getElementById('pickupPolicyBtn').addEventListener('click', () => {
    openModal({title:'Book a lab pickup slot',description:'Choose a collection location and preferred pickup window. This is a frontend demonstration.',body:'<label class="modal-label" for="pickupHub">Distribution hub</label><select id="pickupHub" class="modal-select"><option>Maxwell Hall · EE / Robotics</option><option>Fennel Hall · Physics / Optics</option><option>Turner Hall · Media Arts Cage</option></select><label class="modal-label" for="pickupDate">Pickup date</label><input class="modal-input" id="pickupDate" type="date"><label class="modal-label" for="pickupTime">Preferred time</label><select id="pickupTime" class="modal-select"><option>09:00 AM – 10:00 AM</option><option>10:00 AM – 11:00 AM</option><option>01:00 PM – 02:00 PM</option><option>03:00 PM – 04:00 PM</option></select>',actions:'<button class="soft-button" data-close="true" type="button">Cancel</button><button class="button button-primary" id="confirmSlot" type="button">Request pickup slot</button>',symbol:'◷'});
    document.getElementById('confirmSlot')?.addEventListener('click', () => {
      const date = document.getElementById('pickupDate').value;
      if (!date) { showToast('Please choose a pickup date.'); return; }
      closeModal(); showToast('Pickup slot request saved in this demo.');
    });
  });

  document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', event => {
    if (link.getAttribute('href') !== '#requests') { event.preventDefault(); showToast(`${link.textContent.trim()} page will be connected in the full application.`); }
  }));
  document.querySelectorAll('.role-pill,.notification-button,.profile-button').forEach(button => button.addEventListener('click', () => showToast('This control is a UI placeholder in the frontend demo.')));
  const globalSearch = document.querySelector('.global-search input');
  globalSearch.addEventListener('input', () => { search.value = globalSearch.value; applyFilters(); });
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); search.focus(); }
  });
  statusCounts();
  applyFilters();
})();
