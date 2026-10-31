// Extracted from the original sharespace_owner_dashboard interface.
// Toast Utility
  function showToast(title, message, isError = false) {
    const toast = document.getElementById('toast-notification');
    const toastTitle = document.getElementById('toast-title');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    toastTitle.textContent = title;
    toastMessage.textContent = message;

    if (isError) {
      toastIcon.textContent = 'error';
      toastIcon.className = 'material-symbols-outlined text-error';
    } else {
      toastIcon.textContent = 'check_circle';
      toastIcon.className = 'material-symbols-outlined text-primary-fixed';
    }

    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3500);
  }

  // Filter Tabs Micro-Interaction
  function filterRequests(filter, btn) {
    const tabs = document.querySelectorAll('.filter-btn');
    tabs.forEach(t => {
      t.classList.remove('bg-surface-container-lowest', 'shadow-sm', 'text-primary');
      t.classList.add('text-on-surface-variant');
    });
    btn.classList.add('bg-surface-container-lowest', 'shadow-sm', 'text-primary');
    btn.classList.remove('text-on-surface-variant');

    const items = document.querySelectorAll('.request-item');
    items.forEach(item => {
      if (filter === 'all') {
        item.style.display = 'flex';
      } else if (filter === 'urgent') {
        item.style.display = item.classList.contains('urgent') ? 'flex' : 'none';
      } else if (filter === 'expiring') {
        item.style.display = item.classList.contains('expiring') ? 'flex' : 'none';
      }
    });
  }

  // Action feedback
  function confirmAction(btn, actionName) {
    const parentItem = btn.closest('.request-item');
    if (parentItem) {
      parentItem.style.opacity = '0.5';
      parentItem.style.pointerEvents = 'none';
      showToast('Booking ' + actionName, 'Updated reservation successfully in system queue.');
    }
  }

  // Reject Modal Handler
  let currentRejectItem = null;
  function openRejectModal(userName, equipmentName) {
    document.getElementById('reject-modal-desc').textContent = 
      'Please specify a formal reason for declining ' + userName + '\'s request for ' + equipmentName + '.';
    document.getElementById('reject-modal').classList.remove('hidden');
  }

  function closeRejectModal() {
    document.getElementById('reject-modal').classList.add('hidden');
  }

  function confirmRejection() {
    closeRejectModal();
    showToast('Request Rejected', 'Formal cancellation notice sent to investigator.', true);
  }

  // Toggle Equipment Listing
  function toggleEquipmentStatus(input, equipmentName) {
    const label = input.closest('div').querySelector('.toggle-label');
    if (input.checked) {
      label.textContent = 'Listed';
      label.className = 'font-label-sm text-label-sm text-primary font-semibold toggle-label';
      showToast('Status Updated', equipmentName + ' is now open for reservations.');
    } else {
      label.textContent = 'Paused';
      label.className = 'font-label-sm text-label-sm text-on-surface-variant font-semibold toggle-label';
      showToast('Status Paused', equipmentName + ' is currently paused for reservations.', true);
    }
  }

  // Add Equipment Form
  function handleEquipmentSubmit(e) {
    e.preventDefault();
    document.getElementById('add-equipment-modal').classList.add('hidden');
    showToast('Equipment Registered', 'New instrument successfully cataloged and available in dashboard.');
    e.target.reset();
  }
