
(function(){
'use strict';
const KEY='campusshare.ownerportal.v3';
const STUDENT_REQUESTS_KEY='campusshareDemoRequests';
const STUDENT_EQUIPMENT_KEY='campusshareDemoEquipment';
const HAD_SHARED_INVENTORY_AT_STARTUP=localStorage.getItem(STUDENT_EQUIPMENT_KEY)!==null;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||localStorage.getItem('campusshare.ownerportal.v2'))||{}}catch(e){return {}}};
let db=read();let activeFilter='all';
function studentStatus(category){return ({pending:'review',approved:'approved',waitlist:'waitlist',rejected:'rejected',borrowed:'borrowed','in-use':'borrowed',returned:'returned',cancelled:'rejected'})[category]||'review'}
function syncFromStudentPortal(){
 let records=[];try{records=JSON.parse(localStorage.getItem(STUDENT_REQUESTS_KEY)||'[]')}catch(_){records=[]}
 if(!Array.isArray(records))records=[];
 const imported=records.map(x=>{
  const status=String(x.status||'review').toLowerCase();
  const category=({review:'pending',pending:'pending',approved:'approved',waitlist:'waitlist',rejected:'rejected',cancelled:'rejected',borrowed:'borrowed','in-use':'borrowed',returned:'returned',completed:'returned'})[status]||'pending';
  const rid=String(x.id||'REQ-'+id());
  return {id:'STU-'+rid,sourceId:rid,source:'student-portal',category,title:x.studentName||x.userName||x.fullName||x.studentEmail||x.student_email||'Student',studentEmail:x.studentEmail||x.student_email||x.email||'',equipmentName:x.name||x.equipmentName||'Equipment',equipment:String(x.code||x.equipmentId||x.resourceId||''),date:x.start||x.startDate||x.start_date||'',endDate:x.end||x.endDate||x.end_date||'',purpose:x.purpose||'',createdAt:x.createdAt||x.created_at||x.submittedAt||'',search:[x.name,x.code,x.studentName,x.studentEmail,x.purpose].filter(Boolean).join(' '),decisionAt:x.staffDecisionAt||null,decisionReason:x.staffDecisionReason||'',startedAt:x.startedAt||null,elapsed:0};
 });
 db.requests=(db.requests||[]).filter(r=>r.source!=='student-portal'&&!String(r.id||'').startsWith('REQ-INIT-')).concat(imported);
}
function syncToStudentPortal(){
 let records=[];try{records=JSON.parse(localStorage.getItem(STUDENT_REQUESTS_KEY)||'[]')}catch(_){records=[]}
 if(!Array.isArray(records))records=[];
 db.requests.filter(r=>r.source==='student-portal'&&r.sourceId).forEach(r=>{
  const rec=records.find(x=>String(x.id)===String(r.sourceId));if(!rec)return;
  rec.status=studentStatus(r.category);
  if(r.decisionAt)rec.staffDecisionAt=r.decisionAt;else delete rec.staffDecisionAt;
  if(r.decisionReason)rec.staffDecisionReason=r.decisionReason;else delete rec.staffDecisionReason;
  if(r.category==='returned')rec.returnedAt=r.returnedAt||new Date().toISOString();
 });
 localStorage.setItem(STUDENT_REQUESTS_KEY,JSON.stringify(records));
}
function syncEquipmentToStudentPortal(){
 const list=(db.equipment||[]).map(e=>{
  const status=String(e.status||'available').toLowerCase().replace(/_/g,'-');
  const category=e.category||'Other';
  return {id:e.id,name:e.name,short:e.name,category,group:category,lab:e.location||'Campus Lab',department:e.department||'Campus',status:status==='in-use'?'borrowed':status,statusText:status==='available'?'Available':status==='in-use'?'Currently Borrowed':status.charAt(0).toUpperCase()+status.slice(1),code:String(e.id),loan:e.loan||'As approved',value:e.value||'Contact custodian',description:e.description||'No description available.',tags:[`Status: ${status}`],specs:{Condition:e.condition||'Not specified',Location:e.location||'Campus Lab',Status:status},location:e.location||'Contact custodian',handling:e.handling||'Follow custodian instructions.',images:[e.image||'https://placehold.co/800x500/e8eef7/294b78?text=CampusShare+Equipment']};
 });
 localStorage.setItem(STUDENT_EQUIPMENT_KEY,JSON.stringify(list));
}
function save(){localStorage.setItem(KEY,JSON.stringify(db));syncToStudentPortal();syncEquipmentToStudentPortal();}
function id(){return 'CS-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)}
function init(){
 if(!Array.isArray(db.equipment)) db.equipment=[{"id": "EQ-MS-4802", "name": "Thermo Scientific Orbitrap Exploris 480", "description": "", "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuDWYUDSWFvjbbKcxE64W8Bx2z6yF3LKoeRE-KtqK6C5HOTx9QlPbPQHtlVNRLrJvpnUbsoQ_uXSRwvpJXdByVcVrOhztAdSTH6uGDBaqHTcCQEoEML_1x2TRyhGIlndoF6MGzKw9RBR2v_gPpgQ29rcsJUCcD_30XArLru5YRClr4urR5RIPP1s3c15veNpoORH--2UpSURA14OlOu-SvUw4fpuFC3HoRdnI3n0kHQ", "location": "Bio Core Bldg 76, Room 310", "status": "available"}, {"id": "EQ-MIC-9801", "name": "Zeiss LSM 980 with Airyscan 2", "description": "", "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuBB-nv3LngHYr5ydABjHz1AEhOovW5hIF0kEL3QysQJp_KS3stOL8Euuwxpx7FNrNgtHPyZe-hUwoYNfC1CK7cSyCcHFmmQlKBi5JQbO5lGFs4CZMcc30wUUrGl9FcIP8kSA2Po19-BJ_H8_fp0sbwbwuJQsvIqfQqX3eLpOw0omU8afrL07-1wM9SLFtWdz5AfvRtrORXZPg0rOVqc882ftgtlUa4AD7UomTcd3Og", "location": "Imaging Core, Room 104", "status": "in-use"}, {"id": "EQ-GEN-6003", "name": "Illumina NovaSeq 6000 Sequencer", "description": "", "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuCJssts3TSdAxkTivVD6mJvxcbEpSEqIjeDhD9G4WVSCnZy8j6kNySJHdRaJIH_dv4b1mTpLibZwvT2j7VipMNTHmMxmBHpzq2mbM8ZFtUwAxV-Bz5aI1kd2E44zgnhLEVhz1eMRWelA9BEb2Eq2wzC0LhvBQGb6OLljSTP3Gsm8sNot0iJ-DS20TIbzPZ5inr-gYKgLn0GySyvbwgzpqzuDKPZdjbrya_WojgSDe4", "location": "Genomics Hub, Bay 2", "status": "available"}, {"id": "EQ-EM-2100", "name": "JEOL JEM-2100F Field Emission TEM", "description": "", "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuCA2H6DhzJzZeUoZ9y89y22FBi6VFJfTAFFCyzJ0gkcWB-zRnJR2zVANEAWz1tf3szpO1_scfodH5PLESIkc2vB5t0E_Wsz5RcJkOjFm14nUCbhJ0auaud5SJ22zAM8VMRYXeBdkExubj5I1o04BRvv0C7kB2c17v9-b5YkUEp7uLFEI9TVLO5ev6W71Xmoin96uiRKlDaZiIqajk-pBuxPq-fbTCRvk-zDG08x930", "location": "NanoFab Suite, B12", "status": "maintenance"}, {"id": "EQ-CEN-0100", "name": "Beckman Coulter Optima XPN-100", "description": "", "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuBAgn_E9stYBtzLWRPHctvB-B5Jbne16aLWpjnTCTRCCTtenjwNn0XwhyOppdbb7BZUIrFBUkbGUEwNktRMXwSCVu27FVpOVaYcW_hBAkiqGPgyC4Z4EcLCM7_N8SnJkkHu7rNtUMY1YvH5E5yZxFM8J7oMzwI2PPJNv-l-i85kpm-w4jI8Cqh6gRPKuJla_9wT0FSESKmI_LNwA_IktPcrVoBvtNdBsCC_J8bbrLI", "location": "Prep Lab 2A", "status": "available"}, {"id": "EQ-CYT-0003", "name": "BD FACSAria III Cell Sorter", "description": "", "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuDNlgjREKEMbzREz3BF5REkn-fnX_rlTJzMjbB-330YXdmMntvszPLjwxtKCW_IR99aXcGlBcTfHa358GgJPEEnWMPZPnNCi39bsM09hglk2o7Zrq_ph3292BPBcYDg4s6-wCpIaHQJcB9Yl4V-qSZV6xfUNhPQwfTG6kXPY9Y4PBCsMbLbjQFYoQ9XUqCI0nOMlYeVxlGKjqvAakxIfLDm3QHj8leTEmRjsnsVepY", "location": "Immunology Lab, Rm 215", "status": "overdue"}];
 if(!Array.isArray(db.requests)) db.requests=[];
 if(!Array.isArray(db.history)) db.history=[];
 syncFromStudentPortal();
 save();
}

async function loadEquipmentFromSupabase(){
 if(HAD_SHARED_INVENTORY_AT_STARTUP||!window.CampusDB)return;
 try{
  const [resources,categories]=await Promise.all([CampusDB.get('resources',{orderBy:'created_at',ascending:false}),CampusDB.get('categories')]);
  if(!Array.isArray(resources)||!resources.length)return;
  const categoryMap=Object.fromEntries((categories||[]).map(c=>[c.id,c.category_name]));
  db.equipment=resources.map(item=>({
   id:String(item.id),name:item.name||'Unnamed equipment',description:item.description||'',image:item.image_url||item.image||'',location:item.location||'Campus Lab',
   status:Number(item.available_quantity||0)>0?'available':'in-use',category:categoryMap[item.category_id]||'Other',
   totalQuantity:Number(item.total_quantity||0),availableQuantity:Number(item.available_quantity||0),condition:item.condition||''
  }));
  save();window.refreshEquipmentPage?.();if(location.pathname.endsWith('dashboard.html'))dashboard();
 }catch(error){console.warn('CampusShare: Supabase inventory read unavailable; retaining local inventory.',error);}
}

function findDate(c){const t=c.innerText||'';const m=t.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i);return m?new Date(m[0]).toISOString().slice(0,10):''}
function toast(msg){let el=$('#appToast');if(!el){el=document.createElement('div');el.id='appToast';el.style.cssText='position:fixed;bottom:22px;right:22px;z-index:9999;background:#213145;color:white;padding:12px 18px;border-radius:10px;box-shadow:0 4px 18px #0003';document.body.append(el)}el.textContent=msg;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2800)}
function addHistory(r,duration){db.history.unshift({id:id(),requestId:r.id,equipment:r.equipment||r.title,user:r.title||r.search.split(' ')[0]||'Researcher',institution:r.institution||r.department||'',date:new Date().toISOString(),duration,status:'Completed'});r.category='returned';r.returnedAt=new Date().toISOString();r.startedAt=null;r.elapsed=0;const eq=db.equipment.find(e=>String(e.id)===String(r.equipment));if(eq&&eq.status==='in-use')eq.status='available';if(eq&&r.inventoryAdjusted&&Number.isFinite(Number(eq.availableQuantity)))eq.availableQuantity=Number(eq.availableQuantity)+1;r.inventoryAdjusted=false;save()}
function syncCards(){
 $$('.request-card').forEach((c,i)=>{let r=db.requests[i];if(!r)return;c.dataset.category=r.category;c.dataset.requestId=r.id;if(r.category==='approved'&&!$('.app-start-timer',c)){let b=document.createElement('button');b.className='app-start-timer px-3 py-2 rounded-lg bg-primary text-white';b.textContent=r.startedAt?'Stop Timer':'Start Timer';c.append(b)}else if(r.category!=='approved')$('.app-start-timer',c)?.remove();});
}
function equipmentPage(){
 const modal=$('#addEquipmentModal'), grid=$('#equipmentGridContainer');if(!modal||!grid)return;
 let editing=null, imageData='';
 
function updateEquipmentCounts() {
    const equipment = Array.isArray(db.equipment) ? db.equipment : [];

    const normalize = status =>
        String(status || 'available')
            .toLowerCase()
            .replace(/_/g, '-')
            .trim();

    // Calculate counts BEFORE updating the HTML
    const counts = {
        total: equipment.length,

        available: equipment.filter(e =>
            normalize(e.status) === 'available'
        ).length,

        inUse: equipment.filter(e =>
            ['in-use', 'in use', 'borrowed'].includes(normalize(e.status))
        ).length,

        maintenance: equipment.filter(e =>
            ['maintenance', 'under-maintenance'].includes(normalize(e.status))
        ).length,

        overdue: equipment.filter(e =>
            normalize(e.status) === 'overdue'
        ).length
    };

    // Update summary cards
    const setText = (selector, value) => {
        const element = document.querySelector(selector);
        if (element) element.textContent = value;
    };

    setText('#availableCount', `${counts.available} Units`);
    setText('#inUseCount', `${counts.inUse} Active`);
    setText('#maintenanceCount', `${counts.maintenance} Offline`);
    setText('#overdueCount', `${counts.overdue} Overdue`);
    setText('#totalEquipmentCount', counts.total);

    // Update status filter counts
    const statusFilter = $('#statusFilter');

    if (statusFilter) {
        const labels = {
            all: 'All Statuses',
            available: 'Available',
            'in-use': 'In-Use',
            maintenance: 'Maintenance',
            overdue: 'Overdue / Delays'
        };

        const statusCounts = {
            all: counts.total,
            available: counts.available,
            'in-use': counts.inUse,
            maintenance: counts.maintenance,
            overdue: counts.overdue
        };

        Array.from(statusFilter.options).forEach(option => {
            if (labels[option.value] !== undefined) {
                option.textContent =
                    `${labels[option.value]} (${statusCounts[option.value]})`;
            }
        });
    }

    // Update the equipment total
    setText('#totalEquipmentCount', counts.total);

    return counts;
}

 const name=$('#equipmentNameField'),desc=$('#equipmentDescriptionField'),loc=$('#equipmentLocationField'),file=$('#equipmentImageField'),preview=$('#equipmentImagePreview');
 function open(item){editing=item?.id||null;name.value=item?.name||'';desc.value=item?.description||'';loc.value=item?.location||'';imageData=item?.image||'';preview.src=imageData;preview.classList.toggle('hidden',!imageData);modal.classList.remove('hidden');document.body.style.overflow='hidden'}
 function close(){modal.classList.add('hidden');document.body.style.overflow=''}
 $('#openAddModalBtn')?.addEventListener('click',()=>open());
 $('#closeAddModalBtn')?.addEventListener('click',close);$('#cancelModalBtn')?.addEventListener('click',close);$('#modalOverlay')?.addEventListener('click',close);
 file?.addEventListener('change',()=>{const f=file.files?.[0];if(!f)return;if(!f.type.startsWith('image/')){toast('Please choose an image file.');file.value='';return}if(f.size>2*1024*1024){toast('Image must be 2 MB or smaller.');file.value='';return}const rd=new FileReader();rd.onload=()=>{imageData=rd.result;preview.src=imageData;preview.classList.remove('hidden')};rd.readAsDataURL(f)});

 function render() {
    grid.innerHTML = '';

    db.equipment.forEach(e => {
        const card = document.createElement('article');

        card.className =
            'equipment-card flex flex-col rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden';

        card.dataset.id = e.id;
        card.dataset.name = e.name || '';
        card.dataset.room = e.location || '';
        card.dataset.status = e.status || 'available';

        card.dataset.category = e.category || (
            (e.id || '').includes('MS') ? 'mass-spec' :
            (e.id || '').includes('MIC') ? 'microscopy' :
            (e.id || '').includes('GEN') ? 'genomics' :
            (e.id || '').includes('EM') ? 'em' :
            (e.id || '').includes('CEN') ? 'centrifugation' :
            (e.id || '').includes('CYT') ? 'flow-cytometry' : 'other'
        );

        card.innerHTML = `
            <div class="h-44 bg-surface-container overflow-hidden">
                ${e.image
                    ? `<img src="${esc(e.image)}" alt="${esc(e.name)}"
                        class="w-full h-full object-cover">`
                    : `<div class="h-full flex items-center justify-center text-outline">
                        No image
                       </div>`
                }
            </div>

            <div class="p-5 flex-1">
                <h2 class="font-title-md">${esc(e.name)}</h2>

                <p class="text-sm text-on-surface-variant mt-2">
                    ${esc(e.description || '')}
                </p>

                <p class="text-sm mt-3">
                    📍 ${esc(e.location || '')}
                </p>

                <p class="text-sm mt-2">
                    Status: ${esc(e.status || 'available')}
                </p>

                <div class="flex gap-2 mt-5">
                    <button type="button"
                        data-edit="${esc(e.id)}"
                        class="px-3 py-2 rounded bg-surface-container">
                        Edit
                    </button>

                    <button type="button"
                        data-delete="${esc(e.id)}"
                        class="px-3 py-2 rounded bg-error-container text-error">
                        Delete
                    </button>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });

    // Update counts only AFTER all equipment cards are rendered
    updateEquipmentCounts();

    // Update equipment table
    const tbody = $('#equipmentTableContainer tbody');

    if (tbody) {
        tbody.innerHTML = db.equipment.map(e => `
            <tr class="border-b">
                <td class="px-4 py-3">
                    <strong>${esc(e.name)}</strong>
                    <div class="text-xs">${esc(e.id)}</div>
                </td>

                <td class="px-4 py-3">—</td>
                <td class="px-4 py-3">${esc(e.location || '')}</td>
                <td class="px-4 py-3">${esc(e.status || 'available')}</td>
                <td class="px-4 py-3">—</td>

                <td class="px-4 py-3 text-right">
                    <button type="button"
                        data-edit="${esc(e.id)}"
                        class="px-2 py-1 bg-surface-container rounded">
                        Edit
                    </button>

                    <button type="button"
                        data-delete="${esc(e.id)}"
                        class="px-2 py-1 bg-error-container text-error rounded">
                        Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Initial visible count
    const visibleCount = $('#visibleCount');
    if (visibleCount) {
        visibleCount.textContent = db.equipment.length;
    }

    const totalCount = $('#totalEquipmentCount');
    if (totalCount) {
        totalCount.textContent = db.equipment.length;
    }
}
 
const saveEquipment = (event) => {
    event?.preventDefault();

    const equipmentName = name.value.trim();
    const equipmentLocation = loc.value.trim();

    if (!equipmentName || !equipmentLocation) {
        toast('Please enter equipment name and location.');
        return;
    }
 $('#publishEquipmentBtn')?.addEventListener('click', saveEquipment);
$('#saveDraftBtn')?.addEventListener('click', saveEquipment);

    const existingId = editing;
    const item = {
        id: existingId || id(),
        name: equipmentName,
        description: desc.value.trim(),
        location: equipmentLocation,
        image: imageData,
        status: existingId
            ? (db.equipment.find(x => x.id === existingId)?.status || 'available')
            : 'available'
    };

    if (existingId) {
        const index = db.equipment.findIndex(x => x.id === existingId);
        if (index !== -1) {
            db.equipment[index] = item;
        }
    } else {
        db.equipment.push(item);
    }

    save();
    render();
    close();

    // Clear the form
    name.value = '';
    desc.value = '';
    loc.value = '';
    file.value = '';
    imageData = '';
    editing = null;

    updateEquipmentCounts?.();

    toast(existingId
        ? 'Equipment updated successfully.'
        : 'Equipment added successfully.');
};

$('#publishEquipmentBtn')?.addEventListener('click', saveEquipment);
$('#saveDraftBtn')?.addEventListener('click', saveEquipment);

 grid.addEventListener('click',e=>{const eb=e.target.closest('[data-edit]'),dbtn=e.target.closest('[data-delete]');if(eb){const item=db.equipment.find(x=>x.id===eb.dataset.edit);open(item)}if(dbtn&&confirm('Delete this equipment?')){db.equipment=db.equipment.filter(x=>x.id!==dbtn.dataset.delete);save();render();toast('Equipment deleted.')}});
 render();
 $('#gridToggleBtn')?.addEventListener('click',()=>{grid.classList.remove('hidden');$('#equipmentTableContainer')?.classList.add('hidden')});
 $('#tableToggleBtn')?.addEventListener('click',()=>{grid.classList.add('hidden');$('#equipmentTableContainer')?.classList.remove('hidden')});
 const search=$('#equipmentSearchInput'),cat=$('#categoryFilter'),status=$('#statusFilter'),location=$('#locationFilter');

 
function filterEq() {
    const q = (search?.value || '').toLowerCase().trim();
    const selectedCategory = cat?.value || 'all';
    const selectedStatus = status?.value || 'all';
    const selectedLocation = location?.value || 'all';

    let matched = 0;

    $$('.equipment-card', grid).forEach(card => {
        const category = card.dataset.category || 'other';
        const cardStatus = (card.dataset.status || 'available').toLowerCase();
        const room = (card.dataset.room || '').toLowerCase();
        const name = (card.dataset.name || '').toLowerCase();
        const id = (card.dataset.id || '').toLowerCase();

        const matchesSearch =
            !q || `${name} ${id} ${room}`.toLowerCase().includes(q);

        const matchesCategory =
            selectedCategory === 'all' || category === selectedCategory;

        const matchesStatus =
            selectedStatus === 'all' || cardStatus === selectedStatus;

        const matchesLocation =
            selectedLocation === 'all' ||
            room.includes(selectedLocation.toLowerCase());

        const visible =
            matchesSearch && matchesCategory &&
            matchesStatus && matchesLocation;

        card.style.display = visible ? '' : 'none';

        if (visible) matched++;
    });

    const visibleCount = $('#visibleCount');
    if (visibleCount) visibleCount.textContent = matched;

    const emptyState = $('#emptySearchState');
    if (emptyState) {
        emptyState.classList.toggle('hidden', matched > 0);
        emptyState.classList.toggle('flex', matched === 0);
    }
}
search?.addEventListener('input',filterEq);cat?.addEventListener('change',filterEq);status?.addEventListener('change',filterEq);location?.addEventListener('change',filterEq);
window.refreshEquipmentPage=render;
filterEq();
}

function requestPage(){
 const container=$('#requestsContainer')||$('main');if(!container)return;
 // Replace static sample cards with records from the shared student request store.
 const oldCards=$$('.request-card',container);oldCards.forEach(card=>{card.hidden=true;card.style.display='none';});
 let panel=$('#studentPortalLiveRequests');
 if(!panel){panel=document.createElement('section');panel.id='studentPortalLiveRequests';panel.className='mt-5 rounded-xl bg-surface-container-lowest p-4 md:p-6';container.prepend(panel);}
 let filter='all';let query='';let selected=new Set();
 const statusLabel={pending:'Pending review',approved:'Approved',waitlist:'Waitlisted',rejected:'Declined',borrowed:'Currently borrowed',returned:'Returned'};
 const dateText=v=>{if(!v)return 'Not specified';const d=new Date(v);return Number.isNaN(d.getTime())?esc(v):d.toLocaleDateString()};
 function visibleItems(){return db.requests.filter(r=>r.source==='student-portal').filter(r=>filter==='all'||r.category===filter).filter(r=>!query||[r.title,r.studentEmail,r.equipment,r.purpose,r.sourceId].join(' ').toLowerCase().includes(query));}
 function render(){
  const all=db.requests.filter(r=>r.source==='student-portal');
  const counts={all:all.length,pending:all.filter(r=>r.category==='pending').length,approved:all.filter(r=>r.category==='approved').length,waitlist:all.filter(r=>r.category==='waitlist').length,rejected:all.filter(r=>r.category==='rejected').length,borrowed:all.filter(r=>r.category==='borrowed').length,returned:all.filter(r=>r.category==='returned').length};
  const items=visibleItems();
  panel.innerHTML=`<div class="flex flex-wrap items-start justify-between gap-3 mb-4"><div><h2 class="text-xl font-semibold text-on-surface">Student booking requests</h2><p class="text-sm text-on-surface-variant mt-1">Live requests submitted through the student portal on this browser profile.</p></div><button type="button" data-refresh-requests class="px-3 py-2 rounded-lg border text-sm">Refresh</button></div>
  <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">${['all','pending','approved','waitlist','rejected','borrowed','returned'].map(k=>`<button type="button" data-filter="${k}" class="rounded-lg border p-2 text-left ${filter===k?'bg-primary text-white border-primary':'bg-surface text-on-surface'}"><span class="block text-xs">${k==='all'?'All':statusLabel[k]||k}</span><strong class="text-lg">${counts[k]}</strong></button>`).join('')}</div>
  <div class="flex flex-col sm:flex-row gap-2 mb-4"><input id="liveRequestSearch" value="${esc(query)}" class="w-full sm:flex-1 rounded-lg border px-3 py-2" placeholder="Search student, equipment, email or purpose"><button type="button" data-select-visible class="px-3 py-2 rounded-lg border">Select visible</button><button type="button" data-batch-approve class="px-3 py-2 rounded-lg bg-primary text-white">Approve selected</button><span class="self-center text-sm text-on-surface-variant">${selected.size} selected</span></div>
  <div class="space-y-3">${items.length?items.map(r=>{const status=r.category||'pending';const canReview=['pending','waitlist'].includes(status);return `<article class="border rounded-xl p-4" data-live-id="${esc(r.id)}"><div class="flex flex-wrap justify-between gap-3"><div class="flex gap-3 min-w-0"><input type="checkbox" data-select-request="${esc(r.id)}" ${selected.has(r.id)?'checked':''} aria-label="Select request"><div class="min-w-0"><div class="font-semibold">${esc(r.title||'Student')}</div><div class="text-xs text-on-surface-variant">${esc(r.studentEmail||'Email not provided')} · Request ${esc(r.sourceId||r.id)}</div></div></div><span class="px-2 py-1 rounded-full text-xs font-semibold ${status==='approved'||status==='returned'?'bg-emerald-100 text-emerald-800':status==='rejected'?'bg-red-100 text-red-800':'bg-amber-100 text-amber-900'}">${esc(statusLabel[status]||status)}</span></div>
  <div class="grid sm:grid-cols-2 gap-2 mt-3 text-sm"><div><span class="text-on-surface-variant">Equipment</span><div class="font-medium">${esc(r.equipmentName||r.equipment||'Equipment')}</div><div class="text-xs text-on-surface-variant">ID: ${esc(r.equipment||'Not linked')}</div></div><div><span class="text-on-surface-variant">Booking period</span><div class="font-medium">${dateText(r.date)} – ${dateText(r.endDate)}</div></div></div>
  ${r.purpose?`<p class="text-sm mt-3"><span class="text-on-surface-variant">Purpose:</span> ${esc(r.purpose)}</p>`:''}${r.decisionReason?`<p class="text-sm mt-2 text-error">Decision note: ${esc(r.decisionReason)}</p>`:''}
  <div class="flex flex-wrap gap-2 mt-4">${canReview?`<button data-action="approve" class="px-3 py-2 rounded-lg bg-primary text-white text-sm">Approve</button><button data-action="waitlist" class="px-3 py-2 rounded-lg border text-sm">Waitlist</button><button data-action="reject" class="px-3 py-2 rounded-lg bg-error-container text-error text-sm">Decline</button>`:''}${status==='approved'?'<button data-action="start" class="px-3 py-2 rounded-lg bg-primary text-white text-sm">Start borrowing</button>':''}${status==='borrowed'?'<button data-action="return" class="px-3 py-2 rounded-lg bg-primary text-white text-sm">Complete return</button>':''}${status==='waitlist'?'<button data-action="approve" class="px-3 py-2 rounded-lg bg-primary text-white text-sm">Promote / approve</button>':''}${['rejected','returned'].includes(status)?'<button data-action="reopen" class="px-3 py-2 rounded-lg border text-sm">Reopen review</button>':''}<button data-action="details" class="px-3 py-2 rounded-lg border text-sm">Details</button></div><div data-details class="hidden mt-3 rounded-lg bg-surface-container-low p-3 text-xs text-on-surface-variant">Submitted: ${dateText(r.createdAt||r.submittedAt)} · Student record: ${esc(r.sourceId||'—')} · Current status: ${esc(statusLabel[status]||status)}${r.startedAt?` · Started: ${dateText(new Date(r.startedAt).toISOString())}`:''}</div></article>`}).join(''):'<div class="rounded-lg border border-dashed p-8 text-center text-sm text-on-surface-variant">No student booking requests match this filter. Submit a booking from the student portal to see it here.</div>'}</div>`;
 }
 window.renderStudentPortalRequests=render;
 render();
 panel.addEventListener('input',e=>{if(e.target.id==='liveRequestSearch'){query=e.target.value.toLowerCase().trim();render();const input=$('#liveRequestSearch');input?.focus();input?.setSelectionRange(query.length,query.length);}});
 panel.addEventListener('change',e=>{const id=e.target.dataset.selectRequest;if(id){if(e.target.checked)selected.add(id);else selected.delete(id);render();}});
 panel.addEventListener('click',e=>{
  const filterBtn=e.target.closest('[data-filter]');if(filterBtn){filter=filterBtn.dataset.filter;selected.clear();render();return;}
  if(e.target.closest('[data-refresh-requests]')){syncFromStudentPortal();render();toast('Booking requests refreshed.');return;}
  if(e.target.closest('[data-select-visible]')){visibleItems().forEach(r=>selected.add(r.id));render();return;}
  if(e.target.closest('[data-batch-approve]')){const targets=db.requests.filter(r=>selected.has(r.id)&&r.source==='student-portal'&&['pending','waitlist'].includes(r.category));if(!targets.length){toast('Select pending or waitlisted requests first.');return;}targets.forEach(r=>recordDecision(r,'Approved'));selected.clear();render();toast(`${targets.length} request(s) approved.`);return;}
  const button=e.target.closest('[data-action]');if(!button)return;const card=button.closest('[data-live-id]');const r=db.requests.find(x=>x.id===card?.dataset.liveId);if(!r)return;const action=button.dataset.action;
  if(action==='details'){card.querySelector('[data-details]')?.classList.toggle('hidden');button.textContent=card.querySelector('[data-details]')?.classList.contains('hidden')?'Details':'Hide details';return;}
  if(action==='approve'){recordDecision(r,'Approved');toast('Request approved and student status updated.');}
  else if(action==='waitlist'){recordDecision(r,'Waitlisted');toast('Request moved to the waitlist.');}
  else if(action==='reject'){const reason=prompt('Enter the reason for declining this booking:');if(reason===null)return;if(!reason.trim()){toast('A decline reason is required.');return;}recordDecision(r,'Declined',reason.trim());toast('Request declined and reason recorded.');}
  else if(action==='reopen'){r.category='pending';r.decisionAt=null;r.decisionReason='';db.history.unshift({id:id(),requestId:r.id,equipment:r.equipment||r.equipmentName,user:r.title||'Student',date:new Date().toISOString(),duration:'—',status:'Reopened'});save();toast('Request reopened for review.');}
  else if(action==='start'){r.category='borrowed';r.startedAt=Date.now();r.inventoryAdjusted=true;const eq=db.equipment.find(x=>String(x.id)===String(r.equipment));if(eq){eq.status='in-use';if(Number.isFinite(Number(eq.availableQuantity))&&eq.availableQuantity>0)eq.availableQuantity--;}save();toast('Borrowing started and equipment marked in use.');}
  else if(action==='return'){const duration=r.startedAt?formatDuration(Date.now()-r.startedAt):'Not recorded';addHistory(r,duration);toast('Return completed and recorded in Equipment History.');}
  render();
 });
}
function formatDuration(ms){const m=Math.floor(ms/60000);return `${Math.floor(m/60)}h ${m%60}m`}
function calendarPage(){
 const main=$('main');if(!main)return;
 let wrap=$('#persistentCalendarBookings');if(!wrap){wrap=document.createElement('section');wrap.id='persistentCalendarBookings';wrap.className='mt-6 p-5 rounded-xl bg-surface-container-lowest';main.append(wrap)}
 function renderApproved(){const items=db.requests.filter(r=>r.source==='student-portal'&&['pending','approved','borrowed','waitlist'].includes(r.category));wrap.innerHTML='<h2 class="text-xl font-semibold mb-3">Student booking schedule</h2>'+(items.length?items.map(r=>`<div class="border-b py-3" data-calendar-id="${esc(r.id)}"><div class="flex flex-wrap justify-between gap-2"><strong>${esc(r.title)}</strong><span>${esc(r.category)}</span></div><div class="text-sm text-on-surface-variant">${esc(r.equipment)} · ${esc(r.date||'Date not specified')} ${r.endDate?' – '+esc(r.endDate):''}</div>${r.category==='pending'?`<div class="flex gap-2 mt-2"><button data-cal-action="approve" class="px-3 py-2 rounded bg-primary text-white">Approve</button><button data-cal-action="reject" class="px-3 py-2 rounded bg-error-container">Decline</button></div>`:''}</div>`).join(''):'<p class="text-sm text-on-surface-variant">No student bookings are scheduled.</p>')}
 renderApproved();window.refreshCalendarPage=renderApproved;
 wrap.onclick=e=>{const b=e.target.closest('[data-cal-action]');if(!b)return;const r=db.requests.find(x=>x.id===b.closest('[data-calendar-id]')?.dataset.calendarId);if(!r)return;recordDecision(r,b.dataset.calAction==='approve'?'Approved':'Declined');renderApproved();toast('Booking '+r.category+'.');};
 main.querySelectorAll('button').forEach(b=>{const label=b.innerText.trim().toLowerCase();if(label==='accept'||label==='approve'||label==='decline')b.hidden=true;});
 const cells=$$('.grid-cols-7 > div');cells.forEach(cell=>cell.addEventListener('click',()=>{if(cell.classList.contains('opacity-50'))return;cells.forEach(x=>x.classList.remove('ring-2','ring-primary'));cell.classList.add('ring-2','ring-primary');}));
}
function historyPage(){
 const exportCsv=()=>{const rows=[['Equipment','User','Date','Duration','Status','Institution'],...db.history.map(h=>[h.equipment,h.user,h.date,h.duration,h.status,h.institution||''])];const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='campusshare-history.csv';a.click();URL.revokeObjectURL(a.href)};
 $('#btn-export-csv')?.addEventListener('click',exportCsv);$('#btn-export-pdf')?.addEventListener('click',()=>window.print());
 const input=$('#global-search-input'),category=$('#filter-category'),status=$('#filter-status'),equipment=$('#filter-equipment'),institution=$('#filter-institution');
 const section=$('#persistentCompletedHistory')||document.createElement('section');section.id='persistentCompletedHistory';section.className='mt-6 p-5 rounded-xl bg-surface-container-lowest';if(!section.isConnected)$('main')?.append(section);
 // Original HTML contains illustrative transactions. The shared record store is authoritative.
 $$('tbody tr, .history-row, [data-transaction]').forEach(row=>{row.hidden=true});
 const categoryFor=h=>{const code=String(h.equipment||'').toUpperCase();return code.includes('MS-')?'mass-spec':code.includes('MIC-')?'microscopy':code.includes('CYT-')?'cytometry':code.includes('GEN-')?'sequencing':code.includes('CEN-')?'centrifuge':'all'};
 function render(){section.innerHTML='<h2 class="text-lg font-semibold mb-3">Activity &amp; completed transactions</h2>'+(db.history.length?db.history.map(h=>{const normalized=String(h.status||'').toLowerCase();const statusValue=normalized==='completed'?'returned':normalized==='declined'?'cancelled':normalized;return `<div class="py-3 border-b text-sm" data-history-row data-category="${categoryFor(h)}" data-status="${esc(statusValue)}" data-equipment="${esc(h.equipment)}" data-institution="${esc(h.institution||'')}"><strong>${esc(h.equipment)}</strong> · ${esc(h.user)} · <span class="font-semibold">${esc(h.status||'Completed')}</span> · ${new Date(h.date).toLocaleString()} · ${esc(h.duration||'Duration unavailable')}${h.reason?' · '+esc(h.reason):''}${h.institution?' · '+esc(h.institution):''}</div>`}).join(''):'<p class="text-sm text-on-surface-variant">No staff decisions or completed sessions have been recorded yet.</p>');apply();}
 function apply(){const q=(input?.value||'').toLowerCase(),cat=category?.value||'all',st=status?.value||'all',eq=equipment?.value||'all',inst=institution?.value||'all';$$('[data-history-row]',section).forEach(row=>{const okText=!q||row.innerText.toLowerCase().includes(q);const okCat=cat==='all'||row.dataset.category===cat;const okStatus=st==='all'||row.dataset.status===st;const okEq=eq==='all'||row.dataset.equipment===eq;const okInst=inst==='all'||row.dataset.institution.toLowerCase().includes(inst.toLowerCase());row.hidden=!(okText&&okCat&&okStatus&&okEq&&okInst)});}
 [input,category,status,equipment,institution].forEach(el=>el?.addEventListener(el===input?'input':'change',apply));
 $('#btn-reset-filters')?.addEventListener('click',()=>{if(input)input.value='';[category,status,equipment,institution].forEach(el=>{if(el)el.value='all'});apply()});
 render();window.refreshHistoryPage=render;
}
function dashboard(){
 const main=$('main');if(!main)return;
 let live=$('#dashboardLiveStudentRequests');
 if(!live){live=document.createElement('section');live.id='dashboardLiveStudentRequests';live.className='mt-6 rounded-xl bg-surface-container-lowest p-5';main.append(live);}
 $$('.request-item').forEach(item=>{item.hidden=true;});
 const pending=db.requests.filter(r=>r.source==='student-portal'&&['pending','approved','borrowed','waitlist'].includes(r.category));
 live.innerHTML='<h2 class="text-lg font-semibold mb-3">Student portal activity</h2>'+(pending.length?pending.map(r=>`<div class="flex flex-wrap items-center justify-between gap-3 border-b py-3"><div><strong>${esc(r.title)}</strong><p class="text-sm">${esc(r.equipment)} · ${esc(r.date||'Date not specified')} · ${esc(r.category)}</p></div><div class="flex gap-2">${r.category==='pending'?`<button class="px-3 py-2 rounded bg-primary text-white" data-dash-action="approve" data-id="${esc(r.id)}">Approve</button><button class="px-3 py-2 rounded bg-error-container" data-dash-action="reject" data-id="${esc(r.id)}">Decline</button>`:''}</div></div>`).join(''):'<p class="text-sm text-on-surface-variant">No student requests are waiting for staff action.</p>');
 live.onclick=e=>{const b=e.target.closest('[data-dash-action]');if(!b)return;const r=db.requests.find(x=>x.id===b.dataset.id);if(!r)return;r.category=b.dataset.dashAction==='approve'?'approved':'rejected';r.decisionAt=new Date().toISOString();save();dashboard();toast('Student request '+r.category+'.');};
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
 const explicit=item?.dataset?.requestId;
 if(explicit){const exact=db.requests.find(r=>r.id===explicit);if(exact)return exact;}
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
 if(!duplicate)db.history.unshift({id:id(),requestId:r.id,equipment:r.equipment||r.title,user:r.title||'Researcher',institution:r.institution||r.department||'',date:new Date().toISOString(),duration:'—',status,reason});
 r.category=({Approved:'approved',Waitlisted:'waitlist',Declined:'rejected'})[status]||'rejected';
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
window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue){try{db=JSON.parse(e.newValue);const pg=location.pathname.split('/').pop();if(pg==='equipment.html')window.refreshEquipmentPage?.();if(pg==='dashboard.html')dashboard();if(pg==='requests.html')window.renderStudentPortalRequests?.();if(pg==='calendar.html')window.refreshCalendarPage?.();if(pg==='history.html')window.refreshHistoryPage?.();}catch(_){}}if(e.key===STUDENT_REQUESTS_KEY){syncFromStudentPortal();localStorage.setItem(KEY,JSON.stringify(db));const pg=location.pathname.split('/').pop();if(pg==='dashboard.html')dashboard();if(pg==='calendar.html')window.refreshCalendarPage?.();if(pg==='history.html')window.refreshHistoryPage?.();if(pg==='requests.html'){syncCards();window.renderStudentPortalRequests?.();}toast('Student booking data synchronized.')}});
const page=location.pathname.split('/').pop();
if(page==='equipment.html')equipmentPage();
if(page==='requests.html')requestPage();
if(page==='calendar.html')calendarPage();
if(page==='history.html')historyPage();
if(page==='dashboard.html')dashboard();
loadEquipmentFromSupabase();
})();
