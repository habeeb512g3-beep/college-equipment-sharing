const searchInput = document.getElementById('equipmentSearch');
const equipmentGrid = document.getElementById('equipmentGrid');
const equipmentCards = [...document.querySelectorAll('.equipment-card')];
const categoryButtons = [...document.querySelectorAll('.category-chip')];
const emptyState = document.getElementById('emptyState');
const filterDrawer = document.getElementById('filterDrawer');
const availabilityFilter = document.getElementById('availabilityFilter');
const locationFilter = document.getElementById('locationFilter');
const filterCount = document.getElementById('filterCount');
const toast = document.getElementById('toast');
const requestModal = document.getElementById('requestModal');
const reservationForm = document.getElementById('reservationForm');
let activeCategory = 'All Categories';
let sortNewestFirst = true;
let activeRequestCount = 2;
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  const availability = availabilityFilter.value;
  const location = locationFilter.value;
  let visibleCount = 0;

  equipmentCards.forEach(card => {
    const matchesSearch = `${card.dataset.name} ${card.dataset.category} ${card.dataset.location} ${card.textContent}`.toLowerCase().includes(query);
    const matchesCategory = activeCategory === 'All Categories' || card.dataset.category === activeCategory;
    const matchesAvailability = availability === 'all' || card.dataset.availability === availability;
    const matchesLocation = location === 'all' || card.dataset.location === location;
    const visible = matchesSearch && matchesCategory && matchesAvailability && matchesLocation;
    card.hidden = !visible;
    if (visible) visibleCount++;
  });

  emptyState.hidden = visibleCount !== 0;
  equipmentGrid.hidden = visibleCount === 0;
  const hasFilter = availability !== 'all' || location !== 'all';
  filterCount.hidden = !hasFilter;
  filterCount.textContent = hasFilter ? '1' : '';
}

categoryButtons.forEach(button => {
  button.addEventListener('click', () => {
    categoryButtons.forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    activeCategory = button.dataset.category;
    applyFilters();
  });
});

searchInput.addEventListener('input', applyFilters);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    searchInput.value = '';
    applyFilters();
    closeModal();
    closeMobileMenu();
    document.getElementById('notificationPopover').hidden = true;
    document.getElementById('profilePopover').hidden = true;
  }
});
document.querySelector('.search-box kbd').addEventListener('click', () => {
  searchInput.value = '';
  applyFilters();
  searchInput.focus();
});

document.getElementById('filterButton').addEventListener('click', () => {
  filterDrawer.hidden = !filterDrawer.hidden;
});
availabilityFilter.addEventListener('change', applyFilters);
locationFilter.addEventListener('change', applyFilters);
document.getElementById('clearFilters').addEventListener('click', () => {
  availabilityFilter.value = 'all';
  locationFilter.value = 'all';
  applyFilters();
  showToast('Filters cleared.');
});
document.getElementById('resetSearch').addEventListener('click', () => {
  searchInput.value = '';
  availabilityFilter.value = 'all';
  locationFilter.value = 'all';
  activeCategory = 'All Categories';
  categoryButtons.forEach(button => button.classList.toggle('active', button.dataset.category === activeCategory));
  applyFilters();
});

document.getElementById('sortButton').addEventListener('click', () => {
  sortNewestFirst = !sortNewestFirst;
  equipmentCards.sort((a, b) => sortNewestFirst ? Number(b.dataset.date) - Number(a.dataset.date) : Number(a.dataset.date) - Number(b.dataset.date));
  equipmentCards.forEach(card => equipmentGrid.appendChild(card));
  document.getElementById('sortLabel').textContent = sortNewestFirst ? 'Sort: Newest' : 'Sort: Oldest';
  showToast(sortNewestFirst ? 'Showing newest equipment first.' : 'Showing oldest equipment first.');
});

