async function loadResources() {
  const { data, error } = await window.supabaseClient
    .from('resources')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load resources:', error.message);
    showToast('Could not load equipment from database.');
    return;
  }

  equipment = data.map(item => ({
    id: item.id,
    name: item.name,
    short: item.name,
    category: item.category_id || 'Other',
    group: item.category_id || 'Other',
    lab: 'Campus Lab',
    department: 'Engineering & Sciences',
    status: item.available_quantity > 0 ? 'available' : 'borrowed',
    statusText: item.available_quantity > 0 ? 'Available' : 'Currently Borrowed',
    code: String(item.id),
    loan: 'As approved',
    value: 'Contact custodian',
    description: item.description || 'No description available.',
    tags: [`Total: ${item.total_quantity}`, `Available: ${item.available_quantity}`],
    specs: {
      Condition: item.condition || 'Not specified',
      'Total quantity': item.total_quantity,
      'Available quantity': item.available_quantity
    },
    location: 'Contact custodian',
    handling: 'Follow the custodian instructions.',
    images: ['https://placehold.co/800x500/e8eef7/294b78?text=CampusShare+Equipment']
  }));
  selectedEquipment = equipment[0] || null;

  renderCatalog();
}

const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
let equipment = [];
let selectedEquipment = null;
let selectedCategory = '';
let savedIds = new Set();
let toastTimer;

function showToast(message){const toast=$('#toast');toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2600)}
function showView(view){$('#browseView').classList.toggle('active',view==='browse');$('#detailsView').classList.toggle('active',view==='details');$$('.nav-link').forEach(btn=>btn.classList.toggle('active',btn.dataset.nav===(view==='details'?'browse':view)));window.scrollTo({top:0,behavior:'smooth'});}
function cardHTML(item){const statusClass=item.status==='available'?'':item.status;const buttonText=item.status==='available'?'View Details & Reserve →':item.status==='borrowed'?'Join Waitlist':'View Details →';return `<article class="equipment-card"><div class="product-image" data-open="${item.id}"><img loading="lazy" src="${item.images[0]}" alt="${item.name}" onerror="this.src='https://placehold.co/800x500/e8eef7/294b78?text=CampusShare+Equipment'"><span class="image-code">${item.code}</span><span class="stock-label ${statusClass}">${item.statusText}</span></div><div class="product-content"><div class="product-tags"><span class="tag">${item.lab}</span><span class="tag">${item.loan} loan</span></div><h3 data-open="${item.id}">${item.name}</h3><p>${item.description}</p><div class="spec-pills">${item.tags.slice(0,3).map(t=>`<span>${t}</span>`).join('')}</div><div class="product-footer"><span class="loan-time">◷ Max loan: ${item.loan}</span><button class="card-action" data-open="${item.id}">${buttonText}</button></div></div></article>`}
function renderCatalog(){let list=[...equipment];const query=$('#catalogSearch').value.trim().toLowerCase();const lab=$('#labFilter').value;const cat=$('#categoryFilter').value;const status=$('#availabilityFilter').value;const dept=$('#departmentFilter').value;list=list.filter(item=>{const text=[item.name,item.code,item.description,item.lab,item.category,...item.tags].join(' ').toLowerCase();return (!query||text.includes(query))&&(!lab||item.lab===lab)&&(!cat||item.category===cat)&&(!status||item.status===status)&&(!dept||item.department===dept)&&(!selectedCategory||selectedCategory==='All Categories'||(selectedCategory==='Available Now'?item.status==='available':item.category===selectedCategory));});const sort=$('#sortFilter').value;if(sort==='name')list.sort((a,b)=>a.name.localeCompare(b.name));if(sort==='available')list.sort((a,b)=>(a.status==='available'?-1:1)-(b.status==='available'?-1:1));$('#equipmentGrid').innerHTML=list.map(cardHTML).join('');$('#emptyState').classList.toggle('hidden',list.length>0);$('#equipmentGrid').classList.toggle('hidden',list.length===0);$('#resultCount').textContent=`Showing ${list.length} of 142 items available across all university labs`;}
function openDetails(id){const item=equipment.find(x=>x.id===id);if(!item)return;selectedEquipment=item;$('#detailBreadcrumbName').textContent=item.name;$('#detailsTitle').textContent=item.name;$('#detailCategory').textContent=`${item.category} · ${item.lab}`;$('#detailDescription').textContent=item.description;$('#detailStatus').textContent=item.status==='available'?'● Available for Reservation':item.status==='borrowed'?'● Currently Borrowed':'● High Demand · Waitlist';$('#detailStatus').className='status-pill '+(item.status==='available'?'available':'borrowed');$('#maxLoan').textContent=item.loan;$('#replacementValue').textContent=item.value;$('#pickupLocation').textContent=item.location;$('#handlingText').textContent=item.handling;$('#modalEquipmentName').textContent=item.name;$('#requestEquipment').disabled=item.status!=='available';$('#requestEquipment').textContent=item.status==='available'?'＋ Request This Equipment':'Join Waitlist';$('#favoriteButton').classList.toggle('saved',savedIds.has(item.id));$('#favoriteButton').textContent=savedIds.has(item.id)?'♥':'♡';$('#detailHeroImage').src=item.images[0];$('#detailHeroImage').alt=item.name;$('#thumbnailRow').innerHTML=item.images.map((src,i)=>`<button class="thumbnail ${i===0?'active':''}" data-image="${src}" aria-label="Show image ${i+1}"><img src="${src}" alt="${item.name} view ${i+1}" onerror="this.src='https://placehold.co/120x80/e8eef7/294b78?text=View'"></button>`).join('');$('#specGrid').innerHTML=Object.entries(item.specs).map(([key,value])=>`<div class="spec-item"><span>${key}</span><strong>${value}</strong></div>`).join('');renderRecommendations();showView('details');}
function renderRecommendations(){const suggestions=equipment.filter(x=>x.id!==selectedEquipment.id).slice(0,3);$('#recommendGrid').innerHTML=suggestions.map(item=>`<article class="recommend-card" data-open="${item.id}"><img src="${item.images[0]}" alt="${item.name}" loading="lazy" onerror="this.src='https://placehold.co/500x250/e8eef7/294b78?text=Equipment'"><div><small>${item.category} · ${item.lab}</small><strong>${item.name}</strong><span>View details →</span></div></article>`).join('');}
function openRequestModal(){if(selectedEquipment.status!=='available'){showToast('This item is not currently available.');return}$('#requestModal').classList.remove('hidden');const now=new Date();now.setMinutes(now.getMinutes()-now.getTimezoneOffset());const start=new Date(now);start.setDate(start.getDate()+1);const end=new Date(start);end.setDate(end.getDate()+1);$('#startDate').value=start.toISOString().slice(0,16);$('#endDate').value=end.toISOString().slice(0,16);$('#requestPurpose').focus();}
function closeRequestModal(){$('#requestModal').classList.add('hidden')}

