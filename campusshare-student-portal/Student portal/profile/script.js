const modalBackdrop = document.getElementById('modalBackdrop');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalSaveBtn = document.getElementById('modalSaveBtn');
const toast = document.getElementById('toast');
let currentAction = null;
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}
function openModal(title, body, action = null, saveLabel = 'Save changes') {
  modalTitle.textContent = title;
  modalBody.innerHTML = body;
  currentAction = action;
  modalSaveBtn.textContent = saveLabel;
  modalSaveBtn.hidden = !action;
  modalBackdrop.hidden = false;
  const firstInput = modalBody.querySelector('input,textarea,select');
  if (firstInput) firstInput.focus();
}
function closeModal() {
  modalBackdrop.hidden = true;
  modalBody.innerHTML = '';
  currentAction = null;
}
document.getElementById('closeModalBtn').addEventListener('click', closeModal);
document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modalBackdrop.hidden) closeModal(); });
modalSaveBtn.addEventListener('click', () => {
  if (!currentAction) return;
  const result = currentAction();
  if (result !== false) closeModal();
});

document.getElementById('editProfileBtn').addEventListener('click', () => {
  openModal('Edit profile information', `
    <form class="form-grid" id="profileForm">
      <div class="field"><label for="fullName">Full name</label><input id="fullName" value="Alex Chen" required /></div>
      <div class="field"><label for="studentId">Student ID</label><input id="studentId" value="CS-2024-8841" disabled /></div>
      <div class="field full"><label for="degree">Degree / programme</label><input id="degree" value="B.Tech Robotics & Autonomous Systems" required /></div>
      <div class="field"><label for="semester">Semester</label><select id="semester"><option>Semester 6</option><option>Semester 7</option><option>Semester 8</option></select></div>
      <div class="field"><label for="phone">Contact number</label><input id="phone" value="+1 (555) 234-8901" /></div>
      <div class="field full"><label for="campusLocation">Department / lab location</label><input id="campusLocation" value="Robotics Innovation Pavilion, Bay 4C" /></div>
    </form>`, () => {
      const form = document.getElementById('profileForm');
      if (!form.reportValidity()) return false;
      const name = document.getElementById('fullName').value.trim();
      document.querySelector('.name-line h1').textContent = name;
      document.querySelector('.avatar-mini').textContent = name.split(/\s+/).map(v => v[0]).slice(0,2).join('').toUpperCase();
      document.querySelector('.profile-photo span').textContent = name.split(/\s+/).map(v => v[0]).slice(0,2).join('').toUpperCase();
      showToast('Profile updated in this demo session.');
    });
});

document.getElementById('switchViewBtn').addEventListener('click', () => showToast('Custodian view is a separate portal in this prototype.'));
document.getElementById('labManagerBtn').addEventListener('click', () => showToast('Lab Manager portal is not connected in this demo.'));
document.getElementById('userMenuBtn').addEventListener('click', () => showToast('Signed in as Alex Chen · Student account'));
document.querySelector('.notification-icon').addEventListener('click', () => showToast('You are all caught up.'));

document.getElementById('uploadCertificateBtn').addEventListener('click', () => document.getElementById('certificateInput').click());
document.getElementById('certificateInput').addEventListener('change', e => {
  const file = e.target.files && e.target.files[0];
  if (file) showToast(`Selected ${file.name}. Upload requires university verification.`);
  e.target.value = '';
});
document.querySelectorAll('.download-cert').forEach(button => button.addEventListener('click', () => showToast(`Certificate download is not connected: ${button.dataset.cert}.`)));
document.getElementById('bookSessionLink').addEventListener('click', e => { e.preventDefault(); showToast('Safety walk-through booking is not connected yet.'); });
document.getElementById('viewLoanPassBtn').addEventListener('click', () => {
  openModal('Current loan pass', `<p class="modal-message"><strong>Sony FX6 Cinema Kit (Cage + 24-70mm GM)</strong><br>Asset #CAM-FX6-08<br>Due Thursday at 5:00 PM<br><br>This is a demonstration pass only. It is not a scannable checkout credential.</p>`, null);
});
document.getElementById('changeNumberBtn').addEventListener('click', () => {
  openModal('Update SMS number', `<div class="form-grid"><div class="field full"><label for="mobileNumber">Mobile number</label><input id="mobileNumber" type="tel" value="+1 (555) 234-8901" required /></div><p class="modal-message field full">In a live system, the new number must be verified with a one-time code.</p></div>`, () => {
    const value = document.getElementById('mobileNumber').value.trim();
    if (!value) { document.getElementById('mobileNumber').focus(); return false; }
    showToast('Number updated in this demo session; no SMS verification was sent.');
  });
});

document.querySelectorAll('[data-setting]').forEach(input => input.addEventListener('change', () => {
  const label = input.closest('.toggle-row').querySelector('strong').textContent;
  showToast(`${label}: ${input.checked ? 'enabled' : 'disabled'} (demo only)`);
}));

document.querySelectorAll('.revoke-btn').forEach(button => button.addEventListener('click', () => {
  const device = button.dataset.device;
  openModal('Revoke device session', `<p class="modal-message">Are you sure you want to revoke the session for <strong>${device}</strong>? This demo will remove it from the page only; it will not sign out a real device.</p>`, () => {
    button.closest('.device-card').remove();
    showToast(`${device} removed from this demo view.`);
  }, 'Revoke session');
}));

document.getElementById('changePasswordBtn').addEventListener('click', () => {
  openModal('Change Campus password', `<p class="modal-message">CampusShare uses University Shibboleth single sign-on. Password changes must be completed through your university identity provider.</p>`, null);
});
document.getElementById('signOutAllBtn').addEventListener('click', () => {
  openModal('Sign out all workstations', `<p class="modal-message">This would end all active CampusShare sessions. In this prototype, no real sessions are connected. Continue with the demo action?</p>`, () => {
    showToast('Demo action completed. No real sessions were signed out.');
  }, 'Confirm demo action');
});
