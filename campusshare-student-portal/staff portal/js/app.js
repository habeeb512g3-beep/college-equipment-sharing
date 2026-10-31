
(function(){
'use strict';
const KEY='campusshare.ownerportal.v2';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return {}}};
let db=read();let activeFilter='all';
function save(){localStorage.setItem(KEY,JSON.stringify(db));}
function id(){return 'CS-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)}
function init(){
 if(!Array.isArray(db.equipment)) db.equipment=[{"id": "EQ-MS-4802", "name": "Thermo Scientific Orbitrap Exploris 480", "description": "", "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuDWYUDSWFvjbbKcxE64W8Bx2z6yF3LKoeRE-KtqK6C5HOTx9QlPbPQHtlVNRLrJvpnUbsoQ_uXSRwvpJXdByVcVrOhztAdSTH6uGDBaqHTcCQEoEML_1x2TRyhGIlndoF6MGzKw9RBR2v_gPpgQ29rcsJUCcD_30XArLru5YRClr4urR5RIPP1s3c15veNpoORH--2UpSURA14OlOu-SvUw4fpuFC3HoRdnI3n0kHQ", "location": "Bio Core Bldg 76, Room 310", "status": "available"}, {"id": "EQ-MIC-9801", "name": "Zeiss LSM 980 with Airyscan 2", "description": "", "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuBB-nv3LngHYr5ydABjHz1AEhOovW5hIF0kEL3QysQJp_KS3stOL8Euuwxpx7FNrNgtHPyZe-hUwoYNfC1CK7cSyCcHFmmQlKBi5JQbO5lGFs4CZMcc30wUUrGl9FcIP8kSA2Po19-BJ_H8_fp0sbwbwuJQsvIqfQqX3eLpOw0omU8afrL07-1wM9SLFtWdz5AfvRtrORXZPg0rOVqc882ftgtlUa4AD7UomTcd3Og", "location": "Imaging Core, Room 104", "status": "in-use"}, {"id": "EQ-GEN-6003", "name": "Illumina NovaSeq 6000 Sequencer", "description": "", "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuCJssts3TSdAxkTivVD6mJvxcbEpSEqIjeDhD9G4WVSCnZy8j6kNySJHdRaJIH_dv4b1mTpLibZwvT2j7VipMNTHmMxmBHpzq2mbM8ZFtUwAxV-Bz5aI1kd2E44zgnhLEVhz1eMRWelA9BEb2Eq2wzC0LhvBQGb6OLljSTP3Gsm8sNot0iJ-DS20TIbzPZ5inr-gYKgLn0GySyvbwgzpqzuDKPZdjbrya_WojgSDe4", "location": "Genomics Hub, Bay 2", "status": "available"}, {"id": "EQ-EM-2100", "name": "JEOL JEM-2100F Field Emission TEM", "description": "", "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuCA2H6DhzJzZeUoZ9y89y22FBi6VFJfTAFFCyzJ0gkcWB-zRnJR2zVANEAWz1tf3szpO1_scfodH5PLESIkc2vB5t0E_Wsz5RcJkOjFm14nUCbhJ0auaud5SJ22zAM8VMRYXeBdkExubj5I1o04BRvv0C7kB2c17v9-b5YkUEp7uLFEI9TVLO5ev6W71Xmoin96uiRKlDaZiIqajk-pBuxPq-fbTCRvk-zDG08x930", "location": "NanoFab Suite, B12", "status": "maintenance"}, {"id": "EQ-CEN-0100", "name": "Beckman Coulter Optima XPN-100", "description": "", "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuBAgn_E9stYBtzLWRPHctvB-B5Jbne16aLWpjnTCTRCCTtenjwNn0XwhyOppdbb7BZUIrFBUkbGUEwNktRMXwSCVu27FVpOVaYcW_hBAkiqGPgyC4Z4EcLCM7_N8SnJkkHu7rNtUMY1YvH5E5yZxFM8J7oMzwI2PPJNv-l-i85kpm-w4jI8Cqh6gRPKuJla_9wT0FSESKmI_LNwA_IktPcrVoBvtNdBsCC_J8bbrLI", "location": "Prep Lab 2A", "status": "available"}, {"id": "EQ-CYT-0003", "name": "BD FACSAria III Cell Sorter", "description": "", "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuDNlgjREKEMbzREz3BF5REkn-fnX_rlTJzMjbB-330YXdmMntvszPLjwxtKCW_IR99aXcGlBcTfHa358GgJPEEnWMPZPnNCi39bsM09hglk2o7Zrq_ph3292BPBcYDg4s6-wCpIaHQJcB9Yl4V-qSZV6xfUNhPQwfTG6kXPY9Y4PBCsMbLbjQFYoQ9XUqCI0nOMlYeVxlGKjqvAakxIfLDm3QHj8leTEmRjsnsVepY", "location": "Immunology Lab, Rm 215", "status": "overdue"}];
 if(!Array.isArray(db.requests)) db.requests=[{"id": "REQ-INIT-1", "category": "borrowed", "search": "elena rostova facsaria cell sorter cytometry borrowed in-use EQ-CYT-0003 return", "title": "Dr. Elena Rostova", "equipment": "EQ-CYT-0003", "date": "", "startedAt": null, "elapsed": 0}, {"id": "REQ-INIT-2", "category": "returned", "search": "david miller zeiss lsm 980 returned completed audit history USR-11094 EQ-MIC-9801", "title": "Prof. David K. Miller", "equipment": "EQ-MIC-9801", "date": "", "startedAt": null, "elapsed": 0}, {"id": "REQ-INIT-3", "category": "pending", "search": "marcus chen harvard mass spec orbitrap exploris peptide USR-89214 EQ-MS-4802", "title": "Dr. Marcus Chen", "equipment": "EQ-MS-4802", "date": "2024-10-25", "startedAt": null, "elapsed": 0}, {"id": "REQ-INIT-4", "category": "pending", "search": "sarah lin mit koch confocal zeiss airyscan USR-44102 EQ-MIC-9801 tumor extravasation", "title": "Sarah Lin", "equipment": "EQ-MIC-9801", "date": "2024-10-26", "startedAt": null, "elapsed": 0}, {"id": "REQ-INIT-5", "category": "waitlist", "search": "david miller broad institute novaseq illumina sequencing genomics USR-11094 EQ-GEN-6003", "title": "Prof. David K. Miller", "equipment": "EQ-GEN-6003", "date": "2024-10-28", "startedAt": null, "elapsed": 0}, {"id": "REQ-INIT-6", "category": "approved", "search": "elena rostova boston university ultracentrifuge beckman optima EQ-CEN-901", "title": "Dr. Elena Rostova", "equipment": "EQ-CEN-901", "date": "2024-10-27", "startedAt": null, "elapsed": 0}, {"id": "REQ-INIT-7", "category": "rejected", "search": "kevin vance northeastern jeol tem jem-2100f USR-58291", "title": "Kevin Vance", "equipment": "", "date": "", "startedAt": null, "elapsed": 0}];
 if(!Array.isArray(db.history)) db.history=[];
 save();
}
function findDate(c){const t=c.innerText||'';const m=t.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2},?\\s+\\d{4}/i);return m?new Date(m[0]).toISOString().slice(0,10):''}
function toast(msg){let el=$('#appToast');if(!el){el=document.createElement('div');el.id='appToast';el.style.cssText='position:fixed;bottom:22px;right:22px;z-index:9999;background:#213145;color:white;padding:12px 18px;border-radius:10px;box-shadow:0 4px 18px #0003';document.body.append(el)}el.textContent=msg;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2800)}
function addHistory(r,duration){db.history.unshift({id:id(),requestId:r.id,equipment:r.equipment||r.title,user:r.search.split(' ')[0]||'Researcher',date:new Date().toISOString(),duration,status:'Completed'});r.category='returned';r.startedAt=null;r.elapsed=0;save()}
function syncCards(){
 $$('.request-card').forEach((c,i)=>{let r=db.requests[i];if(!r)return;c.dataset.category=r.category;c.dataset.requestId=r.id;if(r.category==='approved'&&!$('.app-start-timer',c)){let b=document.createElement('button');b.className='app-start-timer px-3 py-2 rounded-lg bg-primary text-white';b.textContent=r.startedAt?'Stop Timer':'Start Timer';c.append(b)}else if(r.category!=='approved')$('.app-start-timer',c)?.remove();});
}
function equipmentPage(){
 const modal=$('#addEquipmentModal'), grid=$('#equipmentGridContainer');if(!modal||!grid)return;
 let editing=null, imageData='';
 const name=$('#equipmentNameField'),desc=$('#equipmentDescriptionField'),loc=$('#equipmentLocationField'),file=$('#equipmentImageField'),preview=$('#equipmentImagePreview');
 function open(item){editing=item?.id||null;name.value=item?.name||'';desc.value=item?.description||'';loc.value=item?.location||'';imageData=item?.image||'';preview.src=imageData;preview.classList.toggle('hidden',!imageData);modal.classList.remove('hidden');document.body.style.overflow='hidden'}
 function close(){modal.classList.add('hidden');document.body.style.overflow=''}
 $('#openAddModalBtn')?.addEventListener('click',()=>open());
 $('#closeAddModalBtn')?.addEventListener('click',close);$('#cancelModalBtn')?.addEventListener('click',close);$('#modalOverlay')?.addEventListener('click',close);
 file?.addEventListener('change',()=>{const f=file.files?.[0];if(!f)return;if(!f.type.startsWith('image/')){toast('Please choose an image file.');file.value='';return}if(f.size>2*1024*1024){toast('Image must be 2 MB or smaller.');file.value='';return}const rd=new FileReader();rd.onload=()=>{imageData=rd.result;preview.src=imageData;preview.classList.remove('hidden')};rd.readAsDataURL(f)});
 function render(){grid.innerHTML='';db.equipment.forEach(e=>{const c=document.createElement('article');c.className='equipment-card flex flex-col rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden';c.dataset.id=e.id;c.dataset.name=e.name;c.dataset.room=e.location;c.dataset.status=e.status||'available';c.innerHTML=`<div class="h-44 bg-surface-container overflow-hidden">${e.image?`<img src="${e.image}" alt="${esc(e.name)}" class="w-full h-full object-cover">`:'<div class="h-full flex items-center justify-center text-outline">No image</div>'}</div><div class="p-5 flex-1"><h2 class="font-title-md">${esc(e.name)}</h2><p class="text-sm text-on-surface-variant mt-2">${esc(e.description)}</p><p class="text-sm mt-3">📍 ${esc(e.location)}</p><div class="flex gap-2 mt-5"><button type="button" data-edit="${e.id}" class="px-3 py-2 rounded bg-surface-container">Edit</button><button type="button" data-delete="${e.id}" class="px-3 py-2 rounded bg-error-container text-error">Delete</button></div></div>`;grid.append(c)});$('#visibleCount')&&($('#visibleCount').textContent=db.equipment.length);const tbody=$('#equipmentTableContainer tbody');if(tbody)tbody.innerHTML=db.equipment.map(e=>`<tr class="border-b"><td class="px-4 py-3"><strong>${esc(e.name)}</strong><div class="text-xs">${esc(e.id)}</div></td><td class="px-4 py-3">—</td><td class="px-4 py-3">${esc(e.location)}</td><td class="px-4 py-3">${esc(e.status||'available')}</td><td class="px-4 py-3">—</td><td class="px-4 py-3 text-right"><button data-edit="${e.id}" class="px-2 py-1 bg-surface-container rounded">Edit</button> <button data-delete="${e.id}" class="px-2 py-1 bg-error-container text-error rounded">Delete</button></td></tr>`).join('')}
 const saveEquipment=()=>{if(!name.value.trim()||!loc.value.trim()){toast('Name and location are required.');return}const item={id:editing||id(),name:name.value.trim(),description:desc.value.trim(),location:loc.value.trim(),image:imageData,status:'available'};if(editing){const i=db.equipment.findIndex(x=>x.id===editing);if(i>=0)db.equipment[i]=item}else db.equipment.push(item);save();render();close();toast(editing?'Equipment updated.':'Equipment added.')};$('#publishEquipmentBtn')?.addEventListener('click',saveEquipment);$('#saveDraftBtn')?.addEventListener('click',saveEquipment);
 grid.addEventListener('click',e=>{const eb=e.target.closest('[data-edit]'),dbtn=e.target.closest('[data-delete]');if(eb){const item=db.equipment.find(x=>x.id===eb.dataset.edit);open(item)}if(dbtn&&confirm('Delete this equipment?')){db.equipment=db.equipment.filter(x=>x.id!==dbtn.dataset.delete);save();render();toast('Equipment deleted.')}});
 render();
 $('#gridToggleBtn')?.addEventListener('click',()=>{grid.classList.remove('hidden');$('#equipmentTableContainer')?.classList.add('hidden')});
 $('#tableToggleBtn')?.addEventListener('click',()=>{grid.classList.add('hidden');$('#equipmentTableContainer')?.classList.remove('hidden')});
 const search=$('#equipmentSearchInput'),cat=$('#categoryFilter'),status=$('#statusFilter'),location=$('#locationFilter');
 function filterEq(){const q=(search?.value||'').toLowerCase(),st=status?.selectedOptions[0]?.textContent.toLowerCase()||'all',lo=location?.selectedOptions[0]?.textContent.toLowerCase()||'all';$$('.equipment-card',grid).forEach(c=>{const okq=(c.dataset.name+' '+c.dataset.room).toLowerCase().includes(q),oks=st.startsWith('all')||c.dataset.status===st.split(' ')[0],okl=lo.startsWith('all')||c.dataset.room.toLowerCase().includes(lo.split(' (')[0]);c.style.display=okq&&oks&&okl?'':'none'})}
 [search,cat,status,location].forEach(x=>x?.addEventListener('input',filterEq));[cat,status,location].forEach(x=>x?.addEventListener('change',filterEq));
}
function requestPage(){
 const container=$('#requestsContainer');if(!container)return;
 window.sendChatMessage=(ev)=>{ev?.preventDefault();const input=$('#chatInputMessage');if(!input?.value.trim())return;const list=$('#chatMessagesList');if(list){const msg=document.createElement('div');msg.className='my-2 p-2 rounded bg-surface-container';msg.textContent=input.value.trim();list.append(msg)}input.value=''};$('#chatInputMessage')?.closest('form')?.addEventListener('submit',window.sendChatMessage);
 syncCards();
 container.addEventListener('click',e=>{const btn=e.target.closest('button');if(!btn)return;const card=btn.closest('.request-card');if(!card)return;const r=db.requests.find(x=>x.id===card.dataset.requestId)||db.requests[Array.from($$('.request-card')).indexOf(card)];if(!r)return;const t=btn.innerText.trim().toLowerCase();
 if(t.includes('confirm return')||t.includes('complete request')){addHistory(r,r.startedAt?formatDuration(Date.now()-r.startedAt+r.elapsed):'Not recorded');save();syncCards();toast('Return completed and recorded in History.');}
 else if(t.includes('accept')||t.includes('approve')||t==='promote'){r.category='approved';save();syncCards();toast('Request approved.');}
 else if(t.includes('decline')||t.includes('reject')){r.category='rejected';save();syncCards();toast('Request declined.');}
 else if(t.includes('waitlist')||t.includes('waiting')){r.category='waitlist';save();syncCards();toast('Request moved to waiting list.');}
 else if(t.includes('remove')&&r.category==='waitlist'){r.category='rejected';save();syncCards();toast('Request removed.')}
 else if(btn.classList.contains('app-start-timer')){if(!r.startedAt){r.startedAt=Date.now();btn.textContent='Stop Timer';toast('Usage timer started.')}else{const ms=Date.now()-r.startedAt+r.elapsed;r.elapsed=ms;r.startedAt=null;addHistory(r,formatDuration(ms));btn.remove();toast('Usage completed and added to History.')}save();}
 });
 $('#searchInput')?.addEventListener('input',()=>applyFilters());
 function applyFilters(){const q=($('#searchInput')?.value||'').toLowerCase();$$('.request-card',container).forEach((c,i)=>{const r=db.requests[i];c.style.display=(!q||(r.search+' '+r.title).toLowerCase().includes(q))?'':'none'})}
}
function formatDuration(ms){const m=Math.floor(ms/60000);return `${Math.floor(m/60)}h ${m%60}m`}
function calendarPage(){
 const main=$('main');if(!main)return;
 let wrap=$('#persistentCalendarBookings');if(!wrap){wrap=document.createElement('section');wrap.id='persistentCalendarBookings';wrap.className='mt-6 p-5 rounded-xl bg-surface-container-lowest';main.append(wrap)}
 function renderApproved(){const approved=db.requests.filter(r=>['approved','borrowed'].includes(r.category));wrap.innerHTML='<h2 class="text-xl font-semibold mb-3">Approved bookings</h2>'+(approved.length?approved.map(r=>`<div class="border-b py-3"><strong>${esc(r.title)}</strong><div class="text-sm text-on-surface-variant">${esc(r.equipment)} · ${r.date||'Date not specified in request'}</div></div>`).join(''):'<p class="text-sm text-on-surface-variant">No approved bookings yet.</p>')}
 renderApproved();
 main.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const t=b.innerText.trim().toLowerCase();if(t==='accept'||t==='approve'||t==='decline'){const r=db.requests.find(x=>x.category==='pending');if(r){r.category=t==='decline'?'rejected':'approved';save();renderApproved();toast('Booking '+(t==='decline'?'declined':'approved')+'.')}}});
}
function historyPage(){
 const exportCsv=()=>{const rows=[['Equipment','User','Date','Duration','Status'],...db.history.map(h=>[h.equipment,h.user,h.date,h.duration,h.status])];const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='campusshare-history.csv';a.click();URL.revokeObjectURL(a.href)};
 $('#btn-export-csv')?.addEventListener('click',exportCsv);$('#btn-export-pdf')?.addEventListener('click',()=>window.print());

 const input=$('#global-search-input'), filters=[$('#filter-category'),$('#filter-status'),$('#filter-equipment'),$('#filter-institution')];
 const rows=$$('tbody tr, .history-row, [data-transaction]');
 function apply(){const q=(input?.value||'').toLowerCase();rows.forEach(row=>{row.style.display=!q||row.innerText.toLowerCase().includes(q)?'':'none'});$$('#persistentCompletedHistory > div').forEach(row=>{row.style.display=!q||row.innerText.toLowerCase().includes(q)?'':'none'});}
 input?.addEventListener('input',apply);filters.forEach(x=>x?.addEventListener('change',apply));$('#btn-reset-filters')?.addEventListener('click',()=>{if(input)input.value='';filters.forEach(x=>{if(x)x.selectedIndex=0});apply()});
 if(db.history.length){let section=$('#persistentCompletedHistory');if(!section){section=document.createElement('section');section.id='persistentCompletedHistory';section.className='mt-6 p-5 rounded-xl bg-surface-container-lowest';$('main')?.append(section)}section.innerHTML='<h2 class="text-lg font-semibold mb-3">Activity &amp; completed transactions</h2>'+db.history.map(h=>`<div class="py-2 border-b text-sm"><strong>${esc(h.equipment)}</strong> · ${esc(h.user)} · <span class="font-semibold">${esc(h.status||'Completed')}</span> · ${new Date(h.date).toLocaleString()} · ${esc(h.duration||'Duration unavailable')}${h.reason?' · '+esc(h.reason):''}</div>`).join('')}
}
function dashboard(){
 const main=$('main');if(!main)return;
 const counts={
  total:db.equipment.length,
  available:db.equipment.filter(e=>(e.status||'available').toLowerCase()==='available').length,
  pending:db.requests.filter(r=>r.category==='pending').length,
  approved:db.requests.filter(r=>r.category==='approved').length,
  inUse:db.requests.filter(r=>r.category==='borrowed'||r.category==='in-use').length,
  completed:db.history.filter(h=>h.status==='Completed').length
 };
 const cards=$$('main .grid > div').slice(0,6);
 const vals=[`${counts.total} Units`,`${counts.available} Units`,`${counts.pending} Requests`,`${counts.approved} Active`,`${counts.inUse} In-Use`,`${counts.completed} Completed`];
 cards.forEach((card,i)=>{const value=card.querySelector('.font-headline-lg');if(value)value.textContent=vals[i]||'0'});
 // Update the request badge in the sidebar from the same shared request store.
 const requestLink=$('a[data-path="booking-requests"]');
 const badge=requestLink?.querySelector('span:last-child');
 if(badge)badge.textContent=String(counts.pending);
 // Reflect current status on the dashboard's request rows after actions.
 $$('.request-item').forEach(item=>{
   const text=(item.innerText||'').toLowerCase();
   const r=db.requests.find(x=>{
     const search=(x.search||'').toLowerCase(),title=(x.title||'').toLowerCase();
     return (title&&text.includes(title.split(',')[0].toLowerCase())) ||
       (search&&search.split(' ').some(w=>w.length>4&&text.includes(w)));
   });
   if(r){item.dataset.requestId=r.id;item.dataset.status=r.category;
     const actionArea=item.querySelector('.flex.items-center.gap-space-sm:last-child');
     if(['approved','rejected','waitlist','returned'].includes(r.category)&&actionArea){
       actionArea.querySelectorAll('button').forEach(b=>{b.disabled=true;b.classList.add('opacity-50','cursor-not-allowed')});
     }
   }
 });
}
function globalNav(){document.querySelectorAll('a[href="#"]').forEach(a=>{const t=a.innerText.trim().toLowerCase();a.addEventListener('click',e=>{e.preventDefault();toast(t.includes('settings')?'Settings are not configured in this offline portal.':t.includes('help')?'Help: contact your portal administrator.':(a.innerText.trim()||'This option')+' is not available in this offline demo.')})})}

