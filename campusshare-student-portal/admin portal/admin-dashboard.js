'use strict';

const STORAGE_KEY = 'campusshare.admin.dashboard.v1';
const initialState = {
  inventory: 1120,
  borrowers: 186,
  owners: [
    {id:'OWN-2401',name:'Dr. Kenan Chen',role:'Robotics Research Faculty',dept:'Robotics & Mechatronics',detail:'Requested owner access for the Robotics Research Lab.',initials:'KC'},
    {id:'OWN-2402',name:'Marcus Vance, MSc',role:'Media Arts Technician',dept:'Media Arts & Production',detail:'Equipment custodian application · 4 documents attached.',initials:'MV'},
    {id:'OWN-2403',name:'Dr. Elena Rostova',role:'Physics Faculty',dept:'Physics & High-Precision Optics',detail:'Requested owner access for the optics laboratory.',initials:'ER'},
    {id:'OWN-2404',name:'Aisha Patel, M.Eng',role:'Biomedical Lab Engineer',dept:'Bioengineering Facilities',detail:'Clearance review pending for specialised equipment.',initials:'AP'}
  ],
  roster: [
    {id:'BK-9042',name:'Samantha Lee',netid:'sl472 · Media Arts Lab',equipment:'Sony FX6 Cinema Kit',asset:'TAG-CAM-FX6-021',status:'Active',due:'Today, 5:30 PM',time:'Checked out 10:05 AM',initials:'SL'},
    {id:'BK-9043',name:'Dr. Andrew Miller',netid:'am019 · Robotics Lab',equipment:'Formlabs Form 4 SLA Printer',asset:'3D-FAB-04',status:'Due Today',due:'Today, 6:00 PM',time:'Checked out yesterday',initials:'AM'},
    {id:'BK-9044',name:'Elena Rostova',netid:'er221 · Physics Lab',equipment:'Tektronix 4-Ch Scope',asset:'OSC-TEK-442',status:'Active',due:'Nov 02, 2025',time:'Checked out Oct 29',initials:'ER'},
    {id:'BK-9045',name:'Julian Torres',netid:'jt088 · Bioengineering',equipment:'Eppendorf Centrifuge 5425',asset:'BIO-CEN-5425',status:'Pending',due:'Awaiting approval',time:'Submitted 11:42 AM',initials:'JT'}
  ],
  incidents: [
    {id:'INC-2024-08',title:'Sony FX6 Cinema Kit',description:'Minor lens mount concern reported during return inspection.',severity:'Critical',status:'Open'},
    {id:'INC-2024-09',title:'Oscilloscope probe set',description:'Probe accessory reported missing after laboratory checkout.',severity:'Medium',status:'Investigating'}
  ]
};

