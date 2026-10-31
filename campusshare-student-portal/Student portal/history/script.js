const records = [
  {id:'AMK-ARD-019',name:'Arduino Mega 2560 Sensor Kit',icon:'▣',serial:'ARD-2560-019',lab:'Innovation Hub 0-08 Makerspace',facility:'Innovation Hub',location:'Makerspace Facility',borrowed:'May 02, 2025',returned:'May 08, 2025',duration:'6 days, 2 hrs',time:'On Time',condition:'Passed - Excellent Condition',inspection:'No component loss; all 37 sensor modules accounted for. Inspected by Dr. Sarah Vance.',status:'Returned & Closed',impacted:false,report:true,semester:'Spring 2025'},
  {id:'WKS-570-032',name:'Dell Precision 5570 i7 32GB RTX Workstation',icon:'▰',serial:'WKS-570-032',lab:'Turing Hall 402 Computing Research Wing',facility:'Engineering Block',location:'Turing Hall, Computing Research Wing',borrowed:'Apr 14, 2025',returned:'Apr 21, 2025',duration:'7 days, 0 hrs',time:'On Time',condition:'Passed - Standard Condition',inspection:'SSD cleaned and system diagnostic run; all ports and connectivity verified. Inspected by Marcus Kane, Systems Lead.',status:'Returned & Closed',impacted:true,report:true,semester:'Spring 2025'},
  {id:'MBR-REP-221',name:'MakerBot Replicator 3D Tooling Kit',icon:'▤',serial:'MBR-REP-221',lab:'Innovation Hub 0-08 Makerspace',facility:'Innovation Hub',location:'Makerspace Facility',borrowed:'Mar 01, 2025',returned:'Mar 10, 2025',duration:'9 days, 0 hrs',time:'On Time',condition:'Passed - Clean & Calibrated',inspection:'Extruder gears cleaned, filament calibrated, calibration print completed by Prof. Alan Turner.',status:'Returned & Closed',impacted:true,report:true,semester:'Spring 2025'},
  {id:'CAM-A7-041',name:'Sony Alpha 7 III 4K Camera Bundle',icon:'▣',serial:'CAM-A7-041',lab:'Fine Arts Center 110 Media Arts Equipment Cage',facility:'Media Arts Center',location:'Media Arts Equipment Cage',borrowed:'Feb 18, 2025',returned:'Feb 21, 2025',duration:'3 days, 4 hrs',time:'On Time',condition:'Passed - Optical Inspection Clear',inspection:'Zero lens scratches or sensor alignment issues. All accessories formatted and battery cycle logged. Inspected by Elena Rostova.',status:'Returned & Closed',impacted:false,report:true,semester:'Spring 2025'},
  {id:'OSC-1054-011',name:'Rigol DS1054Z Digital Oscilloscope',icon:'▥',serial:'OSC-1054-011',lab:'Engineering Block E-204',facility:'Engineering Block',location:'Electronics Lab E-204',borrowed:'Jan 21, 2025',returned:'Jan 24, 2025',duration:'3 days, 0 hrs',time:'On Time',condition:'Passed - Excellent Condition',inspection:'Probe set and display calibration verified by lab technician.',status:'Returned & Closed',impacted:false,report:false,semester:'Spring 2025'},
  {id:'KIT-ESP-006',name:'ESP32 IoT Development Kit',icon:'▦',serial:'KIT-ESP-006',lab:'Innovation Hub 0-12',facility:'Innovation Hub',location:'IoT Lab',borrowed:'Jan 12, 2025',returned:'Jan 15, 2025',duration:'3 days, 0 hrs',time:'On Time',condition:'Passed - Complete',inspection:'Board and sensor accessories returned and checked.',status:'Returned & Closed',impacted:false,report:false,semester:'Spring 2025'},
  {id:'MIC-USB-024',name:'USB Condenser Microphone Kit',icon:'◉',serial:'MIC-USB-024',lab:'Media Arts Center 201',facility:'Media Arts Center',location:'Audio Studio',borrowed:'Dec 05, 2024',returned:'Dec 08, 2024',duration:'3 days, 0 hrs',time:'On Time',condition:'Passed - Excellent Condition',inspection:'Microphone and cable tested; no faults recorded.',status:'Returned & Closed',impacted:false,report:false,semester:'Fall 2024'},
  {id:'PRN-3D-018',name:'Creality Ender 3D Printer',icon:'▤',serial:'PRN-3D-018',lab:'Innovation Hub 0-08',facility:'Innovation Hub',location:'Makerspace Facility',borrowed:'Nov 18, 2024',returned:'Nov 22, 2024',duration:'4 days, 0 hrs',time:'On Time',condition:'Passed - Clean & Calibrated',inspection:'Bed leveling and print test completed.',status:'Returned & Closed',impacted:true,report:false,semester:'Fall 2024'},
  {id:'TAB-IPD-010',name:'iPad Pro 11-inch Field Research Kit',icon:'▣',serial:'TAB-IPD-010',lab:'Engineering Block 305',facility:'Engineering Block',location:'Research Computing Lab',borrowed:'Oct 12, 2024',returned:'Oct 16, 2024',duration:'4 days, 0 hrs',time:'On Time',condition:'Passed - Standard Condition',inspection:'Screen, stylus and charging accessories checked.',status:'Returned & Closed',impacted:false,report:false,semester:'Fall 2024'},
  {id:'LGT-LED-002',name:'LED Studio Lighting Set',icon:'☼',serial:'LGT-LED-002',lab:'Media Arts Center 110',facility:'Media Arts Center',location:'Media Studio',borrowed:'Sep 28, 2024',returned:'Oct 02, 2024',duration:'4 days, 0 hrs',time:'On Time',condition:'Passed - Excellent Condition',inspection:'All light panels and stands tested.',status:'Returned & Closed',impacted:false,report:false,semester:'Fall 2024'},
  {id:'DRN-MINI-015',name:'DJI Mini 3 Pro Drone Kit',icon:'✥',serial:'DRN-MINI-015',lab:'Engineering Block E-210',facility:'Engineering Block',location:'Robotics Lab',borrowed:'Sep 10, 2024',returned:'Sep 13, 2024',duration:'3 days, 0 hrs',time:'On Time',condition:'Passed - Flight Check Complete',inspection:'Propellers, battery and controller inspected.',status:'Returned & Closed',impacted:true,report:false,semester:'Fall 2024'},
  {id:'MTR-DMM-039',name:'Fluke Digital Multimeter Kit',icon:'▥',serial:'MTR-DMM-039',lab:'Engineering Block E-204',facility:'Engineering Block',location:'Electronics Lab E-204',borrowed:'Aug 20, 2024',returned:'Aug 23, 2024',duration:'3 days, 0 hrs',time:'On Time',condition:'Passed - Verified',inspection:'Calibration verification logged by lab staff.',status:'Returned & Closed',impacted:false,report:false,semester:'Fall 2024'},
  {id:'PRJ-4K-005',name:'Epson 4K Projector & Remote',icon:'▣',serial:'PRJ-4K-005',lab:'Media Arts Center 105',facility:'Media Arts Center',location:'Presentation Suite',borrowed:'Jul 18, 2024',returned:'Jul 22, 2024',duration:'4 days, 0 hrs',time:'On Time',condition:'Passed - Image Test Clear',inspection:'Lens and remote tested; cable set complete.',status:'Returned & Closed',impacted:false,report:false,semester:'Fall 2024'},
  {id:'ROB-ARM-007',name:'Arduino Robotic Arm Assembly',icon:'⚙',serial:'ROB-ARM-007',lab:'Innovation Hub 0-12',facility:'Innovation Hub',location:'Robotics Lab',borrowed:'Jun 06, 2024',returned:'Jun 10, 2024',duration:'4 days, 0 hrs',time:'On Time',condition:'Passed - Functional',inspection:'Servo motors and controller verified.',status:'Returned & Closed',impacted:true,report:false,semester:'Fall 2024'}
];