function openModal(itemName) {
  document.getElementById('selectedItemName').textContent = itemName;
  document.getElementById('modalTitle').textContent = itemName.includes('Dell Precision') ? 'Join the waitlist' : 'Request equipment';
  const today = new Date();
  const minDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const nextWeekValue = new Date(nextWeek.getTime() - nextWeek.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  document.getElementById('startDate').min = minDate;
  document.getElementById('startDate').value = minDate;
  document.getElementById('endDate').min = minDate;
  document.getElementById('endDate').value = nextWeekValue;
  requestModal.hidden = false;
  document.body.style.overflow = 'hidden';
  document.getElementById('startDate').focus({ preventScroll: true });
}
function closeModal() {
  requestModal.hidden = true;
  document.body.style.overflow = '';
}
document.querySelectorAll('.request-button').forEach(button => button.addEventListener('click', () => openModal(button.dataset.item)));
document.querySelectorAll('.image-action').forEach(button => button.addEventListener('click', () => {
  const card = button.closest('.equipment-card');
  openModal(card.dataset.name);
}));
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('cancelRequest').addEventListener('click', closeModal);
requestModal.addEventListener('click', event => { if (event.target === requestModal) closeModal(); });
document.getElementById('startDate').addEventListener('change', event => {
  document.getElementById('endDate').min = event.target.value;
  if (document.getElementById('endDate').value < event.target.value) document.getElementById('endDate').value = event.target.value;
});
reservationForm.addEventListener('submit', event => {
  event.preventDefault();
  const start = document.getElementById('startDate').value;
  const end = document.getElementById('endDate').value;
  if (end < start) {
    showToast('Return date must be the same as or later than the start date.');
    return;
  }
  const itemName = document.getElementById('selectedItemName').textContent;
  const record = { id: `REQ-${Date.now()}`, name: itemName, code: 'DASH-REQUEST', category: 'Engineering & Robotics', department: 'Engineering & Robotics', lab: 'Campus Lab', start, end, purpose: document.getElementById('requestPurpose').value.trim(), status: 'review', image: '' };
  const saved = JSON.parse(localStorage.getItem('campusshareDemoRequests') || '[]');
  saved.unshift(record);
  localStorage.setItem('campusshareDemoRequests', JSON.stringify(saved));
  activeRequestCount++;
  document.getElementById('activeRequestCount').innerHTML = `${activeRequestCount} <span class="stat-unit">requests</span>`;
  closeModal();
  reservationForm.reset();
  showToast(`Request for ${itemName} submitted. Status: Pending approval.`);
  setTimeout(() => window.parent.postMessage({ source: 'campusshare-page', type: 'navigate', route: 'requests' }, '*'), 500);
});

const notificationButton = document.getElementById('notificationButton');
const notificationPopover = document.getElementById('notificationPopover');
const profileButton = document.getElementById('profileButton');
const profilePopover = document.getElementById('profilePopover');
notificationButton.addEventListener('click', event => {
  event.stopPropagation();
  notificationPopover.hidden = !notificationPopover.hidden;
  profilePopover.hidden = true;
});
profileButton.addEventListener('click', event => {
  event.stopPropagation();
  profilePopover.hidden = !profilePopover.hidden;
  notificationPopover.hidden = true;
});
document.addEventListener('click', event => {
  if (!event.target.closest('.notification-wrap')) notificationPopover.hidden = true;
  if (!event.target.closest('.profile-wrap')) profilePopover.hidden = true;
});
profilePopover.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
  profilePopover.hidden = true;
  showToast(`${button.dataset.profileAction} is a frontend demo action.`);
}));

const sidebar = document.getElementById('sidebar');
const mobileOverlay = document.getElementById('mobileOverlay');
function closeMobileMenu() { sidebar.classList.remove('open'); mobileOverlay.classList.remove('show'); }
document.getElementById('mobileMenu').addEventListener('click', () => {
  sidebar.classList.add('open');
  mobileOverlay.classList.add('show');
});
mobileOverlay.addEventListener('click', closeMobileMenu);

document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  document.querySelectorAll('.nav-link').forEach(item => item.classList.remove('active'));
  link.classList.add('active');
  closeMobileMenu();
  const section = link.dataset.nav;
  if (section === 'Browse Equipment') document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
  else if (section === 'History') document.getElementById('history').scrollIntoView({ behavior: 'smooth' });
  else if (section === 'Dashboard') document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
  else showToast(`${section} page will be connected in the next development step.`);
}));

document.getElementById('bannerBrowse').addEventListener('click', () => setTimeout(() => searchInput.focus({ preventScroll: true }), 400));
document.getElementById('exploreLink').addEventListener('click', event => { event.preventDefault(); document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' }); searchInput.focus({ preventScroll: true }); });
document.getElementById('historyLink').addEventListener('click', event => { event.preventDefault(); showToast('You are viewing the latest borrowing activity.'); });
document.getElementById('supportLink').addEventListener('click', event => { event.preventDefault(); showToast('Campus support contact details can be added here.'); });
document.getElementById('returnReminder').addEventListener('click', event => { event.preventDefault(); showToast('Your TI-Nspire calculator is due in 3 days.'); });
document.getElementById('inspectionLink').addEventListener('click', event => { event.preventDefault(); showToast('Inspection passed: no component loss reported.'); });
document.getElementById('sidebarMore').addEventListener('click', () => showToast('Account options are available from the profile menu above.'));
