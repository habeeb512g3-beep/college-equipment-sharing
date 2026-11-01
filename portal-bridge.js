(() => {
  if (window.parent === window) return;
  const routeByHash = {
    '#dashboard': 'dashboard', '#catalog': 'browse', '#browse': 'browse',
    '#requests': 'requests', '#borrowed': 'borrowed', '#history': 'history',
    '#profile': 'profile', '#settings': 'profile', '#register': 'registration',
    '#signin': 'login', '#login': 'login'
  };
  const send = (type, extra = {}) => window.parent.postMessage({ source: 'campusshare-page', type, ...extra }, '*');
  document.addEventListener('click', (event) => {
    const target = event.target.closest('button, a');
    if (!target) return;
    const label = (target.textContent || '').trim().toLowerCase();
    if (target.id === 'switchViewBtn' || /switch to (equipment )?custodian|lab manager portal/.test(label)) {
      event.preventDefault(); event.stopImmediatePropagation(); send('staff-unavailable'); return;
    }
    if (/sign out all workstations|sign out|log out/.test(label)) {
      event.preventDefault(); event.stopImmediatePropagation(); send('logout'); return;
    }
    let route = null;
    if (target.matches('[data-nav]')) {
      const value = (target.dataset.nav || '').toLowerCase();
      route = value.includes('dashboard') ? 'dashboard' : value.includes('browse') || value.includes('catalog') ? 'browse' : value.includes('request') ? 'requests' : value.includes('borrow') ? 'borrowed' : value.includes('history') ? 'history' : value.includes('profile') || value.includes('setting') ? 'profile' : null;
    }
    if (!route && target.matches('a[href^="#"]')) route = routeByHash[target.getAttribute('href').toLowerCase()];
    if (route) {
      event.preventDefault(); event.stopImmediatePropagation(); send('navigate', { route });
    }
  }, true);

  // Keep the student-only release clear: custodian controls are visible only in the later staff portal.
  const style = document.createElement('style');
  style.textContent = '.secondary-role,.muted-pill,#labManagerBtn,.role-pill.secondary-role,.role-switch #labManagerBtn{display:none!important}';
  document.head.appendChild(style);

  function applyDemoProfile() {
    try {
      const profile = JSON.parse(localStorage.getItem('campusshareDemoProfile') || 'null');
      if (!profile) return;
      const name = profile.fullName || 'Alex Chen';
      const initials = name.split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase() || 'ST';
      document.querySelectorAll('.sidebar-user-copy strong,.profile-copy strong,.profile-copy b,.user-name,.identity-copy h1,.name-line h1').forEach(el => { el.textContent = name; });
      document.querySelectorAll('.avatar,.avatar-mini,.avatar-top,.avatar-sidebar,.profile-photo span').forEach(el => { el.textContent = initials; });
      document.querySelectorAll('.profile-email').forEach(el => { if (profile.email) el.textContent = profile.email; });
    } catch (_) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyDemoProfile, { once: true });
  else applyDemoProfile();
})();
