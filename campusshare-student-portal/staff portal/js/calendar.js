// Extracted from the original sharespace_equipment_calendar interface.
(function() {
    // Interactivity: date cell click feedback and basic pill toggle states
    const dateCells = document.querySelectorAll('.grid-cols-7 > div');
    dateCells.forEach(cell => {
      cell.addEventListener('click', function() {
        if (cell.classList.contains('opacity-50')) return;
        dateCells.forEach(c => c.classList.remove('ring-2', 'ring-primary'));
        if (!cell.classList.contains('shadow-md')) {
          cell.classList.add('ring-2', 'ring-primary');
        }
      });
    });

    // Quick Accept / Decline Micro-actions
    const actionButtons = document.querySelectorAll('button');
    actionButtons.forEach(btn => {
      if (btn.textContent.trim() === 'Accept') {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const card = btn.closest('.bg-amber-50\\/60');
          if (card) {
            btn.textContent = 'Approved';
            btn.disabled = true;
            btn.classList.remove('bg-primary');
            btn.classList.add('bg-blue-600', 'text-white');
            const declineBtn = card.querySelector('button.bg-error');
            if (declineBtn) declineBtn.style.display = 'none';
          }
        });
      }
      if (btn.textContent.trim() === 'Decline') {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const card = btn.closest('.bg-amber-50\\/60');
          if (card) {
            btn.textContent = 'Declined';
            btn.disabled = true;
            const acceptBtn = card.querySelector('button.bg-primary');
            if (acceptBtn) acceptBtn.style.display = 'none';
          }
        });
      }
    });
  })();
