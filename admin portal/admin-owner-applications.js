const STORAGE_KEY = 'campusshare_admin_owner_applications_v1';

const seedApplications = [
  {id:'OWN-24091',name:'Dr. Marcus Vance',email:'m.vance@campus.edu',initials:'MV',avatar:'',department:'Robotics Research Lab',resources:['High-speed scanners','Cameras & sensors','Autonomous rigs','RASTAM 24/7'],submitted:'Today, 08:30 AM',submittedLong:'October 31, 2026 · 08:30 AM',documents:[{name:'EHS Safety 2024',type:'valid'},{name:'Custodian Certificate',type:'valid'}],status:'Pending Verification',purpose:'Requests owner access to share high-speed scanning equipment, camera sensors and supervised autonomous research rigs with approved student project teams.',notes:'The applicant has supplied a current safety certificate and custodian documentation. Confirm the laboratory assignment and scope of equipment access before approval.'},
  {id:'OWN-24088',name:'Elena Rostova, MFA',email:'e.rostova@campus.edu',initials:'ER',avatar:'purple',department:'Film & Media Production',resources:['Cinema camera rigs','Prime & zoom lenses','Light Suite','Audio kits'],submitted:'Yesterday, 5:42 PM',submittedLong:'October 30, 2026 · 05:42 PM',documents:[{name:'EHS Safety (Expiring)',type:'expired'},{name:'Property Insurance Binder',type:'valid'}],status:'Pending Verification',purpose:'Requests custodian access for camera rigs, lens suites, lighting and production audio equipment used for supervised film and media projects.',notes:'The submitted EHS certification is close to expiry. Verify the renewal date and confirm that the insurance documentation covers the listed equipment.'},
  {id:'OWN-24075',name:'Prof. Jonathan Sterling',email:'j.sterling@campus.edu',initials:'JS',avatar:'',department:'Physics Optics Lab',resources:['Class 3B/4 lasers','Research lasers','Optics tables','Calibration equipment'],submitted:'Oct 24, 11:15 AM',submittedLong:'October 24, 2026 · 11:15 AM',documents:[{name:'Laser Safety Officer Cert',type:'valid'},{name:'Optics Lab Conduct Tier 4',type:'valid'}],status:'Pending Verification',purpose:'Requests owner permissions for controlled optics equipment, including Class 3B/4 laser systems and calibration instruments.',notes:'Laser equipment requires a current Laser Safety Officer approval and controlled access procedure. Confirm the safety officer designation before granting access.'},
  {id:'OWN-24063',name:'Aisha Patel, M.Eng',email:'a.patel@campus.edu',initials:'AP',avatar:'gray',department:'Biomedical Engineering',resources:['CELLINK 3D bioprinter','Cleanroom instruments','Biosafety cabinets','Cell culture tools'],submitted:'Oct 21, 2:02 PM',submittedLong:'October 21, 2026 · 02:02 PM',documents:[{name:'BSL-2 Biosafety Approval',type:'valid'},{name:'Facility Safety Form',type:'valid'}],status:'Pending Verification',purpose:'Requests equipment-owner permissions for supervised biomedical engineering instruments and cell-culture resources.',notes:'Review BSL-2 training, facility access and supervision arrangements. Approval should be limited to the resources and users covered by the documented clearance.'},
  {id:'OWN-23992',name:'Dr. Priya Nair',email:'p.nair@campus.edu',initials:'PN',avatar:'teal',department:'Electrical Engineering',resources:['Power supplies','Oscilloscopes','Signal generators'],submitted:'Oct 18, 11:20 AM',submittedLong:'October 18, 2026 · 11:20 AM',documents:[{name:'Electrical Safety Certificate',type:'valid'},{name:'Lab Custody Form',type:'valid'}],status:'Approved',baseline:true,purpose:'Approved custodian for the electrical instrumentation lab.',notes:'Approved after facility and safety verification.'},
  {id:'OWN-23971',name:'Ravi Menon',email:'r.menon@campus.edu',initials:'RM',avatar:'gold',department:'Robotics Research Lab',resources:['Robotics kits','3D printers'],submitted:'Oct 16, 09:05 AM',submittedLong:'October 16, 2026 · 09:05 AM',documents:[{name:'Workshop Safety Certificate',type:'valid'},{name:'Custodian Certificate',type:'valid'}],status:'Approved',baseline:true,purpose:'Approved owner for robotics and prototyping resources.',notes:'Approved with supervised-use conditions.'},
  {id:'OWN-23940',name:'Kiran Das',email:'k.das@campus.edu',initials:'KD',avatar:'purple',department:'Biomedical Engineering',resources:['Biosafety cabinets','Cell culture tools'],submitted:'Oct 12, 03:30 PM',submittedLong:'October 12, 2026 · 03:30 PM',documents:[{name:'BSL-2 Certificate (Expired)',type:'expired'},{name:'Facility Request Form',type:'valid'}],status:'Rejected',baseline:true,purpose:'Application for owner access to biomedical lab equipment.',notes:'Rejected in the sample record because the submitted biosafety certificate was expired.'}
];

