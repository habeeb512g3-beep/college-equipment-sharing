/* CampusShare Admin Portal shared navigation.
   Normal anchors are allowed to navigate. This helper adds consistent active states,
   keyboard access for dashboard tiles and cross-module global search. */
(() => {
  'use strict';
  const pages = {
    dashboard: 'index.html', users: 'users.html', owners: 'owner-applications.html',
    equipment: 'equipment.html', bookings: 'bookings.html', incidents: 'incidents.html',
    activity: 'activity-logs.html'
  };
  const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const routeToSearch = [
    { test: /inc-|incident|damage|repair|fault|safety/i, file: pages.incidents },
    { test: /own-|owner|application|custodian|faculty|lab manager/i, file: pages.owners },
    { test: /eq-|equipment|inventory|asset|camera|oscilloscope|projector|laptop|printer|robotics|device|tool/i, file: pages.equipment },
    { test: /bk-|booking|borrow\w*|check.?out|loan|reservation|overdue/i, file: pages.bookings },
    { test: /log|activity|notification|audit|event|security/i, file: pages.activity },
    { test: /@|user|student|account|netid|email|suspended/i, file: pages.users }
  ];
  const searchSelectors = {
    'users.html': '#userSearch',
    'owner-applications.html': '#applicationSearch',
    'equipment.html': '#equipmentSearch',
    'bookings.html': '#bookingSearch',
    'incidents.html': '#globalSearch',
    'activity-logs.html': '#searchInput'
  };

  // Resolve active navigation item from the current filename.
  document.querySelectorAll('.side-nav a[href]').forEach(link => {
    const href = (link.getAttribute('href') || '').split('?')[0].split('#')[0].toLowerCase();
    const isCurrent = href === current;
    link.classList.toggle('active', isCurrent);
    if (isCurrent) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
    // On mobile, close the drawer after a valid page navigation.
    link.addEventListener('click', () => document.querySelector('.sidebar.open')?.classList.remove('open'));
  });

  // Brand/home logos always return to the Admin dashboard.
  document.querySelectorAll('.brand[href^="#"]').forEach(link => link.setAttribute('href', pages.dashboard));

  // Dashboard cards/section headers use data-go and work with mouse and keyboard.
  document.querySelectorAll('[data-go]').forEach(element => {
    const navigate = event => {
      if (event.type === 'click' && event.target.closest('a,button,input,select,textarea,label')) return;
      const destination = element.dataset.go;
      if (!destination) return;
      location.href = destination;
    };
    element.addEventListener('click', navigate);
    element.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(event); }
    });
  });

  const globalSearch = document.querySelector('[data-admin-global-search]');
  if (globalSearch) {
    globalSearch.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      const query = globalSearch.value.trim();
      if (!query) return;
      const matched = routeToSearch.find(route => route.test.test(query));
      const destination = matched ? matched.file : pages.bookings;
      if (destination === current) {
        const target = document.querySelector(searchSelectors[current]);
        if (target && target !== globalSearch) {
          target.value = query;
          target.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return;
      }
      location.href = `${destination}?q=${encodeURIComponent(query)}`;
    });
  }

  // Apply a query carried over from another page into the destination page's local filter.
  const carriedQuery = new URLSearchParams(location.search).get('q');
  if (carriedQuery && searchSelectors[current]) {
    const target = document.querySelector(searchSelectors[current]);
    if (target) {
      target.value = carriedQuery;
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // Consistent Ctrl/Cmd+K shortcut for the page-level global search.
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      if (!globalSearch) return;
      event.preventDefault();
      globalSearch.focus();
    }
  });
})();
