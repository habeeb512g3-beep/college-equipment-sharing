// Extracted from the original sharespace_my_equipment_management interface.
(function initEquipmentManagement() {
      // Elements
      const openModalBtn = document.getElementById('openAddModalBtn');
      const closeModalBtn = document.getElementById('closeAddModalBtn');
      const cancelModalBtn = document.getElementById('cancelModalBtn');
      const modal = document.getElementById('addEquipmentModal');
      const modalOverlay = document.getElementById('modalOverlay');
      const publishBtn = document.getElementById('publishEquipmentBtn');

      const gridToggleBtn = document.getElementById('gridToggleBtn');
      const tableToggleBtn = document.getElementById('tableToggleBtn');
      const gridContainer = document.getElementById('equipmentGridContainer');
      const tableContainer = document.getElementById('equipmentTableContainer');

      const searchInput = document.getElementById('equipmentSearchInput');
      const categoryFilter = document.getElementById('categoryFilter');
      const statusFilter = document.getElementById('statusFilter');
      const locationFilter = document.getElementById('locationFilter');
      const emptyState = document.getElementById('emptySearchState');
      const visibleCount = document.getElementById('visibleCount');

      const exportBtn = document.getElementById('exportDropdownBtn');
      const exportMenu = document.getElementById('exportMenuDropdown');

      // Dropdown export toggle
      if (exportBtn && exportMenu) {
        exportBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          exportMenu.classList.toggle('hidden');
        });
        document.addEventListener('click', () => {
          if (!exportMenu.classList.contains('hidden')) {
            exportMenu.classList.add('hidden');
          }
        });
      }

      // Modal Triggers
      function openModal() {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      }
      function closeModal() {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
      }

      if (openModalBtn) openModalBtn.addEventListener('click', openModal);
      if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
      if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
      if (modalOverlay) modalOverlay.addEventListener('click', closeModal);

      if (publishBtn) {
        publishBtn.addEventListener('click', () => {
          publishBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">refresh</span> Publishing...';
          setTimeout(() => {
            publishBtn.innerHTML = 'Save &amp; Publish Equipment';
            closeModal();
          }, 800);
        });
      }

      // View Toggle
      if (gridToggleBtn && tableToggleBtn) {
        gridToggleBtn.addEventListener('click', () => {
          gridContainer.classList.remove('hidden');
          tableContainer.classList.add('hidden');
          gridToggleBtn.classList.add('bg-surface-container-lowest', 'text-primary', 'shadow-sm');
          gridToggleBtn.classList.remove('text-outline');
          tableToggleBtn.classList.remove('bg-surface-container-lowest', 'text-primary', 'shadow-sm');
          tableToggleBtn.classList.add('text-outline');
        });

        tableToggleBtn.addEventListener('click', () => {
          gridContainer.classList.add('hidden');
          tableContainer.classList.remove('hidden');
          tableToggleBtn.classList.add('bg-surface-container-lowest', 'text-primary', 'shadow-sm');
          tableToggleBtn.classList.remove('text-outline');
          gridToggleBtn.classList.remove('bg-surface-container-lowest', 'text-primary', 'shadow-sm');
          gridToggleBtn.classList.add('text-outline');
        });
      }

      // Filter & Search Engine
      window.filterEquipmentCards = function() {
        const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
        const cat = categoryFilter ? categoryFilter.value : 'all';
        const stat = statusFilter ? statusFilter.value : 'all';
        const cards = document.querySelectorAll('.equipment-card');
        let matched = 0;

        cards.forEach((card) => {
          const cardName = (card.getAttribute('data-name') || '').toLowerCase();
          const cardId = (card.getAttribute('data-id') || '').toLowerCase();
          const cardRoom = (card.getAttribute('data-room') || '').toLowerCase();
          const cardCat = card.getAttribute('data-category');
          const cardStatus = card.getAttribute('data-status');

          const matchesQuery = !query || cardName.includes(query) || cardId.includes(query) || cardRoom.includes(query);
          const matchesCat = (cat === 'all') || (cardCat === cat);
          const matchesStatus = (stat === 'all') || (cardStatus === stat);

          if (matchesQuery && matchesCat && matchesStatus) {
            card.style.display = 'flex';
            matched++;
          } else {
            card.style.display = 'none';
          }
        });

        if (visibleCount) {
          visibleCount.textContent = matched === 0 ? '0' : `1-${matched}`;
        }

        if (emptyState) {
          if (matched === 0) {
            emptyState.classList.remove('hidden');
            emptyState.classList.add('flex');
            gridContainer.classList.add('hidden');
          } else {
            emptyState.classList.add('hidden');
            emptyState.classList.remove('flex');
            if (gridToggleBtn && gridToggleBtn.classList.contains('text-primary')) {
              gridContainer.classList.remove('hidden');
            }
          }
        }
      };

      if (searchInput) searchInput.addEventListener('input', window.filterEquipmentCards);
      if (categoryFilter) categoryFilter.addEventListener('change', window.filterEquipmentCards);
      if (statusFilter) statusFilter.addEventListener('change', window.filterEquipmentCards);
      if (locationFilter) locationFilter.addEventListener('change', window.filterEquipmentCards);

      const clearFiltersBtn = document.getElementById('clearFiltersBtn');
      if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
          if (searchInput) searchInput.value = '';
          if (categoryFilter) categoryFilter.value = 'all';
          if (statusFilter) statusFilter.value = 'all';
          if (locationFilter) locationFilter.value = 'all';
          window.filterEquipmentCards();
        });
      }

      // Drag and drop photo preview simulator
      const photoFileInput = document.getElementById('photoFileInput');
      const dropZonePrompt = document.getElementById('dropZonePrompt');
      const photoPreviewZone = document.getElementById('photoPreviewZone');
      const removePhotoBtn = document.getElementById('removePhotoBtn');
      const previewFileName = document.getElementById('previewFileName');

      if (photoFileInput && photoPreviewZone && dropZonePrompt) {
        photoFileInput.addEventListener('change', (e) => {
          if (e.target.files && e.target.files[0]) {
            previewFileName.textContent = e.target.files[0].name;
            dropZonePrompt.classList.add('hidden');
            photoPreviewZone.classList.remove('hidden');
          }
        });
      }

      if (removePhotoBtn) {
        removePhotoBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (photoFileInput) photoFileInput.value = '';
          dropZonePrompt.classList.remove('hidden');
          photoPreviewZone.classList.add('hidden');
        });
      }
    })();
