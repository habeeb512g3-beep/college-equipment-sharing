
(() => {
  "use strict";

  const frame = document.getElementById("portalFrame");
  const toast = document.getElementById("portalToast");

  
  if (!frame) {
    console.error('CampusShare: Missing iframe with id="portalFrame".');
    return;
  }

  const routes = {
    login: "Student%20portal/login/index.html",
    registration: "Student%20portal/registration/index.html",

   
    dashboard: "Student%20portal/dashboard/index.html",
    browse: "Student%20portal/browse/index.html",
    requests: "Student%20portal/requests/index.html",
    borrowed: "Student%20portal/borrowed/index.html",
    history: "Student%20portal/history/index.html",
    profile: "Student%20portal/profile/index.html",
    staff: "staff%20portal/dashboard.html",
    admin: "admin%20portal/index.html"
  };

  const studentRoutes = [
    "dashboard",
    "browse",
    "requests",
    "borrowed",
    "history",
    "profile"
  ];

  let toastTimer = null;


  function showToast(message) {
    if (!toast) {
      console.info("CampusShare:", message);
      return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    if (toastTimer) {
      clearTimeout(toastTimer);
    }

    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }

  
  function getSessionRole() {
    return localStorage.getItem("campusshareSessionRole");
  }

  function setSessionRole(role) {
    localStorage.setItem("campusshareSessionRole", role);
  }

  function clearPortalSession() {
    localStorage.removeItem("campusshareSessionRole");
    localStorage.removeItem("campusshareDemoSession");
    localStorage.removeItem("campusshareDemoProfile");
    localStorage.removeItem("campusshareAuthProfile");
  }

  function hasStudentSession() {
    return (
      getSessionRole() === "student" ||
      localStorage.getItem("campusshareDemoSession") === "student-demo"
    );
  }

  function hasStaffSession() {
    return getSessionRole() === "staff";
  }

  function hasAdminSession() {
    return getSessionRole() === "admin";
  }

 
  function navigate(route, options = {}) {
    if (!routes[route]) {
      console.warn(`CampusShare: Unknown route "${route}".`);
      return;
    }

  
    if (studentRoutes.includes(route) && !hasStudentSession()) {
      showToast("Please sign in with a Student account.");
      route = "login";
    }

  
    if (route === "staff" && !hasStaffSession()) {
      showToast("Please sign in with an Equipment Owner account.");
      route = "login";
    }

    
    if (route === "admin" && !hasAdminSession()) {
      showToast("Please sign in with an Admin account.");
      route = "login";
    }

    let src = routes[route];

    if (route === "login" && options.email) {
      src += `?email=${encodeURIComponent(options.email)}`;
    }

    frame.src = src;

  
    if (location.hash !== `#${route}`) {
      history.replaceState(null, "", `#${route}`);
    }
  }


  window.addEventListener("message", async (event) => {
  
    if (
      event.source !== frame.contentWindow ||
      !event.data ||
      event.data.source !== "campusshare-page"
    ) {
      return;
    }

    const data = event.data;

  
    if (data.type === "navigate") {
      navigate(data.route, data.options || {});
      return;
    }

  
    if (data.type === "login-success") {
      setSessionRole("student");
      localStorage.setItem("campusshareDemoSession", "student-demo");

      if (data.profile) {
        localStorage.setItem(
          "campusshareDemoProfile",
          JSON.stringify(data.profile)
        );
      }

      showToast("Welcome to CampusShare Student Portal.");
      navigate("dashboard");
      return;
    }

  
    if (data.type === "owner-login-success") {
      setSessionRole("staff");

  
      localStorage.removeItem("campusshareDemoSession");

      if (data.profile) {
        localStorage.setItem(
          "campusshareAuthProfile",
          JSON.stringify(data.profile)
        );
      }

      showToast("Staff verified. Opening Staff Portal.");
      navigate("staff");
      return;
    }

    
    if (data.type === "admin-login-success") {
      setSessionRole("admin");
      localStorage.removeItem("campusshareDemoSession");

      if (data.profile) {
        localStorage.setItem(
          "campusshareAuthProfile",
          JSON.stringify(data.profile)
        );
      }

      showToast("Administrator verified. Opening Admin Portal.");
      navigate("admin");
      return;
    }

    
    if (data.type === "registration-success") {
      if (data.profile) {
        localStorage.setItem(
          "campusshareDemoProfile",
          JSON.stringify(data.profile)
        );
      }

      showToast("Student registration complete. Please sign in.");
      navigate("login", {
        email: data.profile?.email || ""
      });
      return;
    }

    
    if (data.type === "owner-registration-success") {
      if (data.profile) {
        localStorage.setItem(
          "campusshareAuthProfile",
          JSON.stringify(data.profile)
        );
      }

      showToast("Staff registration submitted. Please sign in.");
      navigate("login", {
        email: data.profile?.email || ""
      });
      return;
    }

  
    if (
      data.type === "logout" ||
      data.type === "admin-logout" ||
      data.type === "staff-logout"
    ) {
      try {
        if (window.supabaseClient?.auth) {
          await window.supabaseClient.auth.signOut();
        }
      } catch (error) {
        console.error("CampusShare sign-out error:", error);
      }

      clearPortalSession();
      showToast("You have signed out of CampusShare.");
      navigate("login");
      return;
    }

  
    if (data.type === "staff-unavailable") {
      showToast("Staff Portal is not available. Please check its files.");
    }
  });


  window.addEventListener("hashchange", () => {
    const route = location.hash.slice(1);

    if (routes[route]) {
      navigate(route);
    }
  });

  const initialRoute = location.hash.slice(1);

  if (initialRoute && routes[initialRoute]) {
    navigate(initialRoute);
  } else if (hasAdminSession()) {
    navigate("admin");
  } else if (hasStaffSession()) {
    navigate("staff");
  } else if (hasStudentSession()) {
    navigate("dashboard");
  } else {
    navigate("login");
  }
})();