let applications = loadApplications();
let activeTab = 'pending';
let selectedApplicationId = null;
let toastTimer;

function loadApplications(){
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : seedApplications.map(item => ({...item, documents:item.documents.map(doc=>({...doc}))}));
  } catch (error) { return seedApplications.map(item => ({...item, documents:item.documents.map(doc=>({...doc}))})); }
}
function saveApplications(){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(applications)); }
  catch (error) { showToast('Could not save demo changes in this browser.'); }
}
function escapeHTML(value){return String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function showToast(message){
  const toast=document.getElementById('toast'); toast.textContent=message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove('show'),2800);
}
function pendingItems(){return applications.filter(item=>item.status==='Pending Verification');}
function itemsForTab(){
  if(activeTab==='approved') return applications.filter(item=>item.status==='Approved');
  if(activeTab==='rejected') return applications.filter(item=>item.status==='Rejected');
  return pendingItems();
}
function filteredItems(){
  const query=document.getElementById('applicationSearch').value.trim().toLowerCase();
  const department=document.getElementById('departmentFilter').value;
  return itemsForTab().filter(item=>{
    const haystack=[item.name,item.email,item.id,item.department,...item.resources,...item.documents.map(doc=>doc.name)].join(' ').toLowerCase();
    return (!query||haystack.includes(query))&&(department==='all'||item.department===department);
  });
}
function statusClass(status){
  if(status==='Approved') return 'approved';
  if(status==='Rejected') return 'rejected';
  if(status==='Under Review') return 'review';
  return 'pending';
}
function renderStats(){
  const pending=pendingItems().length;
  const approved=220+applications.filter(item=>item.newlyApproved===true&&item.status==='Approved').length;
  const rejected=14+applications.filter(item=>item.newlyRejected===true&&item.status==='Rejected').length;
  const review=3;
  document.getElementById('pendingCount').innerHTML=`${pending} <small class="trend neutral">↓ Needs decision</small>`;
  document.getElementById('approvedCount').innerHTML=`${approved} <small class="trend positive">↑ +7 this month</small>`;
  document.getElementById('reviewCount').innerHTML=`${review} <small class="trend neutral">EHS and lab checks</small>`;
  document.getElementById('pendingTabCount').textContent=pending;
  document.querySelector('[data-tab="approved"] b').textContent=approved;
  document.querySelector('[data-tab="rejected"] b').textContent=rejected;
}
function renderTable(){
  renderStats();
  const items=filteredItems();
  const body=document.getElementById('applicationsTableBody');
  document.getElementById('emptyState').hidden=items.length!==0;
  body.innerHTML=items.map(item=>{
    const docs=item.documents.map((doc,index)=>`<button type="button" class="document-chip ${doc.type==='expired'?'expired':''}" data-action="document" data-id="${escapeHTML(item.id)}" data-doc="${index}" title="View ${escapeHTML(doc.name)}">${doc.type==='expired'?'⚠':'▧'} ${escapeHTML(doc.name)}</button>`).join('');
    const status=`<span class="status-badge ${statusClass(item.status)}">${escapeHTML(item.status)}</span>`;
    const actions=`<button class="row-action" type="button" data-action="review" data-id="${escapeHTML(item.id)}" title="Review application" aria-label="Review ${escapeHTML(item.name)}">◉</button>`+
      (item.status==='Pending Verification'||item.status==='Under Review'?`<button class="row-action" type="button" data-action="approve" data-id="${escapeHTML(item.id)}" title="Approve" aria-label="Approve ${escapeHTML(item.name)}">✓</button><button class="row-action danger" type="button" data-action="reject" data-id="${escapeHTML(item.id)}" title="Reject" aria-label="Reject ${escapeHTML(item.name)}">⊘</button>`:'');
    return `<tr>
      <td><div class="applicant-cell"><span class="avatar ${escapeHTML(item.avatar)}">${escapeHTML(item.initials)}</span><div><div class="applicant-name">${escapeHTML(item.name)}</div><div class="applicant-email">${escapeHTML(item.email)}</div><span class="applicant-id">ID: ${escapeHTML(item.id)}</span></div></div></td>
      <td><div class="department">${escapeHTML(item.department)}</div></td>
      <td><div class="resource-tags">${item.resources.map(resource=>`<span class="resource-tag">${escapeHTML(resource)}</span>`).join('')}</div></td>
      <td><div class="submitted"><strong>${escapeHTML(item.submitted)}</strong></div></td>
      <td><div class="document-list">${docs}</div></td>
      <td>${status}</td>
      <td class="actions-cell">${actions}</td>
    </tr>`;
  }).join('');
  const labels={pending:'pending owner applications',approved:'approved owners (sample records)',rejected:'rejected owner applications'};
  document.getElementById('resultCount').textContent=`Displaying ${items.length} ${labels[activeTab]}`;
  document.getElementById('pageSummary').textContent=`Displaying ${items.length} of ${itemsForTab().length} ${labels[activeTab]} · Standard review threshold: 48h`;
}
function switchTab(tab){
  activeTab=tab;
  document.querySelectorAll('.queue-tab').forEach(button=>{
    const active=button.dataset.tab===tab; button.classList.toggle('active',active); button.setAttribute('aria-selected',String(active));
  });
  renderTable();
}
function openModal(title,body,actions=''){
  document.getElementById('modalTitle').textContent=title;
  document.getElementById('modalBody').innerHTML=body;
  document.getElementById('modalActions').innerHTML=actions;
  document.getElementById('modalBackdrop').hidden=false;
  document.getElementById('closeModal').focus();
}
function closeModal(){document.getElementById('modalBackdrop').hidden=true;selectedApplicationId=null;}
function findApplication(id){return applications.find(item=>item.id===id);}
function reviewApplication(id){
  const item=findApplication(id); if(!item) return;
  selectedApplicationId=id;
  const docs=item.documents.map(doc=>`<span class="document-chip ${doc.type==='expired'?'expired':''}">${doc.type==='expired'?'⚠':'▧'} ${escapeHTML(doc.name)}</span>`).join('');
  const body=`<div class="detail-grid">
    <div class="detail-box"><label>Applicant</label><strong>${escapeHTML(item.name)}<br>${escapeHTML(item.email)}</strong></div>
    <div class="detail-box"><label>Application ID</label><strong>${escapeHTML(item.id)}</strong></div>
    <div class="detail-box"><label>Department / Facility</label><strong>${escapeHTML(item.department)}</strong></div>
    <div class="detail-box"><label>Submitted</label><strong>${escapeHTML(item.submittedLong)}</strong></div>
    <div class="detail-box"><label>Current status</label><strong>${escapeHTML(item.status)}</strong></div>
    <div class="detail-box"><label>Resource categories</label><strong>${item.resources.map(escapeHTML).join(', ')}</strong></div>
  </div>
  <div class="modal-section"><h3>Attached documentation</h3><div class="modal-docs">${docs}</div></div>
  <div class="modal-section"><h3>Application purpose</h3><p>${escapeHTML(item.purpose)}</p></div>
  <div class="modal-section"><h3>Reviewer note</h3><p>${escapeHTML(item.notes)}</p></div>
  <textarea class="decision-reason" id="decisionReason" placeholder="Optional reviewer note or reason for the decision..."></textarea>`;
  let actions='';
  if(item.status==='Pending Verification'||item.status==='Under Review'){
    actions=`<button type="button" class="button button-light" data-modal-action="mark-review">Mark under review</button><button type="button" class="button button-danger" data-modal-action="reject">Reject application</button><button type="button" class="button button-success" data-modal-action="approve">Approve owner</button>`;
  } else actions=`<button type="button" class="button button-light" id="closeDone">Close</button>`;
  openModal('Owner application review',body,actions);
}
function documentInfo(id,index){
  const item=findApplication(id); const doc=item?.documents[index]; if(!item||!doc)return;
  openModal('Attached document',`<div class="detail-grid"><div class="detail-box"><label>Applicant</label><strong>${escapeHTML(item.name)}</strong></div><div class="detail-box"><label>Application</label><strong>${escapeHTML(item.id)}</strong></div><div class="detail-box"><label>Document</label><strong>${escapeHTML(doc.name)}</strong></div><div class="detail-box"><label>Review label</label><strong>${doc.type==='expired'?'Expiry needs verification':'Provided · sample entry'}</strong></div></div><div class="modal-section"><p>This prototype stores document labels only. No real certificate file has been uploaded or validated. In the integrated system, an authorised reviewer should open the secure document and verify its issuer, validity period and applicability.</p></div>`,`<button type="button" class="button button-primary" id="closeDone">Close</button>`);
}
function decideApplication(id,decision,reason=''){
  const item=findApplication(id); if(!item)return;
  const previous=item.status;
  item.status=decision;
  item.newlyApproved=decision==='Approved'&&!item.baseline;
  item.newlyRejected=decision==='Rejected'&&!item.baseline;
  item.decisionReason=reason.trim();
  item.decidedAt=new Date().toLocaleString();
  item.decidedBy='Admin Supervisor (demo)';
  saveApplications(); closeModal(); renderTable();
  const verb=decision==='Approved'?'approved':decision==='Rejected'?'rejected':'moved to review';
  showToast(`${item.name}'s application ${verb}. Demo change saved locally.`);
  logEntries.unshift({title:`${item.name} · ${previous} → ${decision}`,detail:`${item.id}${reason.trim()?` · ${reason.trim()}`:''}`,time:new Date().toLocaleString()});
}
let logEntries=[
  {title:'Owner application queue opened',detail:'Admin Supervisor reviewed the pending verification queue.',time:'Today · 09:14 AM'},
  {title:'EHS certificate flagged for expiry review',detail:'Film & Media Production · OWN-24088',time:'Today · 08:42 AM'},
  {title:'Application assigned for facility review',detail:'Physics Optics Lab · OWN-24075',time:'Yesterday · 04:18 PM'}
];
function showReviewLog(){
  const body=`<div class="log-list">${logEntries.map(entry=>`<div class="log-item"><span class="log-dot"></span><div><strong>${escapeHTML(entry.title)}</strong><small>${escapeHTML(entry.detail)}<br>${escapeHTML(entry.time)}</small></div></div>`).join('')}</div>`;
  openModal('Owner application review log',body,'<button type="button" class="button button-primary" id="closeDone">Close</button>');
}
function exportQueue(){
  const rows=filteredItems();
  const headers=['Application ID','Applicant','Email','Department / Facility','Resource Types','Submitted','Status','Decision Reason','Decided At','Decided By'];
  const quote=value=>`"${String(value??'').replace(/"/g,'""')}"`;
  const lines=[headers.map(quote).join(','),...rows.map(item=>[item.id,item.name,item.email,item.department,item.resources.join('; '),item.submittedLong,item.status,item.decisionReason||'',item.decidedAt||'',item.decidedBy||''].map(quote).join(','))];
  const blob=new Blob([lines.join('\r\n')],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url; link.download=`campusshare-owner-applications-${activeTab}.csv`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  showToast(`Exported ${rows.length} application record(s) as CSV.`);
}
function showPolicy(key){
  const policies={
    ehs:{title:'EHS Campus Safety Signoff',text:'Before an owner can share hazardous, high-voltage, laser, chemical or other controlled equipment, the institution should verify current Environmental Health & Safety approval. Review certificate issuer, expiry date, covered equipment categories, required training and supervision conditions. An expired or mismatched document should be sent for clarification rather than silently treated as valid.'},
    custody:{title:'Lab Custodian Accountability',text:'An approved resource owner should be responsible for equipment availability, authorised handover, return confirmation, basic condition documentation and escalation of incidents. Approval should define the equipment and facility scope. Staff access and owner permissions should be limited to the resources assigned to them.'},
    inventory:{title:'Inventory De-duplication Protocol',text:'Before approving a new owner listing, compare asset tags, serial numbers, equipment names and facility assignments against the institutional inventory. Duplicate or conflicting records should be flagged for manual reconciliation. The system should retain an explanation and reviewer identity for the final decision.'}
  };
  const policy=policies[key]; if(!policy)return;
  openModal(policy.title,`<div class="modal-section"><p>${escapeHTML(policy.text)}</p></div><div class="modal-section"><p><strong>Prototype note:</strong> This is guidance text for the demonstration interface, not a substitute for the institution's official policy documents.</p></div>`,'<button type="button" class="button button-primary" id="closeDone">Close</button>');
}

document.querySelectorAll('.queue-tab').forEach(button=>button.addEventListener('click',()=>switchTab(button.dataset.tab)));
document.getElementById('applicationSearch').addEventListener('input',renderTable);
document.getElementById('departmentFilter').addEventListener('change',renderTable);
document.getElementById('resetFilters').addEventListener('click',()=>{document.getElementById('applicationSearch').value='';document.getElementById('departmentFilter').value='all';switchTab('pending');showToast('Application filters reset.');});
document.getElementById('applicationsTableBody').addEventListener('click',event=>{
  const button=event.target.closest('[data-action]'); if(!button)return;
  const {action,id,doc}=button.dataset;
  if(action==='review')reviewApplication(id);
  else if(action==='document')documentInfo(id,Number(doc));
  else if(action==='approve')reviewApplication(id);
  else if(action==='reject')reviewApplication(id);
});
document.getElementById('reviewLogButton').addEventListener('click',showReviewLog);
document.getElementById('exportButton').addEventListener('click',exportQueue);
document.getElementById('closeModal').addEventListener('click',closeModal);
document.getElementById('cancelModal')?.addEventListener('click',closeModal);
document.getElementById('modalBackdrop').addEventListener('click',event=>{if(event.target.id==='modalBackdrop')closeModal();});
document.getElementById('modalActions').addEventListener('click',event=>{
  const button=event.target.closest('[data-modal-action]');
  if(button){const action=button.dataset.modalAction;const reason=document.getElementById('decisionReason')?.value||'';
    if(action==='approve')decideApplication(selectedApplicationId,'Approved',reason);
    else if(action==='reject')decideApplication(selectedApplicationId,'Rejected',reason);
    else if(action==='mark-review')decideApplication(selectedApplicationId,'Under Review',reason);
  }
  if(event.target.closest('#closeDone'))closeModal();
});
document.getElementById('modalBody').addEventListener('click',event=>{if(event.target.closest('#closeDone'))closeModal();});
document.querySelectorAll('[data-policy]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();showPolicy(link.dataset.policy);}));
document.getElementById('notificationButton').addEventListener('click',()=>showToast('No new admin notifications in this demo.'));
document.getElementById('accountButton').addEventListener('click',()=>showToast('Signed in as Admin Supervisor (demo profile).'));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.getElementById('modalBackdrop').hidden)closeModal();});

renderTable();
