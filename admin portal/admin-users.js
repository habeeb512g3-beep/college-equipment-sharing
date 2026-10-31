const initialUsers = [
  {id:1,name:'David Chen',email:'d.chen@campus.edu',netid:'dc8841',role:'Student',department:'Computer Science & Engineering',clearances:['Robotics Tier 2','VR Lab Access'],status:'Active',avatar:'DC',tone:'blue'},
  {id:2,name:'Dr. Elena Rostova',email:'e.rostova@campus.edu',netid:'er2019',role:'Faculty',department:'Physics & Astronomy',clearances:['High-Energy Laser Safety','Class 100 Cleanroom'],status:'Active',avatar:'ER',tone:'purple'},
  {id:3,name:'Marcus Thorne',email:'m.thorne@campus.edu',netid:'mt5032',role:'Equipment Owner',department:'Media Arts & Cinema',clearances:['Soundstage Custodian','ARRI Cinema Gear'],status:'Active',avatar:'MT',tone:'teal'},
  {id:4,name:'Amina Morales',email:'a.morales@campus.edu',netid:'am7190',role:'Student',department:'Biomedical Sciences',clearances:['BioSafety Level 2 (Pending Review)'],status:'Pending',avatar:'AM',tone:'gold'},
  {id:5,name:"Liam O'Connor",email:'loconnor@campus.edu',netid:'lo3381',role:'Student',department:'Civil & Environmental Engineering',clearances:['Hold: Severe Overdue Drone #4'],status:'Suspended',avatar:'LO',tone:'red'},
  {id:6,name:'Sarah Lin',email:'s.lin@campus.edu',netid:'sl4420',role:'Admin',department:'Campus Technology Services',clearances:['Root Infrastructure','Audit Auditor'],status:'Active',avatar:'SL',tone:'dark'}
];

const STORAGE_KEY = 'campusshare_admin_users_demo_v1';
let users = loadUsers();
let toastTimer;
const tbody = document.getElementById('usersTableBody');
const searchInput = document.getElementById('userSearch');
const roleFilter = document.getElementById('roleFilter');
const statusFilter = document.getElementById('statusFilter');
const modalBackdrop = document.getElementById('modalBackdrop');
const userForm = document.getElementById('userForm');