const pageSize = 4;
let currentPage = 1;
let activeType = 'all';
const rowsEl = document.getElementById('historyRows');
const searchEl = document.getElementById('recordSearch');
const facilityEl = document.getElementById('facilityFilter');
const semesterEl = document.getElementById('semesterFilter');
const emptyEl = document.getElementById('emptyState');
const modalBackdrop = document.getElementById('modalBackdrop');
const toastEl = document.getElementById('toast');
let toastTimer;

function filteredRecords(){
  const query = searchEl.value.trim().toLowerCase();
  return records.filter(r => {
    const matchesQuery = !query || [r.id,r.name,r.serial,r.lab,r.facility].join(' ').toLowerCase().includes(query);
    const matchesFacility = facilityEl.value === 'all' || r.facility === facilityEl.value;
    const matchesSemester = semesterEl.value === 'all' || r.semester === semesterEl.value;
    const matchesType = activeType === 'all' || (activeType === 'impacted' && r.impacted) || (activeType === 'reports' && r.report);
    return matchesQuery && matchesFacility && matchesSemester && matchesType;
  });
}
function escapeHTML(value){return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function render(){
  const filtered = filteredRecords();
  const pageCount = Math.max(1,Math.ceil(filtered.length/pageSize));
  currentPage = Math.min(currentPage,pageCount);
  const pageItems = filtered.slice((currentPage-1)*pageSize,currentPage*pageSize);
  rowsEl.innerHTML = pageItems.map(r => `
    <tr>
      <td><div class="asset-cell"><div class="asset-thumb" aria-hidden="true">${r.icon}</div><div class="asset-info"><strong>${escapeHTML(r.name)}</strong><small>${escapeHTML(r.id)} · Serial: ${escapeHTML(r.serial)}</small></div></div></td>
      <td><div class="date-line">▣ ${escapeHTML(r.borrowed)}</div><div class="time-line">▣ ${escapeHTML(r.returned)} (On Time)</div><div class="duration">Duration: ${escapeHTML(r.duration)}</div></td>
      <td><div class="facility-name">${escapeHTML(r.facility)}</div><div class="facility-sub">${escapeHTML(r.lab)}</div></td>
      <td><div class="clearance">✓ ${escapeHTML(r.condition)}</div><div class="clearance-detail">${escapeHTML(r.inspection)}</div></td>
      <td><span class="status-pill">Returned<br />&amp; Closed</span></td>
      <td><div class="record-actions"><button class="text-action" data-action="receipt" data-id="${r.id}">♧ View Digital Receipt</button><button class="text-action" data-action="certificate" data-id="${r.id}">♧ Inspection Certificate</button></div></td>
    </tr>`).join('');
  emptyEl.hidden = filtered.length !== 0;
  document.querySelector('.table-scroll').style.display = filtered.length ? 'block' : 'none';
  document.getElementById('resultCount').textContent = `Showing ${pageItems.length} of ${filtered.length} audit-logged custody records`;
  document.getElementById('pageSummary').textContent = `Page ${currentPage} of ${pageCount}  |  ${filtered.length} records permanently archived on Ledger`;
  renderPagination(pageCount);
}
function renderPagination(pageCount){
  const container = document.getElementById('pagination');
  const visible = [];
  visible.push(`<button data-page="prev" ${currentPage===1?'disabled':''}>Previous</button>`);
  for(let p=1;p<=pageCount;p++) visible.push(`<button data-page="${p}" class="${p===currentPage?'current':''}" ${p===currentPage?'aria-current="page"':''}>${p}</button>`);
  visible.push(`<button data-page="next" ${currentPage===pageCount?'disabled':''}>Next</button>`);
  container.innerHTML = visible.join('');
}
function showToast(message){
  toastEl.textContent = message;toastEl.classList.add('show');clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toastEl.classList.remove('show'),2600);
}
function openModal(title,html){document.getElementById('modalTitle').textContent=title;document.getElementById('modalContent').innerHTML=html;modalBackdrop.hidden=false;document.getElementById('modalClose').focus();}
function closeModal(){modalBackdrop.hidden=true;}
function recordModal(record,kind){
  const isReceipt=kind==='receipt';
  const title=isReceipt?'Digital Return Receipt':'Inspection Certificate';
  const rows = isReceipt ? [ ['Receipt reference',`CS-RCPT-${record.id}`],['Equipment',record.name],['Asset identifier',record.id],['Borrowed',record.borrowed],['Returned',record.returned],['Return status','Verified · On time'],['Custodian facility',record.lab] ] : [ ['Certificate reference',`CS-INSP-${record.id}`],['Equipment',record.name],['Serial number',record.serial],['Inspection outcome',record.condition],['Inspection notes',record.inspection],['Facility',record.facility],['Ledger status',record.status] ];
  openModal(title,`<p class="subheading">This is a sample frontend record. Official verification will be available after backend integration.</p>${rows.map(([k,v])=>`<div class="modal-content-line"><b>${escapeHTML(k)}:</b> ${escapeHTML(v)}</div>`).join('')}`);
}
function downloadFile(filename,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}
function csvCell(value){return `"${String(value).replace(/"/g,'""')}"`;}

