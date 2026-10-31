(() => {
  const $ = (selector) => document.querySelector(selector);
  const backdrop = $('#modalBackdrop');
  const modalTitle = $('#modalTitle');
  const modalText = $('#modalText');
  const modalIcon = $('#modalIcon');
  const modalExtra = $('#modalExtra');
  const modalConfirm = $('#modalConfirm');
  const toast = $('#toast');
  let currentAction = null;
  let toastTimer;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function openModal({ title, text, icon = '✓', confirm = 'Confirm', content = '', action }) {
    modalTitle.textContent = title;
    modalText.textContent = text;
    modalIcon.textContent = icon;
    modalConfirm.textContent = confirm;
    modalExtra.innerHTML = content;
    currentAction = action;
    backdrop.hidden = false;
    modalConfirm.focus();
  }

  function closeModal() {
    backdrop.hidden = true;
    currentAction = null;
    modalExtra.innerHTML = '';
  }

  $('#modalClose').addEventListener('click', closeModal);
  $('#modalCancel').addEventListener('click', closeModal);
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) closeModal(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !backdrop.hidden) closeModal(); });
  modalConfirm.addEventListener('click', () => {
    if (typeof currentAction === 'function') currentAction();
    closeModal();
  });

  $('#extensionBtn').addEventListener('click', () => openModal({
    title: 'Request a 4-hour time extension',
    text: 'Send an extension request to the lab custodian. Approval depends on equipment availability and the lab schedule.',
    icon: '◷', confirm: 'Submit request',
    content: '<label for="extensionReason">Reason for extension</label><textarea id="extensionReason" placeholder="Briefly explain why you need more time..."></textarea>',
    action: () => {
      const reason = $('#extensionReason')?.value.trim();
      if (!reason) { showToast('Please enter a reason before submitting.'); return; }
      showToast('Extension request submitted for custodian review.');
    }
  }));

  $('#qrBtn').addEventListener('click', () => openModal({
    title: 'Check-in QR pass',
    text: 'Present this demo pass to the lab custodian at Science Complex — Room 204 when returning the calculator.',
    icon: '▦', confirm: 'Done',
    content: '<div class="qr-demo" aria-label="Demo QR code"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div><p style="text-align:center;font-size:10px;color:#60738c;margin:9px 0 0">PASS ID: CS-MAT-0012 · DEMO ONLY</p>',
    action: () => showToast('Check-in pass closed.')
  }));

  $('#issueBtn').addEventListener('click', () => openModal({
    title: 'Report an equipment issue',
    text: 'Describe any damage, missing accessory or technical fault. The report will be attached to this loan in the demo.',
    icon: '⚑', confirm: 'Submit report',
    content: '<label for="issueType">Issue type</label><select id="issueType"><option>Technical issue</option><option>Physical damage</option><option>Missing accessory</option><option>Other</option></select><label for="issueDescription">Description</label><textarea id="issueDescription" placeholder="Describe what happened..."></textarea>',
    action: () => {
      const description = $('#issueDescription')?.value.trim();
      if (!description) { showToast('Please describe the issue before submitting.'); return; }
      showToast('Issue report recorded in this demo.');
    }
  }));

  $('#viewDropoff').addEventListener('click', () => {
    $('#dropoffDetails').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('#dropoffDetails').classList.add('attention');
    setTimeout(() => $('#dropoffDetails').classList.remove('attention'), 1400);
  });

  $('#contactBtn').addEventListener('click', () => openModal({
    title: 'Contact your lab custodian',
    text: 'Dr. Angela Cooper · Assigned Lab & Faculty Custodian',
    icon: '✉', confirm: 'Close',
    content: '<div style="padding:12px;background:#f3f7fd;border-radius:8px;font-size:12px;color:#31547e">Email: <b>angela.cooper@campus.edu</b><br><br>Location: Science Complex, Room 204</div>',
    action: () => {}
  }));

  $('#mapBtn').addEventListener('click', () => showToast('Campus map is not connected in this frontend demo.'));
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (link.getAttribute('href') !== '#borrowed') {
        event.preventDefault();
        showToast(`${link.textContent.trim()} page is not included in this demo.`);
      }
    });
  });
  document.querySelector('.browse-cta a').addEventListener('click', (event) => {
    event.preventDefault();
    showToast('Browse Equipment page can be connected through your app navigation.');
  });
  $('.profile-button').addEventListener('click', () => showToast('Profile menu is a frontend placeholder.'));
  $('.notification-button').addEventListener('click', () => showToast('You are all caught up.'));

  // The sample loan is due on 1 November 2026 at 5:00 PM local time.
  const dueAt = new Date(2026, 10, 1, 17, 0, 0);
  function updateCountdown() {
    const remaining = dueAt.getTime() - Date.now();
    const display = $('#countdown');
    if (remaining <= 0) {
      display.textContent = 'Return due · Please check in';
      display.style.color = '#b54747';
      display.style.background = '#fff0f0';
      return;
    }
    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    display.textContent = `◷ ${days}d ${hours}h : ${minutes}m remaining`;
  }
  updateCountdown();
  setInterval(updateCountdown, 60000);
})();