function loadUsers(){
  try { const saved = localStorage.getItem(STORAGE_KEY); return saved ? JSON.parse(saved) : initialUsers.map(u=>({...u,clearances:[...u.clearances]})); }
  catch { return initialUsers.map(u=>({...u,clearances:[...u.clearances]})); }
}
function persist(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(users)); }
function escapeHtml(value=''){return String(value).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function badgeClass(status){return status.toLowerCase();}
function roleClass(role){return role==='Equipment Owner'?'owner':role==='Admin'?'admin':'';}
function initials(name){return name.trim().split(/\s+/).slice(0,2).map(p=>p[0]).join('').toUpperCase();}
function visibleUsers(){
  const query=searchInput.value.trim().toLowerCase();
  const role=roleFilter.value, status=statusFilter.value;
  return users.filter(user=>{
    const haystack=[user.name,user.email,user.netid,user.department,...user.clearances].join(' ').toLowerCase();
    return (!query||haystack.includes(query)) && (role==='all'||user.role===role) && (status==='all'||user.status===status);
  });
}
function renderUsers(){
  const list=visibleUsers();
  tbody.innerHTML=list.map(user=>{
    const clearanceHtml=user.clearances.length?user.clearances.map(item=>{
      const lower=item.toLowerCase();
      const kind=lower.includes('hold')?'danger':lower.includes('pending')?'warning':'';
      return `<span class="clearance-chip ${kind}">${escapeHtml(item)}</span>`;
    }).join(''):'<span class="clearance-chip">No clearance listed</span>';
    const suspendAction=user.status==='Suspended'
      ? `<button class="row-action" data-action="activate" data-id="${user.id}" title="Reactivate account" aria-label="Reactivate ${escapeHtml(user.name)}">✓</button>`
      : `<button class="row-action danger" data-action="suspend" data-id="${user.id}" title="Suspend account" aria-label="Suspend ${escapeHtml(user.name)}">⊘</button>`;
    return `<tr>
      <td><div class="user-cell"><span class="user-avatar ${escapeHtml(user.tone||'blue')}">${escapeHtml(user.avatar||initials(user.name))}</span><div><div class="user-name">${escapeHtml(user.name)}</div><div class="user-email">${escapeHtml(user.email)}</div></div></div></td>
      <td><span class="netid">${escapeHtml(user.netid)}</span></td>
      <td><span class="role-badge ${roleClass(user.role)}">${escapeHtml(user.role)}</span></td>
      <td>${escapeHtml(user.department)}</td>
      <td><div class="clearance-list">${clearanceHtml}</div></td>
      <td><span class="status-badge ${badgeClass(user.status)}">${escapeHtml(user.status)}</span></td>
      <td class="actions-cell"><button class="row-action" data-action="view" data-id="${user.id}" title="View user" aria-label="View ${escapeHtml(user.name)}">⊙</button><button class="row-action" data-action="edit" data-id="${user.id}" title="Edit user" aria-label="Edit ${escapeHtml(user.name)}">✎</button>${suspendAction}</td>
    </tr>`;
  }).join('');
  document.getElementById('emptyState').hidden=list.length!==0;
  document.getElementById('resultCount').textContent=`Showing ${list.length} of ${users.length} demo campus account${users.length===1?'':'s'}`;
  document.getElementById('pageSummary').textContent=`Displaying ${list.length} filtered demo record${list.length===1?'':'s'}`;
}
function showToast(message){
  const toast=document.getElementById('toast');toast.textContent=message;toast.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),3000);
}
function openModal(title){document.getElementById('modalTitle').textContent=title;modalBackdrop.hidden=false;document.body.style.overflow='hidden';setTimeout(()=>document.getElementById('formName').focus(),30);}
function closeModal(){modalBackdrop.hidden=true;document.body.style.overflow='';userForm.reset();document.getElementById('editUserId').value='';}
function getUser(id){return users.find(user=>user.id===Number(id));}
function openAddUser(){userForm.reset();document.getElementById('editUserId').value='';document.getElementById('saveUserButton').textContent='Save user';openModal('Add user');}
function openEditUser(user){
  document.getElementById('editUserId').value=user.id;
  document.getElementById('formName').value=user.name;
  document.getElementById('formEmail').value=user.email;
  document.getElementById('formNetid').value=user.netid;
  document.getElementById('formRole').value=user.role;
  document.getElementById('formDepartment').value=user.department;
  document.getElementById('formStatus').value=user.status;
  document.getElementById('formClearances').value=user.clearances.join(', ');
  document.getElementById('saveUserButton').textContent='Save changes';openModal('Edit user');
}
function showUserDetails(user){
  const backdrop=modalBackdrop;
  const body=document.querySelector('.modal');
  document.getElementById('modalTitle').textContent='User account details';
  userForm.hidden=true;
  let details=document.getElementById('userDetails');
  if(!details){details=document.createElement('div');details.id='userDetails';body.appendChild(details);}
  details.hidden=false;
  details.innerHTML=`<dl class="detail-list"><dt>Full name</dt><dd>${escapeHtml(user.name)}</dd><dt>Email</dt><dd>${escapeHtml(user.email)}</dd><dt>NetID</dt><dd>${escapeHtml(user.netid)}</dd><dt>Role</dt><dd>${escapeHtml(user.role)}</dd><dt>Department</dt><dd>${escapeHtml(user.department)}</dd><dt>Account status</dt><dd><span class="status-badge ${badgeClass(user.status)}">${escapeHtml(user.status)}</span></dd></dl><p class="detail-section-title">Clearances / Certifications</p><div class="clearance-list">${user.clearances.map(c=>`<span class="clearance-chip">${escapeHtml(c)}</span>`).join('')||'No clearance listed'}</div><p class="detail-note">Sample directory details for the frontend prototype. Production account details must be retrieved from an authorised backend.</p>`;
  openModal('User account details');
}
function restoreFormModal(){const details=document.getElementById('userDetails');if(details)details.hidden=true;userForm.hidden=false;}

