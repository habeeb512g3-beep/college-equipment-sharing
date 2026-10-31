
(() => {
  const frame = document.getElementById('portalFrame');
  const toast = document.getElementById('portalToast');

  const routes = {
    login: 'Student%20portal/login/index.html',
    registration: 'Student%20portal/registration/index.html',
    dashboard: 'Student%20portal/dashboard/index.html',
    browse: 'Student%20portal/browse/index.html',
    requests: 'Student%20portal/requests/index.html',
    borrowed: 'Student%20portal/borrowed/index.html',
    history: 'Student%20portal/history/index.html',
    profile: 'Student%20portal/profile/index.html',
    admin: 'admin%20portal/index.html'
  };

  let toastTimer;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function hasDemoSession() {
    return localStorage.getItem('campusshareDemoSession') === 'student-demo';
  }

  function navigate(route, options = {}) {
    if (!routes[route]) return;

    if (
      ['dashboard', 'browse', 'requests', 'borrowed', 'history', 'profile'].includes(route) &&
      !hasDemoSession()
    ) {
      showToast('Please sign in to open the Student Portal.');
      route = 'login';
    }

    let src = routes[route];

    if (route === 'login' && options.email) {
      src += `?email=${encodeURIComponent(options.email)}`;
    }

    frame.src = src;
    history.replaceState(null, '', `#${route}`);
  }

  window.addEventListener('message', event => {
    if (
      event.source !== frame.contentWindow ||
      !event.data ||
      event.data.source !== 'campusshare-page'
    ) return;

    const data = event.data;

    if (data.type === 'navigate') {
      navigate(data.route);
    }

    if (data.type === 'admin-login-success') {
      localStorage.removeItem('campusshareDemoSession');
      showToast('Administrator verified. Opening Admin Portal.');
      navigate('admin');
    }

    if (data.type === 'owner-login-success') {
      localStorage.removeItem('campusshareDemoSession');
      showToast('Staff verified. Opening Staff Portal.');
      frame.src = 'staff%20portal/dashboard.html';
      history.replaceState(null, '', '#staff');
    }

    if (data.type === 'login-success') {
      localStorage.setItem('campusshareDemoSession', 'student-demo');

      if (data.profile) {
        localStorage.setItem(
          'campusshareDemoProfile',
          JSON.stringify(data.profile)
        );
      }

      showToast('Welcome to CampusShare Student Portal.');
      navigate('dashboard');
    }

    if (data.type === 'registration-success') {
      if (data.profile) {
        localStorage.setItem(
          'campusshareDemoProfile',
          JSON.stringify(data.profile)
        );
      }

      showToast('Student profile saved in this browser demo. Please sign in.');
      navigate('login', { email: data.profile?.email || '' });
    }

    if (data.type === 'admin-logout' || data.type === 'logout') {
      window.supabaseClient?.auth.signOut();
      localStorage.removeItem('campusshareDemoSession');
      showToast('You have signed out of the portal.');
      navigate('login');
    }

    if (data.type === 'staff-unavailable') {
      showToast('The Staff / Equipment Owner Portal will be added in the next stage.');
    }
  });

  window.addEventListener('hashchange', () => {
    const route = location.hash.slice(1);
    if (routes[route]) navigate(route);
  });

  const firstRoute = location.hash.slice(1);

  if (firstRoute && routes[firstRoute]) {
    navigate(firstRoute);
  } else if (hasDemoSession()) {
    navigate('dashboard');
  } else {
    navigate('login');
  }
})();