function loadState(){
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.owners) && Array.isArray(saved.roster) && Array.isArray(saved.incidents)) return {...initialState,...saved};
  } catch (error) { console.warn('Unable to read dashboard demo state:', error); }
  return structuredClone(initialState);
}
let state = loadState();
let toastTimer;
const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function showToast(message){
  const el = $('#toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>el.classList.remove('show'),2800);
}
function initials(name){ return String(name).split(/\s+/).map(part=>part[0]).slice(0,2).join('').toUpperCase(); }
function renderMetrics(){
  $('#inventoryTotal').innerHTML = `${state.inventory.toLocaleString()} <small>+4.8%</small>`;
  $('#borrowerTotal').innerHTML = `${state.borrowers} <small>+6.2%</small>`;
  $('#pendingTotal').innerHTML = `${state.owners.length} <small class="neutral">Awaiting review</small>`;
  $('#overdueTotal').innerHTML = `${state.incidents.filter(item=>item.status!=='Resolved').length + 5} <small class="negative">+2 this week</small>`;
  $('#ownerQueueCount').textContent = `${state.owners.length} Pending`;
  $('#incidentCount').textContent = `${state.incidents.filter(item=>item.severity==='Critical' && item.status!=='Resolved').length} Escalations`;
}
function renderRoster(){
  const tbody = $('#rosterBody');
  if (!state.roster.length){ tbody.innerHTML='<tr><td colspan="4" class="empty-state">No current checkout or reservation records.</td></tr>'; }
  else tbody.innerHTML = state.roster.map(item=>{
    const cls = item.status==='Overdue'?'overdue':item.status==='Due Today'?'due':item.status==='Pending'?'pending':'active';
    const action = item.status==='Pending' ? `<button class="action-button" data-action="approve-booking" data-id="${escapeHTML(item.id)}">Approve</button>` : item.status==='Returned' ? '<span class="muted">Closed</span>' : `<button class="action-button ${item.status==='Overdue'?'danger':''}" data-action="toggle-checkout" data-id="${escapeHTML(item.id)}">${item.status==='Checked In'?'Reopen':'Check in'}</button>`;
    return `<tr>
      <td><div class="borrower-cell"><span class="avatar">${escapeHTML(item.initials || initials(item.name))}</span><span><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(item.netid)}</small></span></div></td>
      <td><div class="equipment-cell"><strong>${escapeHTML(item.equipment)}</strong><small>${escapeHTML(item.asset)}</small></div></td>
      <td><span class="table-status ${cls}"><i class="status-dot ${cls==='active'?'green':cls==='pending'?'purple':cls==='due'?'amber':'red'}"></i>${escapeHTML(item.status)}</span><small class="subline">${escapeHTML(item.time)}</small></td>
      <td><strong class="due-text">${escapeHTML(item.due)}</strong><div class="row-action">${action}</div></td>
    </tr>`;
  }).join('');
  $('#rosterCount').textContent = `Showing ${state.roster.length} current records`;
}
function renderOwners(){
  const container=$('#ownerQueue');
  if(!state.owners.length){container.innerHTML='<div class="empty-state">All owner applications have been reviewed.</div>';return;}
  container.innerHTML=state.owners.slice(0,3).map(owner=>`<article class="owner-card">
    <div class="owner-card-head"><span class="avatar">${escapeHTML(owner.initials||initials(owner.name))}</span><span><strong>${escapeHTML(owner.name)}</strong><small>${escapeHTML(owner.role)} · ${escapeHTML(owner.id)}</small></span></div>
    <p>${escapeHTML(owner.detail)}</p>
    <div class="owner-actions"><button class="approve-btn" data-action="approve-owner" data-id="${escapeHTML(owner.id)}">Approve Owner</button><button class="review-btn" data-action="review-owner" data-id="${escapeHTML(owner.id)}">Review Details</button></div>
  </article>`).join('');
}
function renderIncidents(){
  const container=$('#incidentList');
  const open=state.incidents.filter(item=>item.status!=='Resolved');
  if(!open.length){container.innerHTML='<div class="empty-state">No open incidents. All clear.</div>';return;}
  container.innerHTML=open.slice(0,2).map(item=>`<article class="incident-card">
    <div class="incident-card-head"><span class="severity ${item.severity==='Critical'?'':'medium'}">${escapeHTML(item.severity)} · ${escapeHTML(item.id)}</span></div>
    <strong>${escapeHTML(item.title)}</strong><p>${escapeHTML(item.description)}</p>
    <div class="incident-actions"><button class="primary" data-action="open-incident" data-id="${escapeHTML(item.id)}">Review Case</button><button class="secondary" data-action="resolve-incident" data-id="${escapeHTML(item.id)}">Mark Resolved</button></div>
  </article>`).join('');
}
function renderAll(){renderMetrics();renderRoster();renderOwners();renderIncidents();}
function openModal(title,html){$('#modalTitle').textContent=title;$('#modalContent').innerHTML=html;$('#modalBackdrop').hidden=false;document.body.style.overflow='hidden';}
function closeModal(){$('#modalBackdrop').hidden=true;$('#modalContent').innerHTML='';document.body.style.overflow='';}
function downloadFile(filename,content,type='text/csv;charset=utf-8'){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}
function exportReport(){
  const rows=[['Report','CampusShare Admin Dashboard'],['Generated at',new Date().toLocaleString()],[],['Metric','Value'],['Total inventory',state.inventory],['Active borrowers',state.borrowers],['Pending owner applications',state.owners.length],['Open incidents',state.incidents.filter(i=>i.status!=='Resolved').length],[],['Booking ID','Borrower','NetID','Equipment','Asset','Status','Due'],...state.roster.map(r=>[r.id,r.name,r.netid,r.equipment,r.asset,r.status,r.due])];
  const csv=rows.map(row=>row.map(cell=>`"${String(cell??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');
  downloadFile(`campusshare-admin-report-${new Date().toISOString().slice(0,10)}.csv`,csv);showToast('System report exported as CSV.');
}
function bindActions(){
  document.addEventListener('click',event=>{
    const target=event.target.closest('[data-action]');if(!target)return;
    const {action,id}=target.dataset;
    if(action==='approve-owner'){
      const owner=state.owners.find(o=>o.id===id);if(!owner)return;
      if(!confirm(`Approve ${owner.name} as an equipment owner?`))return;
      state.owners=state.owners.filter(o=>o.id!==id);saveState();renderAll();showToast(`${owner.name} approved in demo.`);
    }
    if(action==='review-owner'){
      const owner=state.owners.find(o=>o.id===id);if(!owner)return;
      openModal('Owner application details',`<div class="detail-card"><strong>${escapeHTML(owner.name)}</strong><p>${escapeHTML(owner.role)} · ${escapeHTML(owner.dept)}</p><p>Application ID: ${escapeHTML(owner.id)}</p><p>${escapeHTML(owner.detail)}</p><div class="notice">Demo record only. Review attached proof and institutional eligibility in the connected admin workflow before approving access.</div></div><div class="modal-actions"><button class="btn btn-light" data-close-modal>Close</button><button class="btn btn-primary" data-action="approve-owner" data-id="${escapeHTML(owner.id)}">Approve Owner</button></div>`);
    }
    if(action==='approve-booking'){
      const item=state.roster.find(r=>r.id===id);if(!item)return;item.status='Active';item.time='Approved just now';saveState();renderAll();showToast(`Booking ${id} approved in demo.`);
    }
    if(action==='toggle-checkout'){
      const item=state.roster.find(r=>r.id===id);if(!item)return;
      item.status=item.status==='Checked In'?'Active':'Checked In';item.time=item.status==='Checked In'?'Check-in recorded just now':'Checkout reopened just now';
      saveState();renderAll();showToast(`${item.name}: ${item.status}.`);
    }
    if(action==='resolve-incident'){
      const incident=state.incidents.find(i=>i.id===id);if(!incident)return;if(!confirm(`Mark ${id} as resolved?`))return;incident.status='Resolved';saveState();renderAll();showToast(`${id} marked resolved in demo.`);
    }
    if(action==='open-incident'){
      const item=state.incidents.find(i=>i.id===id);if(!item)return;
      openModal('Incident case review',`<div class="detail-card"><span class="severity ${item.severity==='Critical'?'':'medium'}">${escapeHTML(item.severity)}</span><h3>${escapeHTML(item.title)}</h3><p><strong>Case ID:</strong> ${escapeHTML(item.id)}</p><p>${escapeHTML(item.description)}</p><p><strong>Current status:</strong> ${escapeHTML(item.status)}</p><div class="notice">This is a fictional dashboard record. A connected incident system should retain reporter identity, evidence, review notes and resolution timestamps.</div></div><div class="modal-actions"><button class="btn btn-light" data-close-modal>Close</button><button class="btn btn-primary" data-action="resolve-incident" data-id="${escapeHTML(item.id)}">Mark Resolved</button></div>`);
    }
  });
}

$('#openAddEquipment').addEventListener('click',()=>openModal('Add equipment',`<form id="equipmentForm"><div class="form-grid">
  <div class="form-field full"><label for="equipmentName">Equipment name</label><input id="equipmentName" name="name" required maxlength="90" placeholder="e.g. Digital Oscilloscope" /></div>
  <div class="form-field"><label for="equipmentCategory">Category</label><select id="equipmentCategory" name="category" required><option value="">Select category</option><option>Electronics &amp; Testing</option><option>Computing</option><option>Camera &amp; Media</option><option>Robotics</option><option>Laboratory</option></select></div>
  <div class="form-field"><label for="equipmentDepartment">Department</label><select id="equipmentDepartment" name="department"><option>Robotics &amp; Mechatronics</option><option>Media Arts &amp; Production</option><option>Physics &amp; High-Precision Optics</option><option>Bioengineering Facilities</option></select></div>
  <div class="form-field"><label for="equipmentAsset">Asset ID</label><input id="equipmentAsset" name="asset" required placeholder="CS-EQ-0001" /></div>
  <div class="form-field"><label for="equipmentLocation">Location</label><input id="equipmentLocation" name="location" placeholder="Lab / room" /></div>
</div><div class="modal-actions"><button type="button" class="btn btn-light" data-close-modal>Cancel</button><button class="btn btn-primary" type="submit">Add to inventory</button></div></form>`));
$('#openScanner').addEventListener('click',()=>openModal('RFID / QR scanner',`<div class="scanner-frame"><strong>▦</strong><b>Scanner ready</b><br/><small>Enter an asset tag or booking ID to simulate a scan.</small></div><form id="scannerForm" class="form-grid" style="margin-top:14px"><div class="form-field full"><label for="scanCode">Asset tag / booking ID</label><input id="scanCode" name="code" required placeholder="e.g. TAG-CAM-FX6-021 or BK-9042" /></div><div class="form-field full"><button class="btn btn-primary" type="submit">Verify record</button></div></form><div id="scanResult"></div><p class="muted-note">Camera and hardware RFID access are not connected in this frontend prototype.</p>`));
$('#exportReport').addEventListener('click',exportReport);
$('#closeModal').addEventListener('click',closeModal);
$('#modalBackdrop').addEventListener('click',event=>{if(event.target.id==='modalBackdrop')closeModal();});
document.addEventListener('click',event=>{if(event.target.closest('[data-close-modal]'))closeModal();});
$('#modalContent').addEventListener('submit',event=>{
  event.preventDefault();const form=event.target;
  if(form.id==='equipmentForm'){
    const data=new FormData(form);const name=String(data.get('name')).trim();const asset=String(data.get('asset')).trim();
    state.inventory+=1;saveState();renderMetrics();closeModal();showToast(`${name} (${asset}) added to demo inventory.`);
  }
  if(form.id==='scannerForm'){
    const code=String(new FormData(form).get('code')).trim().toLowerCase();
    const record=state.roster.find(r=>r.id.toLowerCase()===code||r.asset.toLowerCase()===code);
    $('#scanResult').innerHTML=record?`<div class="scan-result"><strong>Record found</strong><br/>${escapeHTML(record.equipment)}<br/>Borrower: ${escapeHTML(record.name)}<br/>Status: ${escapeHTML(record.status)}</div>`:`<div class="scan-result">No matching record was found in the demo data. Check the asset tag or booking ID.</div>`;
  }
});

$('#mobileMenu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeModal();if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();$('#globalSearch').focus();}});

renderAll();bindActions();
const now=new Date();$('#snapshotTime').textContent='just now';$('#footerTime').textContent=now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
