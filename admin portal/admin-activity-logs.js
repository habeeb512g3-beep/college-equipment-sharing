(() => {
  'use strict';
  const STORAGE_KEY = 'campusshare_admin_notifications_v1';
  const seed = [
    {id:'EVT-10428',time:'14:32:10',ago:'2 minutes ago',actor:'Admin Supervisor',origin:'NetID: admin-0042',actorIcon:'AS',category:'Security / Auth',tone:'blue',title:'Admin login verified from Campus Gateway via Node 2',detail:'IP: 192.168.0.245 · MFA verification completed successfully.',verify:'Verified',verifyTone:'verified',type:'activity',dateOffset:0},
    {id:'EVT-10427',time:'14:16:04',ago:'18 minutes ago',actor:'Lab Custodian M. Henderson',origin:'NetID: lab-077',actorIcon:'MH',category:'Inventory / Custody',tone:'green',title:'Equipment returned & inspection completed for Sony FX3 Cinema Rig',detail:'Inspection completed. Condition recorded as good; item returned to available inventory.',verify:'Success',verifyTone:'success',type:'activity',dateOffset:0},
    {id:'EVT-10426',time:'12:48:32',ago:'1 hour ago',actor:'System Automated',origin:'Telemetry daemon #08',actorIcon:'SY',category:'Incident Flag',tone:'red',title:'Technical issue reported for Sony FX3 lens track',detail:'Incident INC-402 opened. Equipment marked for staff review pending inspection.',verify:'Warning',verifyTone:'warning',type:'notification',dateOffset:0},
    {id:'EVT-10425',time:'12:34:18',ago:'2 hours ago',actor:'Dr. Marcus Vance',origin:'NetID: owner-018',actorIcon:'MV',category:'Owner Application',tone:'purple',title:'Owner application submitted: Robotics Research Lab',detail:'Application received with custodian details and equipment inventory declaration.',verify:'Under Review',verifyTone:'review',type:'notification',dateOffset:0},
    {id:'EVT-10424',time:'12:25:50',ago:'2 hours ago',actor:'System Automated',origin:'Notification service',actorIcon:'SY',category:'Booking Approval',tone:'blue',title:'Booking approved: Oscilloscope DS1054Z',detail:'Student notification queued for delivery. Pickup location: Electronics Lab 2.',verify:'Success',verifyTone:'success',type:'activity',dateOffset:0},
    {id:'EVT-10423',time:'11:12:06',ago:'3 hours ago',actor:'System Automated',origin:'Security monitor',actorIcon:'SY',category:'Security / Auth',tone:'red',title:'Repeated failed sign-in attempts detected',detail:'Five unsuccessful attempts from one session. Account is not automatically suspended.',verify:'Warning',verifyTone:'warning',type:'notification',dateOffset:0},
    {id:'EVT-10422',time:'10:42:51',ago:'4 hours ago',actor:'Lab Custodian A. Rao',origin:'NetID: lab-029',actorIcon:'AR',category:'Inventory / Custody',tone:'green',title:'Initial condition report recorded for Arduino Mega Kit',detail:'Condition marked Good. Handover was completed to the verified borrower.',verify:'Verified',verifyTone:'verified',type:'activity',dateOffset:0},
    {id:'EVT-10421',time:'09:18:27',ago:'5 hours ago',actor:'System Automated',origin:'Scheduler service',actorIcon:'SY',category:'Booking Reminder',tone:'gray',title:'Return reminder generated for Dell Precision workstation',detail:'Due date reminder generated and queued for the borrower.',verify:'Success',verifyTone:'success',type:'notification',dateOffset:0}
  ];
  let notifications = loadNotifications();
  let activeTab = 'activity';
  let page = 1;
  const pageSize = 5;
  const $ = id => document.getElementById(id);
  const body = $('logTableBody');
  const escapeHTML = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function loadNotifications(){
    try { const stored = localStorage.getItem(STORAGE_KEY); return stored ? JSON.parse(stored) : seed.filter(x => x.type === 'notification'); }
    catch { return seed.filter(x => x.type === 'notification'); }
  }
  function saveNotifications(){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications)); } catch { showToast('Browser storage is unavailable.'); } }
  function allRecords(){ return [...seed.filter(x => x.type === 'activity'), ...notifications].sort((a,b) => b.id.localeCompare(a.id)); }
  function showToast(message){ const el=$('toast'); el.textContent=message; el.classList.add('show'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>el.classList.remove('show'),2600); }
  function filteredRecords(){
    const q=$('searchInput').value.trim().toLowerCase(); const range=$('dateFilter').value;
    let rows=activeTab==='activity' ? allRecords().filter(x=>x.type==='activity') : notifications;
    if(q) rows=rows.filter(x=>[x.actor,x.origin,x.category,x.title,x.detail,x.id].join(' ').toLowerCase().includes(q));
    if(range==='today') rows=rows.filter(x=>x.dateOffset===0);
    if(range==='week') rows=rows.filter(x=>x.dateOffset<=6);
    if(range==='month') rows=rows.filter(x=>x.dateOffset<=29);
    return rows;
  }
  function render(){
    const rows=filteredRecords(); const total=rows.length; const pages=Math.max(1,Math.ceil(total/pageSize)); page=Math.min(page,pages);
    const start=(page-1)*pageSize; const visible=rows.slice(start,start+pageSize);
    body.innerHTML=visible.map(x=>`<tr>
      <td><span class="timestamp">${escapeHTML(x.time)} UTC</span><small class="timestamp">${escapeHTML(x.ago)}</small></td>
      <td><div class="actor"><span class="actor-icon">${escapeHTML(x.actorIcon)}</span><span><strong>${escapeHTML(x.actor)}</strong><small>${escapeHTML(x.origin)}</small></span></div></td>
      <td><span class="category-pill ${escapeHTML(x.tone)}">${escapeHTML(x.category)}</span></td>
      <td><span class="event-title">${escapeHTML(x.title)}</span><span class="event-detail">${escapeHTML(x.detail)}</span></td>
      <td><span class="verify-pill ${escapeHTML(x.verifyTone)}">${escapeHTML(x.verify)}</span></td>
    </tr>`).join('');
    $('emptyState').hidden=total!==0; $('resultSummary').textContent=`Showing ${total===0?0:start+1}–${Math.min(start+pageSize,total)} of ${total} ${activeTab==='activity'?'activity log':'system notification'} records`;
    $('pageInfo').textContent=`Page ${page} of ${pages} · ${total} records`; $('pageNumber').textContent=page;
    $('prevBtn').disabled=page<=1; $('nextBtn').disabled=page>=pages;
    $('activityCount').textContent=allRecords().filter(x=>x.type==='activity').length;
    $('notificationCount').textContent=notifications.length;
    $('securityCount').textContent=allRecords().filter(x=>x.category==='Security / Auth'||x.category==='Incident Flag').length;
  }
  function switchTab(tab){activeTab=tab;page=1;document.querySelectorAll('.tab').forEach(el=>{const active=el.dataset.tab===tab;el.classList.toggle('active',active);el.setAttribute('aria-selected',String(active));});render();}
  function csvCell(value){return '"'+String(value??'').replace(/"/g,'""')+'"';}
  function exportCSV(){const rows=filteredRecords();if(!rows.length){showToast('There are no records to export.');return;}const cols=['id','time','actor','origin','category','title','detail','verify'];const csv=[cols.join(','),...rows.map(r=>cols.map(c=>csvCell(r[c])).join(','))].join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`campusshare-${activeTab}-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);showToast(`${rows.length} records exported as CSV.`);}
  function clearNotifications(){notifications=[];saveNotifications();$('confirmModal').hidden=true;page=1;render();showToast('System notifications cleared from this browser.');}
  document.querySelectorAll('.tab').forEach(el=>el.addEventListener('click',()=>switchTab(el.dataset.tab)));
  $('searchInput').addEventListener('input',()=>{page=1;render();}); $('dateFilter').addEventListener('change',()=>{page=1;render();});
  $('resetBtn').addEventListener('click',()=>{$('searchInput').value='';$('dateFilter').value='all';page=1;render();showToast('Filters reset.');});
  $('refreshBtn').addEventListener('click',()=>{render();$('lastUpdated').textContent='just now';showToast('Activity stream refreshed.');});
  $('exportBtn').addEventListener('click',exportCSV); $('clearBtn').addEventListener('click',()=>{$('confirmModal').hidden=false;});
  $('cancelClear').addEventListener('click',()=>$('confirmModal').hidden=true); $('confirmClear').addEventListener('click',clearNotifications);
  $('confirmModal').addEventListener('click',e=>{if(e.target===$('confirmModal'))$('confirmModal').hidden=true;});
  $('prevBtn').addEventListener('click',()=>{if(page>1){page--;render();}}); $('nextBtn').addEventListener('click',()=>{page++;render();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')$('confirmModal').hidden=true;if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();document.querySelector('.global-search input').focus();}});
  document.querySelectorAll('.policy-card a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const title=a.closest('.policy-card')?.querySelector('strong')?.textContent||'Policy reference';showToast(`${title}: consult the institution-approved policy document.`);}));
  render();
})();