document.addEventListener('click',e=>{
  const typeButton=e.target.closest('.filter-tab');
  if(typeButton){activeType=typeButton.dataset.filter;currentPage=1;document.querySelectorAll('.filter-tab').forEach(b=>{const on=b===typeButton;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});render();}
  const pageButton=e.target.closest('[data-page]');
  if(pageButton){const page=pageButton.dataset.page;const max=Math.max(1,Math.ceil(filteredRecords().length/pageSize));if(page==='prev')currentPage=Math.max(1,currentPage-1);else if(page==='next')currentPage=Math.min(max,currentPage+1);else currentPage=Number(page);render();}
  const action=e.target.closest('[data-action]');
  if(action){const record=records.find(r=>r.id===action.dataset.id);if(record)recordModal(record,action.dataset.action);}
});
[searchEl,facilityEl,semesterEl].forEach(el=>el.addEventListener(el===searchEl?'input':'change',()=>{currentPage=1;render();}));
document.getElementById('exportBtn').addEventListener('click',()=>{
  const data=filteredRecords();const columns=['Asset ID','Equipment','Serial','Borrowed','Returned','Duration','Facility','Inspection','Status'];
  const lines=[columns.map(csvCell).join(','),...data.map(r=>[r.id,r.name,r.serial,r.borrowed,r.returned,r.duration,r.lab,r.condition,r.status].map(csvCell).join(','))];
  downloadFile('campusshare-history.csv',lines.join('\n'),'text/csv;charset=utf-8');showToast(`Exported ${data.length} history records as CSV.`);
});
document.getElementById('auditBtn').addEventListener('click',()=>{
  const data=filteredRecords();const textContent=[`CAMPUSSHARE - AUDIT TRANSCRIPT`,`Generated: ${new Date().toLocaleString()}`,`Student: Alex Chen`,`Records included: ${data.length}`,``,`This downloadable demo transcript is generated from sample browser data. It is not an official or cryptographically signed audit record.`,``,...data.map((r,i)=>`${i+1}. ${r.name} (${r.id})\n   Borrowed: ${r.borrowed}\n   Returned: ${r.returned} - ${r.time}\n   Facility: ${r.lab}\n   Inspection: ${r.condition}\n   Ledger status: ${r.status}`)].join('\n');
  downloadFile('campusshare-audit-transcript.txt',textContent,'text/plain;charset=utf-8');showToast('Audit transcript downloaded.');
});
document.getElementById('policyLink').addEventListener('click',e=>{e.preventDefault();openModal('Borrowing Policy v4.2',`<p class="modal-content-line">Return all borrowed equipment by the approved due date and time.</p><p class="modal-content-line">A lab custodian must verify returned equipment and record its condition.</p><p class="modal-content-line">Report missing parts, damage or technical issues to the issuing lab promptly.</p><p class="modal-content-line">This is placeholder policy copy for the frontend prototype. Replace it with your institution's approved policy before launch.</p>`);});
document.getElementById('modalClose').addEventListener('click',closeModal);
document.getElementById('modalDone').addEventListener('click',closeModal);
modalBackdrop.addEventListener('click',e=>{if(e.target===modalBackdrop)closeModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
document.getElementById('menuToggle').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
render();
