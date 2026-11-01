'use strict';

const STORAGE_KEY = 'campusshare_admin_incidents_v1';
const seedIncidents = [
  {
    id: 'INC-402', equipment: 'Sony FX3 Cinema Rig', asset: 'CAM-FX3-0821', category: 'Equipment damage',
    borrower: 'Marcus Vance', borrowerEmail: 'm.vance@campus.edu', reporter: 'Dr. Marcus Vance',
    severity: 'Critical', status: 'In Investigation', date: 'Oct 31, 2026', location: 'Media Arts Lab · Studio 2',
    description: 'The camera rig was returned with a damaged lens mount and a missing battery plate. The custodian isolated the kit and documented the damage during inspection.',
    impact: 'Camera rig unavailable pending technical inspection.', hold: 1200,
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80',
    log: ['Incident opened by Media Arts Lab', 'Equipment moved to inspection storage']
  },
  {
    id: 'INC-405', equipment: 'Formlabs Form 4 SLA 3D Printer', asset: 'FAB-PRN-004', category: 'Missing accessory',
    borrower: 'Elena Rostova, MFA', borrowerEmail: 'e.rostova@campus.edu', reporter: 'Elena Rostova',
    severity: 'High', status: 'Open', date: 'Oct 30, 2026', location: 'Makerspace · Bay 2',
    description: 'The resin tank cover was not present at the end of the scheduled loan. The borrower and lab custodian have been asked to confirm the accessory checklist.',
    impact: 'Printer access restricted until the accessory inventory is reconciled.', hold: 850,
    image: 'https://images.unsplash.com/photo-1631556097152-c39479bbfffd?auto=format&fit=crop&w=900&q=80',
    log: ['Accessory discrepancy recorded', 'Borrower clarification requested']
  },
  {
    id: 'INC-408', equipment: 'Ultimaker S5 3D Printer', asset: 'FAB-ULT-030', category: 'Late return',
    borrower: 'Tarja A. Mensah', borrowerEmail: 't.mensah@campus.edu', reporter: 'Tarja A. Mensah',
    severity: 'Moderate', status: 'In Investigation', date: 'Oct 29, 2026', location: 'Innovation Hub · Room 04',
    description: 'The equipment was returned after the agreed time. Staff are checking whether the delay affected the next approved reservation.',
    impact: 'Next reservation was moved to an available time slot.', hold: 500,
    image: 'https://images.unsplash.com/photo-1612528443702-f6741f70a049?auto=format&fit=crop&w=900&q=80',
    log: ['Late return flagged automatically in demo data']
  },
  {
    id: 'INC-410', equipment: 'DJI RS 3 Pro Gimbal Kit', asset: 'CAM-GMB-221', category: 'Policy violation',
    borrower: 'Sarah Chen', borrowerEmail: 's.chen@campus.edu', reporter: 'Sarah Chen',
    severity: 'Minor', status: 'Resolved', date: 'Oct 27, 2026', location: 'Media Arts Lab · Checkout Desk',
    description: 'The kit was used outside the declared project location. The borrower completed the required clarification and the custodian confirmed that the equipment was returned in acceptable condition.',
    impact: 'No physical damage reported; reminder issued.', hold: 0,
    image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=900&q=80',
    log: ['Borrower explanation received', 'Case closed by Admin Supervisor']
  },
  {
    id: 'INC-412', equipment: 'Fluke TiB 10 Pro Thermal Camera', asset: 'INS-THM-010', category: 'Equipment damage',
    borrower: 'Devon Bradley', borrowerEmail: 'd.bradley@campus.edu', reporter: 'Devon Bradley',
    severity: 'High', status: 'Escalated', date: 'Oct 25, 2026', location: 'Physics Lab · Rack B',
    description: 'The thermal camera display shows intermittent lines. The owner has requested a technical assessment before the equipment is made available again.',
    impact: 'Equipment is unavailable until the diagnostic report is received.', hold: 850,
    image: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=900&q=80',
    log: ['Technical assessment requested', 'Case escalated to laboratory supervisor']
  }
];