$('#equipmentGrid').addEventListener('click',e=>{const target=e.target.closest('[data-open]');if(target)openDetails(target.dataset.open)});
$('#recommendGrid').addEventListener('click',e=>{const target=e.target.closest('[data-open]');if(target)openDetails(target.dataset.open)});
$('#thumbnailRow').addEventListener('click',e=>{const button=e.target.closest('[data-image]');if(!button)return;$('#detailHeroImage').src=button.dataset.image;$$('.thumbnail').forEach(t=>t.classList.toggle('active',t===button));});
['catalogSearch','labFilter','sortFilter','categoryFilter','availabilityFilter','departmentFilter'].forEach(id=>$('#'+id).addEventListener(id==='catalogSearch'?'input':'change',renderCatalog));
$('#categoryStrip').addEventListener('click',e=>{const tile=e.target.closest('[data-category]');if(!tile)return;selectedCategory=tile.dataset.category;$$('.category-tile').forEach(t=>t.classList.toggle('selected',t===tile));$('#categoryFilter').value=selectedCategory==='All Categories'||selectedCategory==='Available Now'?'':selectedCategory;renderCatalog();});
function clearFilters(){['catalogSearch','labFilter','categoryFilter','availabilityFilter','departmentFilter'].forEach(id=>$('#'+id).value='');selectedCategory='';$$('.category-tile').forEach(t=>t.classList.toggle('selected',t.dataset.category==='All Categories'));renderCatalog();}
$('#clearFilters').addEventListener('click',clearFilters);$('#emptyClear').addEventListener('click',clearFilters);
$('#backToBrowse').addEventListener('click',()=>showView('browse'));$('#brandLink').addEventListener('click',e=>{e.preventDefault();showView('browse')});
$('#requestEquipment').addEventListener('click',openRequestModal);$('#directRequestButton').addEventListener('click',()=>{selectedEquipment=equipment.find(x=>x.status==='available');openRequestModal()});$('#closeModal').addEventListener('click',closeRequestModal);$('#requestModal').addEventListener('click',e=>{if(e.target.id==='requestModal')closeRequestModal()});
$('#requestForm').addEventListener('submit',e=>{e.preventDefault();const start=new Date($('#startDate').value);const end=new Date($('#endDate').value);if(!(end>start)){showToast('Please choose an end date after the start date.');return}const record={id:'REQ-'+Date.now(),name:selectedEquipment.name,code:selectedEquipment.code||selectedEquipment.id,category:selectedEquipment.category||'Engineering & Robotics',department:'Engineering & Robotics',lab:selectedEquipment.lab||'Campus Lab',start:$('#startDate').value,end:$('#endDate').value,purpose:$('#requestPurpose').value.trim(),status:'review',image:selectedEquipment.images?.[0]||''};const saved=JSON.parse(localStorage.getItem('campusshareDemoRequests')||'[]');saved.unshift(record);localStorage.setItem('campusshareDemoRequests',JSON.stringify(saved));showToast(`Request submitted for ${selectedEquipment.name}. Status: Pending approval.`);closeRequestModal();$('#requestForm').reset();setTimeout(()=>window.parent.postMessage({source:'campusshare-page',type:'navigate',route:'requests'},'*'),500);});
$('#favoriteButton').addEventListener('click',()=>{if(savedIds.has(selectedEquipment.id)){savedIds.delete(selectedEquipment.id);showToast('Removed from saved equipment.')}else{savedIds.add(selectedEquipment.id);showToast('Equipment added to your saved list.')}$('#favoriteButton').classList.toggle('saved',savedIds.has(selectedEquipment.id));$('#favoriteButton').textContent=savedIds.has(selectedEquipment.id)?'♥':'♡';});
$('#savedButton').addEventListener('click',()=>showToast(`${savedIds.size} equipment item(s) saved in this demo.`));
$('#shareButton').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(`${location.href.split('#')[0]}#${selectedEquipment.id}`);showToast('Equipment link copied.')}catch{showToast('Share link: '+selectedEquipment.id)}});
$('#availabilityAlert').addEventListener('click',()=>showToast('Availability alert enabled for this demo session.'));
$('#viewCalendar').addEventListener('click',()=>showToast('Lab calendar integration will be added with the backend.'));
$('#viewLocation').addEventListener('click',()=>showToast(selectedEquipment.location));
$('#rulesButton').addEventListener('click',()=>showToast('Please carry your active student ID and return all accessories.'));
$('#reserveDeskButton').addEventListener('click',()=>showToast('Lab desk reservation will be available in a future module.'));
$('#downloadSpecs').addEventListener('click',()=>showToast('PDF export will be connected in a later version.'));
$('#expandImage').addEventListener('click',()=>window.open($('#detailHeroImage').src,'_blank','noopener'));
$('#completeInventory').addEventListener('click',()=>showView('browse'));
$('#helpLink').addEventListener('click',()=>showToast('Contact the equipment custodian listed on each item.'));
$('#notificationsBtn').addEventListener('click',()=>showToast('You are all caught up.'));
$('#profileBtn').addEventListener('click',()=>showToast('Signed in as Alex Chen (demo account).'));
$$('[data-contact]').forEach(btn=>btn.addEventListener('click',()=>showToast(`Contact ${btn.dataset.contact} through your university account.`)));
$$('.nav-link').forEach(btn=>btn.addEventListener('click',()=>{const nav=btn.dataset.nav;if(nav==='browse'){showView('browse')}else showToast(`${btn.textContent.trim()} will be available in its own module.`)}));
$('#mobileMenu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
$('#globalSearch').addEventListener('input',()=>{$('#catalogSearch').value=$('#globalSearch').value;renderCatalog();showView('browse')});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#globalSearch').focus()}if(e.key==='Escape')closeRequestModal()});
loadResources();
