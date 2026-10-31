// Extracted from the original sharespace_booking_requests_return_completion_workflow interface.
let activeFilter = 'all';

  function toggleDetails(id, btn) {
    const el = document.getElementById(id);
    if (!el) return;
    const isHidden = el.classList.contains('hidden');
    el.classList.toggle('hidden');
    btn.textContent = isHidden ? 'Hide details' : 'View details';
  }

  function switchTab(btn, category) {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('bg-surface-container-lowest', 'text-on-surface', 'shadow-xs');
      b.classList.add('text-on-surface-variant');
    });
    btn.classList.add('bg-surface-container-lowest', 'text-on-surface', 'shadow-xs');
    btn.classList.remove('text-on-surface-variant');
    
    activeFilter = category;
    applyFilters();
  }

  function filterByTab(category) {
    const tabMap = {
      'all': 0,
      'pending': 1,
      'approved': 2,
      'waitlist': 3,
      'rejected': 4
    };
    const tabButtons = document.querySelectorAll('.tab-btn');
    if (tabButtons[tabMap[category]]) {
      switchTab(tabButtons[tabMap[category]], category);
    }
  }

  function handleSearch(query) {
    applyFilters();
  }

  function applyFilters() {
    const query = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const cards = document.querySelectorAll('.request-card');

    cards.forEach(card => {
      const category = card.getAttribute('data-category');
      const searchData = (card.getAttribute('data-search') || '').toLowerCase();
      
      const matchesCategory = (activeFilter === 'all') || (category === activeFilter);
      const matchesSearch = !query || searchData.includes(query);

      if (matchesCategory && matchesSearch) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }

  function updateBatchCounter() {
    const checkboxes = document.querySelectorAll('.batch-checkbox:checked');
    const batchBar = document.getElementById('batchBar');
    const countSpan = document.getElementById('selectedCount');

    if (checkboxes.length > 0) {
      batchBar.classList.remove('hidden');
      batchBar.classList.add('flex');
      countSpan.textContent = checkboxes.length;
    } else {
      batchBar.classList.add('hidden');
      batchBar.classList.remove('flex');
    }
  }

  function clearBatchSelection() {
    document.querySelectorAll('.batch-checkbox').forEach(cb => cb.checked = false);
    updateBatchCounter();
  }

  function handleBatchAccept() {
    const count = document.querySelectorAll('.batch-checkbox:checked').length;
    showToast(`Successfully accepted & generated passes for ${count} researchers.`);
    clearBatchSelection();
  }

  function openBatchRejectModal() {
    openRejectModal('Selected Batch Users', 'Multiple Instruments', 'Batch Execution');
  }

  // Direct Card Actions
  function approveDirect(btn, name) {
    const card = btn.closest('.request-card');
    card.setAttribute('data-category', 'approved');
    btn.innerHTML = `<span class="material-symbols-outlined text-[16px]">check</span><span>Approved</span>`;
    btn.classList.remove('bg-primary');
    btn.classList.add('bg-emerald-600', 'cursor-default');
    showToast(`Access granted to ${name}. Electronic credentials dispatched.`);
  }

  function promoteToApproved(btn, name) {
    const card = btn.closest('.request-card');
    card.setAttribute('data-category', 'approved');
    showToast(`${name} promoted to Active Approved slot.`);
  }

  function removeFromWaitlist(btn) {
    const card = btn.closest('.request-card');
    card.remove();
    showToast('Reservation removed from standby queue.');
  }

  function downloadCheckinSlip(name, id) {
    showToast(`Generated verifiable check-in slip for ${name} (${id}).`);
  }

  function revokeAccess(btn) {
    if (confirm('Are you sure you want to revoke active laboratory clearance for this booking?')) {
      const card = btn.closest('.request-card');
      card.setAttribute('data-category', 'rejected');
      showToast('Electronic access pass revoked immediately.');
    }
  }

  function reopenReview(btn, name) {
    const card = btn.closest('.request-card');
    card.setAttribute('data-category', 'pending');
    showToast(`Review status reopened for ${name}.`);
  }

  function contactResearcher(name, email) {
    showToast(`Opened encrypted communication channel with ${name}.`);
  }

  // Rejection Modal
  let activeRejectTarget = null;
  function openRejectModal(userName, eqId, eqName) {
    activeRejectTarget = userName;
    document.getElementById('modalTargetUser').textContent = `Applicant: ${userName} • Instrument: ${eqName}`;
    document.getElementById('rejectionReasonInput').value = '';
    const modal = document.getElementById('rejectionModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeRejectModal() {
    const modal = document.getElementById('rejectionModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  function insertReason(txt) {
    document.getElementById('rejectionReasonInput').value = txt;
  }

  function confirmRejectAction() {
    const reason = document.getElementById('rejectionReasonInput').value;
    if (!reason.trim()) {
      alert('Please enter or select a specific reason for rejection.');
      return;
    }
    closeRejectModal();
    showToast(`Request rejected for ${activeRejectTarget || 'User'}. Compliance audit logged.`);
  }

  // Waitlist Modal
  let activeWaitlistTarget = null;
  function openWaitlistModal(userName, eqName, position) {
    activeWaitlistTarget = userName;
    document.getElementById('waitlistTargetUser').textContent = `Applicant: ${userName}`;
    document.getElementById('waitlistEquipmentName').textContent = eqName;
    document.getElementById('waitlistQueuePos').textContent = `Position #${position}`;
    const modal = document.getElementById('waitlistModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeWaitlistModal() {
    const modal = document.getElementById('waitlistModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  function confirmWaitlistAction() {
    closeWaitlistModal();
    showToast(`${activeWaitlistTarget} successfully placed into Queue.`);
  }

  // Toast System
  function showToast(message) {
    const toast = document.getElementById('toastNotification');
    const toastText = document.getElementById('toastText');
    if (!toast || !toastText) return;
    
    toastText.textContent = message;
    toast.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
      toast.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
      toast.classList.remove('translate-y-0', 'opacity-100');
    }, 3800);
  }
