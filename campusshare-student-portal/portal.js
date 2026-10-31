(() => {
  const frame = document.getElementById('portalFrame');
  const toast = document.getElementById('portalToast');
  const routes = {
    login: 'student portal/login/index.html', registration: 'student portal/registration/index.html',
    dashboard: 'student portal/dashboard/index.html', browse: 'student portal/browse/index.html',
    requests: 'student portal/requests/index.html', borrowed: 'student portal/borrowed/index.html',
    history: 'student portal/history/index.html', profile: 'student portal/profile/index.html'
  };
  let toastTimer;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
  }
  function hasDemoSession() { return localStorage.getItem('campusshareDemoSession') === 'student-demo'; }
  function navigate(route, options = {}) {
    if (!routes[route]) return;
    if (['dashboard','browse','requests','borrowed','history','profile'].includes(route) && !hasDemoSession()) {
      showToast('Please sign in to open the Student Portal.');
      route = 'login';
    }
    let src = routes[route];
    if (route === 'login' && options.email) src += `?email=${encodeURIComponent(options.email)}`;
    frame.src = src;
    history.replaceState(null, '', `#${route}`);
  }
  window.addEventListener('message', event => {
    if (event.source !== frame.contentWindow || !event.data || event.data.source !== 'campusshare-page') return;
    const data = event.data;
    if (data.type === 'navigate') navigate(data.route);
    if (data.type === 'login-success') {
      localStorage.setItem('campusshareDemoSession', 'student-demo');
      if (data.profile) localStorage.setItem('campusshareDemoProfile', JSON.stringify(data.profile));
      showToast('Welcome to CampusShare Student Portal.');
      navigate('dashboard');
    }
    if (data.type === 'registration-success') {
      if (data.profile) localStorage.setItem('campusshareDemoProfile', JSON.stringify(data.profile));
      showToast('Student profile saved in this browser demo. Please sign in.');
      navigate('login', { email: data.profile?.email || '' });
    }
    if (data.type === 'logout') {
      localStorage.removeItem('campusshareDemoSession');
      showToast('You have signed out of the demo portal.');
      navigate('login');
    }
    if (data.type === 'staff-unavailable') showToast('The Staff / Equipment Owner Portal will be added in the next stage.');
  });
  window.addEventListener('hashchange', () => {
    const route = location.hash.slice(1);
    if (routes[route]) navigate(route);
  });
  const firstRoute = location.hash.slice(1);
  if (firstRoute && routes[firstRoute]) navigate(firstRoute);
  else if (hasDemoSession()) navigate('dashboard');
  else navigate('login');
})();
