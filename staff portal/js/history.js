// Extracted from the original sharespace_equipment_history interface.
// UI Interactive Handlers
  function openAuditDrawer(eqId, userName, userId, inst, date, duration, status, postCond, hash) {
    const backdrop = document.getElementById('audit-drawer-backdrop');
    const panel = document.getElementById('audit-drawer-panel');

    // Populate drawer with dynamic context
    document.getElementById('drawer-equipment-title').innerText = eqId.includes('MS') ? 'Orbitrap Exploris 480' : 
                                                                eqId.includes('MIC') ? 'Zeiss LSM 980 Confocal' :
                                                                eqId.includes('CYT') ? 'BD FACSAria III Sorter' :
                                                                eqId.includes('GEN') ? 'Illumina NovaSeq 6000' : 'Beckman Ultracentrifuge';
    document.getElementById('drawer-eq-id').innerText = eqId;
    document.getElementById('drawer-hash').innerText = hash || 'TX-89240-E48';
    document.getElementById('drawer-user-name').innerText = userName;
    document.getElementById('drawer-user-meta').innerText = `${userId} • ${inst}`;
    document.getElementById('drawer-user-initials').innerText = userName.split(' ').map(n => n[0]).join('').replace('D', 'D.').slice(0, 2);

    backdrop.classList.remove('opacity-0', 'pointer-events-none');
    backdrop.classList.add('opacity-100');
    panel.classList.remove('translate-x-full');
    panel.classList.add('translate-x-0');
  }

  function closeAuditDrawer() {
    const backdrop = document.getElementById('audit-drawer-backdrop');
    const panel = document.getElementById('audit-drawer-panel');

    backdrop.classList.add('opacity-0', 'pointer-events-none');
    backdrop.classList.remove('opacity-100');
    panel.classList.add('translate-x-full');
    panel.classList.remove('translate-x-0');
  }

  function showToast(message) {
    const toast = document.getElementById('toast-notification');
    const toastText = document.getElementById('toast-text');
    toastText.innerText = message;

    toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
      toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
      toast.classList.remove('translate-y-0', 'opacity-100');
    }, 3800);
  }

  // Quick Export Hooks
  document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    showToast('Compiling 1,482 activity records into CSV/Excel format. Download starting...');
  });

  document.getElementById('btn-export-pdf')?.addEventListener('click', () => {
    showToast('Compiling Facility Compliance Report (PDF) with cryptographic signatures...');
  });

  // Search input mock filter trigger
  const searchInput = document.getElementById('global-search-input');
  searchInput?.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      showToast(`Filtered ledger by query: "${searchInput.value}"`);
    }
  });

  // Filter Reset Hook
  document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
    document.getElementById('filter-category').selectedIndex = 0;
    document.getElementById('filter-status').selectedIndex = 0;
    document.getElementById('filter-equipment').selectedIndex = 0;
    document.getElementById('filter-institution').selectedIndex = 0;
    searchInput.value = '';
    showToast('Filters reset to default view.');
  });