// Inline-action compatibility retained from the original portal markup.
function setRequestStatus(status, card){const c=card||document.querySelector('.request-card');if(!c)return;const idx=$$('.request-card').indexOf(c),r=db.requests[idx];if(r){r.category=status;save();syncCards();}}
window.showToast=toast;
window.filterEquipmentCards=()=>{$('#equipmentSearchInput')?.dispatchEvent(new Event('input'))};
window.toggleDetails=(id,btn)=>{const el=$('#'+id);if(el){el.classList.toggle('hidden');if(btn)btn.textContent=el.classList.contains('hidden')?'View details':'Hide details'}};
window.switchTab=(btn,category)=>{activeFilter=category;$$('.request-card').forEach((c,i)=>{const r=db.requests[i];c.style.display=category==='all'||r?.category===category?'':'none'});$$('.tab-btn').forEach(x=>x.classList.remove('bg-surface-container-lowest'));btn?.classList.add('bg-surface-container-lowest')};
window.filterByTab=category=>window.switchTab(null,category);
window.handleSearch=()=>$('#searchInput')?.dispatchEvent(new Event('input'));
window.updateBatchCounter=()=>{const n=$$('.batch-checkbox:checked').length;$('#selectedCount')&&($('#selectedCount').textContent=n);$('#batchBar')?.classList.toggle('hidden',!n)};
window.clearBatchSelection=()=>{$$('.batch-checkbox').forEach(x=>x.checked=false);window.updateBatchCounter()};
window.handleBatchAccept=()=>{$$('.batch-checkbox:checked').forEach(x=>setRequestStatus('approved',x.closest('.request-card')));window.clearBatchSelection();toast('Selected requests approved.')};
window.approveDirect=(btn)=>setRequestStatus('approved',btn?.closest('.request-card'));
window.promoteToApproved=(btn)=>setRequestStatus('approved',btn?.closest('.request-card'));
window.removeFromWaitlist=btn=>setRequestStatus('rejected',btn?.closest('.request-card'));
window.revokeAccess=btn=>{if(confirm('Revoke this booking?'))setRequestStatus('rejected',btn?.closest('.request-card'))};
window.reopenReview=btn=>setRequestStatus('pending',btn?.closest('.request-card'));
window.downloadCheckinSlip=(name,id)=>toast('Check-in slip prepared for '+name+' ('+id+').');
let modalTarget=null;window.openRejectModal=(user)=>{modalTarget=user||null;$('#rejectionModal')?.classList.remove('hidden');$('#rejectionModal')?.classList.add('flex')};
window.closeRejectModal=()=>{$('#rejectionModal')?.classList.add('hidden');$('#rejectionModal')?.classList.remove('flex')};
window.insertReason=t=>{if($('#rejectionReasonInput'))$('#rejectionReasonInput').value=t};
window.confirmRejectAction=()=>{
 const reason=$('#rejectionReasonInput')?.value?.trim()||'Declined by owner';
 const item=$('.request-item[data-request-id]')||null;
 const wanted=String(modalTarget||'').toLowerCase();
 const r=(item&&db.requests.find(x=>x.id===item.dataset.requestId))||
   db.requests.find(x=>x.category==='pending'&&wanted&&(x.title||'').toLowerCase().includes(wanted.split(' ')[0]))||
   db.requests.find(x=>x.category==='pending');
 if(r)recordDecision(r,'Declined',reason);
 if(item){item.dataset.status='rejected';item.querySelectorAll('button').forEach(b=>b.disabled=true);}
 window.closeRejectModal();dashboard();toast('Request declined and recorded in History.');
};
window.openWaitlistModal=()=>{$('#waitlistModal')?.classList.remove('hidden');$('#waitlistModal')?.classList.add('flex')};
window.closeWaitlistModal=()=>{$('#waitlistModal')?.classList.add('hidden');$('#waitlistModal')?.classList.remove('flex')};
window.confirmWaitlistAction=()=>{setRequestStatus('waitlist');window.closeWaitlistModal();toast('Request moved to waiting list.')};
window.openBatchRejectModal=()=>window.openRejectModal();
window.openReturnInspectionModal=()=>{$('#returnInspectionModal')?.classList.remove('hidden');$('#returnInspectionModal')?.classList.add('flex')};
window.closeReturnInspectionModal=()=>{$('#returnInspectionModal')?.classList.add('hidden');$('#returnInspectionModal')?.classList.remove('flex')};
window.confirmReturnSignOff=()=>{const c=$('.request-card[data-category="borrowed"]');const r=db.requests.find(x=>x.category==='borrowed');if(r){addHistory(r,'Recorded at return');save()}window.closeReturnInspectionModal();toast('Return completed and saved to History.')};
window.insertInspectionNotes=t=>{const el=$('#returnInspectionNotes');if(el)el.value=t};
window.openChatDrawer=(name,equipment,eqId,img)=>{const p=$('#chatDrawerPanel');p?.classList.remove('translate-x-full');p?.classList.add('translate-x-0');$('#chatDrawerOverlay')?.classList.remove('opacity-0','pointer-events-none');const n=$('#chatDrawerUserName');if(n)n.textContent=name||'Researcher';const e=$('#chatDrawerEqId');if(e)e.textContent=eqId||equipment||'';const im=$('#chatAvatarImg');if(im&&img)im.src=img};
window.closeChatDrawer=()=>{$('#chatDrawerPanel')?.classList.add('translate-x-full');$('#chatDrawerPanel')?.classList.remove('translate-x-0');$('#chatDrawerOverlay')?.classList.add('opacity-0','pointer-events-none')};
window.insertQuickChatPrompt=t=>{const el=$('#chatInputMessage');if(el)el.value=t};
window.contactResearcher=(n)=>toast('Contact details for '+n+' are shown in the request record.');
function matchDashboardRequest(item){
 const text=(item?.innerText||'').toLowerCase();
 return db.requests.find(r=>{
  const title=(r.title||'').toLowerCase();
  const words=(r.search||'').toLowerCase().split(/\s+/).filter(w=>w.length>4);
  return (title&&text.includes(title.split(',')[0])) || words.some(w=>text.includes(w));
 })||db.requests.find(r=>r.category==='pending');
}
function recordDecision(r,status,reason=''){
 if(!r)return;
 const duplicate=db.history.some(h=>h.requestId===r.id&&h.status===status);
 if(!duplicate)db.history.unshift({id:id(),requestId:r.id,equipment:r.equipment||r.title,user:r.title||'Researcher',date:new Date().toISOString(),duration:'—',status,reason});
 r.category=status==='Approved'?'approved':'rejected';
 r.decisionAt=new Date().toISOString();
 if(reason)r.decisionReason=reason;
 save();
}
window.confirmAction=(btn,label)=>{
 const c=btn?.closest('.request-item');
 const r=matchDashboardRequest(c);
 if(r){
  const status=String(label).toLowerCase().includes('reject')?'Declined':'Approved';
  recordDecision(r,status);
 }
 if(c){c.dataset.status=String(label).toLowerCase().includes('reject')?'rejected':'approved';c.querySelectorAll('button').forEach(b=>{b.disabled=true;b.classList.add('opacity-50','cursor-not-allowed')});}
 dashboard();toast('Request '+(String(label).toLowerCase().includes('reject')?'declined':'approved')+' and recorded in History.');
};
window.filterRequests=(filter,btn)=>{$$('.request-item').forEach(c=>{c.style.display=filter==='all'||(filter==='urgent'&&c.classList.contains('urgent'))||(filter==='expiring'&&c.classList.contains('expiring'))?'':'none'});$$('.filter-btn').forEach(b=>b.classList.remove('active-tab'));btn?.classList.add('active-tab')};
window.openAuditDrawer=(eqId,userName,userId,inst,date,duration,status,postCond,hash)=>{const back=$('#audit-drawer-backdrop'),panel=$('#audit-drawer-panel');if(back){back.classList.remove('opacity-0','pointer-events-none');back.classList.add('opacity-100')}if(panel){panel.classList.remove('translate-x-full');panel.classList.add('translate-x-0')}const set=(id,v)=>{const e=$('#'+id);if(e)e.textContent=v||''};set('drawer-eq-id',eqId);set('drawer-user-name',userName);set('drawer-user-meta',userId+' • '+inst);set('drawer-hash',hash);};
window.closeAuditDrawer=()=>{const b=$('#audit-drawer-backdrop'),p=$('#audit-drawer-panel');b?.classList.add('opacity-0','pointer-events-none');p?.classList.add('translate-x-full')};
window.openRejectModal=window.openRejectModal;
window.confirmRejection=()=>window.confirmRejectAction();
window.closeAuditDrawer=window.closeAuditDrawer;
window.openChatDrawer=window.openChatDrawer;
window.closeChatDrawer=window.closeChatDrawer;
window.insertReason=window.insertReason;
window.showToast=toast;

init();globalNav();
const page=location.pathname.split('/').pop();
if(page==='equipment.html')equipmentPage();
if(page==='requests.html')requestPage();
if(page==='calendar.html')calendarPage();
if(page==='history.html')historyPage();
if(page==='dashboard.html')dashboard();
})();