tbody.addEventListener('click',event=>{
  const button=event.target.closest('button[data-action]');if(!button)return;
  const user=getUser(button.dataset.id);if(!user)return;
  switch(button.dataset.action){
    case 'view':restoreFormModal();showUserDetails(user);break;
    case 'edit':restoreFormModal();openEditUser(user);break;
    case 'suspend':if(confirm(`Suspend ${user.name}'s demo account?`)){user.status='Suspended';persist();renderUsers();showToast(`${user.name} marked as suspended in this browser.`);}break;
    case 'activate':if(confirm(`Reactivate ${user.name}'s demo account?`)){user.status='Active';persist();renderUsers();showToast(`${user.name} marked as active in this browser.`);}break;
  }
});
userForm.addEventListener('submit',event=>{
  event.preventDefault();
  const id=document.getElementById('editUserId').value;
  const data={name:document.getElementById('formName').value.trim(),email:document.getElementById('formEmail').value.trim(),netid:document.getElementById('formNetid').value.trim(),role:document.getElementById('formRole').value,department:document.getElementById('formDepartment').value.trim(),status:document.getElementById('formStatus').value,clearances:document.getElementById('formClearances').value.split(',').map(x=>x.trim()).filter(Boolean)};
  if(!data.name||!data.email||!data.netid||!data.department){showToast('Complete all required fields.');return;}
  const duplicate=users.find(u=>(u.email.toLowerCase()===data.email.toLowerCase()||u.netid.toLowerCase()===data.netid.toLowerCase())&&String(u.id)!==id);
  if(duplicate){showToast('A user with this email address or NetID already exists.');return;}
  if(id){const index=users.findIndex(u=>u.id===Number(id));users[index]={...users[index],...data,avatar:initials(data.name)};showToast('Demo user details updated.');}
  else{users.unshift({id:Date.now(),...data,avatar:initials(data.name),tone:'blue'});showToast('Demo user added to this browser.');}
  persist();renderUsers();closeModal();restoreFormModal();
});

searchInput.addEventListener('input',renderUsers);roleFilter.addEventListener('change',renderUsers);statusFilter.addEventListener('change',renderUsers);
document.getElementById('resetFilters').addEventListener('click',()=>{searchInput.value='';roleFilter.value='all';statusFilter.value='all';renderUsers();showToast('Directory filters reset.');});
document.getElementById('addUserButton').addEventListener('click',()=>{restoreFormModal();openAddUser();});
document.getElementById('closeModal').addEventListener('click',()=>{closeModal();restoreFormModal();});
document.getElementById('cancelModal').addEventListener('click',()=>{closeModal();restoreFormModal();});
modalBackdrop.addEventListener('click',event=>{if(event.target===modalBackdrop){closeModal();restoreFormModal();}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!modalBackdrop.hidden){closeModal();restoreFormModal();}});

document.getElementById('exportButton').addEventListener('click',()=>{
  const columns=['Name','Email','NetID','Role','Department','Clearances','Status'];
  const rows=visibleUsers().map(u=>[u.name,u.email,u.netid,u.role,u.department,u.clearances.join('; '),u.status]);
  const csv=[columns,...rows].map(row=>row.map(value=>`"${String(value??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='campusshare-user-directory-demo.csv';document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);showToast('Filtered demo directory exported as CSV.');
});
document.querySelector('.notification-button').addEventListener('click',()=>showToast('No live admin notifications are connected in this demo.'));
document.getElementById('accountButton').addEventListener('click',()=>showToast('Signed in as a demo Admin Supervisor.'));
renderUsers();