let incidents = loadIncidents();
let selectedId = incidents[0]?.id || null;
let toastTimer;

function loadIncidents() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : seedIncidents.map(item => ({ ...item, log: [...item.log] }));
  } catch (error) {
    console.warn('Could not read demo incident data:', error);
    return seedIncidents.map(item => ({ ...item, log: [...item.log] }));
  }
}
function saveIncidents() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(incidents)); }
  catch (error) { showToast('Unable to save changes in this browser.'); }
}
function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function severityClass(value) { return String(value || '').toLowerCase(); }
function statusClass(value) { return value === 'In Investigation' ? 'investigation' : String(value || '').toLowerCase(); }
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}
function getFilteredIncidents() {
  const query = (document.getElementById('globalSearch').value || '').trim().toLowerCase();
  const severity = document.getElementById('severityFilter').value;
  const category = document.getElementById('categoryFilter').value;
  const status = document.getElementById('statusFilter').value;
  return incidents.filter(item => {
    const haystack = [item.id, item.equipment, item.asset, item.borrower, item.borrowerEmail, item.reporter, item.location, item.description].join(' ').toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesSeverity = severity === 'all' || item.severity === severity;
    const matchesCategory = category === 'all' || item.category === category;
    const matchesStatus = status === 'all' || item.status === status || (status === 'active' && item.status !== 'Resolved');
    return matchesQuery && matchesSeverity && matchesCategory && matchesStatus;
  });
}
function renderMetrics() {
  const active = incidents.filter(item => item.status !== 'Resolved');
  const critical = active.filter(item => item.severity === 'Critical').length;
  const investigating = incidents.filter(item => item.status === 'In Investigation').length;
  const resolved = incidents.filter(item => item.status === 'Resolved').length;
  const hold = active.reduce((sum, item) => sum + (Number(item.hold) || 0), 0);
  document.getElementById('openCount').textContent = active.length;
  document.getElementById('criticalCount').textContent = critical;
  document.getElementById('investigationCount').textContent = investigating;
  document.getElementById('resolvedCount').textContent = 38 + resolved;
  document.getElementById('escrowValue').textContent = `₹${hold.toLocaleString('en-IN')}`;
}
function renderRows() {
  const filtered = getFilteredIncidents();
  const rows = document.getElementById('incidentRows');
  document.getElementById('emptyState').hidden = filtered.length !== 0;
  document.getElementById('caseCount').textContent = `${filtered.length} Case${filtered.length === 1 ? '' : 's'} Logged`;
  document.getElementById('showingCount').textContent = `Displaying ${filtered.length} of ${incidents.length} incident records`;
  rows.innerHTML = filtered.map(item => `
    <tr data-id="${escapeHtml(item.id)}" class="${selectedId === item.id ? 'selected' : ''}" tabindex="0" aria-label="Open incident ${escapeHtml(item.id)}">
      <td><span class="case-id">${escapeHtml(item.id)}</span></td>
      <td><strong>${escapeHtml(item.equipment)}</strong><small>${escapeHtml(item.asset)} · ${escapeHtml(item.category)}</small></td>
      <td><strong>${escapeHtml(item.borrower)}</strong><small>${escapeHtml(item.reporter)}</small></td>
      <td><span class="severity ${severityClass(item.severity)}">● ${escapeHtml(item.severity)}</span></td>
      <td><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td>
      <td><div class="row-actions"><button class="row-action" data-action="open" data-id="${escapeHtml(item.id)}" title="Open details">↗</button><button class="row-action" data-action="resolve" data-id="${escapeHtml(item.id)}" title="Mark resolved">✓</button></div></td>
    </tr>`).join('');
  if (filtered.length && !filtered.some(item => item.id === selectedId)) selectedId = filtered[0].id;
  renderDetail();
}
function renderDetail() {
  const item = incidents.find(entry => entry.id === selectedId);
  const panel = document.getElementById('detailPanel');
  if (!item) {
    panel.innerHTML = '<div class="detail-empty">Select an incident from the case dossiers.<strong>No incident selected</strong>Choose a row to inspect its details and available actions.</div>';
    return;
  }
  panel.innerHTML = `
    <div class="detail-kicker"><span>${escapeHtml(item.severity.toUpperCase())} INCIDENT</span><small>${escapeHtml(item.id)}</small></div>
    <h2>${escapeHtml(item.equipment)}</h2>
    <img class="detail-image" src="${escapeHtml(item.image || '')}" alt="Equipment incident reference" onerror="this.style.display='none'" />
    <p class="asset-caption">Asset Tag: ${escapeHtml(item.asset)}</p>
    <div class="detail-pairs">
      <div><span>Borrower</span><strong>${escapeHtml(item.borrower)}</strong></div>
      <div><span>Reporter</span><strong>${escapeHtml(item.reporter)}</strong></div>
      <div><span>Category</span><strong>${escapeHtml(item.category)}</strong></div>
      <div><span>Reported</span><strong>${escapeHtml(item.date)}</strong></div>
    </div>
    <div class="detail-section"><h3>Incident Description</h3><p>${escapeHtml(item.description)}</p></div>
    <div class="detail-section"><h3>Impact &amp; Equipment Status</h3><p>${escapeHtml(item.impact)}</p><div class="financial-row"><span>Reported escrow / repair hold</span><strong>₹${Number(item.hold || 0).toLocaleString('en-IN')}</strong></div></div>
    <div class="detail-section"><h3>Investigation Activity</h3><p>${(item.log || []).map(entry => `• ${escapeHtml(entry)}`).join('<br>')}</p></div>
    <div class="detail-actions">
      <button class="btn btn-primary wide" id="resolveSelected" ${item.status === 'Resolved' ? 'disabled' : ''}>✓ Mark as Resolved</button>
      <button class="btn btn-light" id="escalateSelected" ${item.status === 'Resolved' ? 'disabled' : ''}>⇧ Escalate</button>
      <button class="btn btn-light" id="addLogSelected">＋ Add Log Entry</button>
      <button class="btn btn-light wide" id="copyCase">▣ Copy Case ID</button>
    </div>`;
  document.getElementById('resolveSelected')?.addEventListener('click', () => updateStatus(item.id, 'Resolved'));
  document.getElementById('escalateSelected')?.addEventListener('click', () => updateStatus(item.id, 'Escalated'));
  document.getElementById('addLogSelected')?.addEventListener('click', () => addLogEntry(item.id));
  document.getElementById('copyCase')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(item.id); showToast(`Copied ${item.id}`); }
    catch { showToast(`Case ID: ${item.id}`); }
  });
}
function render() { renderMetrics(); renderRows(); }
function updateStatus(id, status) {
  const item = incidents.find(entry => entry.id === id);
  if (!item) return;
  item.status = status;
  item.log = item.log || [];
  item.log.unshift(`${status} by Admin Supervisor · ${new Date().toLocaleString()}`);
  saveIncidents(); render(); showToast(`${id} updated: ${status}`);
}
function addLogEntry(id) {
  const item = incidents.find(entry => entry.id === id);
  if (!item) return;
  const note = prompt('Enter an investigation note:');
  if (!note || !note.trim()) return;
  item.log = item.log || [];
  item.log.unshift(`${note.trim()} · ${new Date().toLocaleString()}`);
  saveIncidents(); renderDetail(); showToast('Investigation note added.');
}
function openModal() { document.getElementById('incidentModal').hidden = false; document.querySelector('#incidentForm input[name="equipment"]').focus(); }
function closeModal() { document.getElementById('incidentModal').hidden = true; document.getElementById('incidentForm').reset(); }
function createIncident(formData) {
  const next = Math.max(400, ...incidents.map(item => Number((item.id.match(/\d+/) || [400])[0]))) + 1;
  const item = {
    id: `INC-${next}`, equipment: formData.get('equipment').trim(), asset: formData.get('asset').trim(),
    category: formData.get('category'), severity: formData.get('severity'), borrower: formData.get('borrower').trim(),
    borrowerEmail: '', reporter: formData.get('reporter').trim(), date: new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }),
    location: 'Location pending verification', description: formData.get('description').trim(),
    impact: 'Pending initial assessment by the equipment custodian.', hold: 0,
    image: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=900&q=80',
    status: 'Open', log: ['Incident created in admin demo']
  };
  incidents.unshift(item); selectedId = item.id; saveIncidents();
  document.getElementById('globalSearch').value = '';
  document.getElementById('severityFilter').value = 'all';
  document.getElementById('categoryFilter').value = 'all';
  document.getElementById('statusFilter').value = 'all';
  closeModal(); render(); showToast(`${item.id} has been logged.`);
}
function csvCell(value) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }
function exportCsv() {
  const filtered = getFilteredIncidents();
  const headers = ['Case ID','Equipment','Asset Tag','Category','Borrower','Reporter','Severity','Status','Reported Date','Description','Escrow / Repair Hold'];
  const lines = [headers, ...filtered.map(item => [item.id,item.equipment,item.asset,item.category,item.borrower,item.reporter,item.severity,item.status,item.date,item.description,item.hold])];
  const csv = '\uFEFF' + lines.map(row => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = 'campusshare-incident-report-demo.csv'; link.click(); URL.revokeObjectURL(url);
  showToast(`Exported ${filtered.length} incident record(s).`);
}

document.getElementById('incidentRows').addEventListener('click', event => {
  const actionButton = event.target.closest('button[data-action]');
  if (actionButton) {
    const { id, action } = actionButton.dataset;
    if (action === 'open') { selectedId = id; renderRows(); }
    if (action === 'resolve') { selectedId = id; updateStatus(id, 'Resolved'); }
    return;
  }
  const row = event.target.closest('tr[data-id]');
  if (row) { selectedId = row.dataset.id; renderRows(); }
});
document.getElementById('incidentRows').addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    const row = event.target.closest('tr[data-id]');
    if (row) { event.preventDefault(); selectedId = row.dataset.id; renderRows(); }
  }
});
['globalSearch','severityFilter','categoryFilter','statusFilter'].forEach(id => document.getElementById(id).addEventListener(id === 'globalSearch' ? 'input' : 'change', renderRows));
document.getElementById('resetFilters').addEventListener('click', () => {
  document.getElementById('globalSearch').value = '';
  document.getElementById('severityFilter').value = 'all';
  document.getElementById('categoryFilter').value = 'all';
  document.getElementById('statusFilter').value = 'all';
  renderRows(); showToast('Filters have been reset.');
});
document.getElementById('newIncidentBtn').addEventListener('click', openModal);
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelModal').addEventListener('click', closeModal);
document.getElementById('incidentModal').addEventListener('click', event => { if (event.target.id === 'incidentModal') closeModal(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
document.getElementById('incidentForm').addEventListener('submit', event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  createIncident(new FormData(event.currentTarget));
});
document.getElementById('exportBtn').addEventListener('click', exportCsv);
document.getElementById('policyBtn').addEventListener('click', () => showToast('Policy reference is illustrative. Connect the institution-approved EHS policy document.'));
document.getElementById('globalSearch').addEventListener('keydown', event => { if (event.key === 'Escape') { event.currentTarget.value=''; renderRows(); } });
document.getElementById('prevPage').addEventListener('click', () => showToast('You are viewing the first demo page.'));
document.getElementById('nextPage').addEventListener('click', () => showToast('All demo incidents are shown on this page.'));

render();
