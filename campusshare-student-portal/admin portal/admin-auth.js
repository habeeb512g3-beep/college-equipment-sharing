/* Admin-only route guard. Authorization is read from Supabase, never from browser storage. */
(() => {
  "use strict";
  const deny = async () => {
    try { await window.supabaseClient?.auth.signOut(); } catch (_) {}
    window.top.location.replace("../index.html#login");
  };
  const start = async () => {
    try {
      if (!window.supabaseClient) return deny();
      const { data: sessionData, error: sessionError } = await window.supabaseClient.auth.getSession();
      if (sessionError || !sessionData.session) return deny();
      const { data: roleRecord, error: roleError } = await window.supabaseClient
        .from("user_roles").select("role").eq("user_id", sessionData.session.user.id).maybeSingle();
      if (roleError || roleRecord?.role !== "admin") return deny();
      document.body.classList.remove("auth-pending");
      document.body.classList.add("admin-authorized");
      const identity = document.querySelector(".admin-identity strong");
      if (identity) identity.textContent = sessionData.session.user.user_metadata?.full_name || sessionData.session.user.email || "Administrator";
      const logout = document.querySelector("#adminLogoutBtn");
      logout?.addEventListener("click", async () => {
        logout.disabled = true;
        await window.supabaseClient.auth.signOut();
        localStorage.removeItem("campusshareAuthProfile");
        window.top.location.replace("../index.html#login");
      });
    } catch (_) { deny(); }
  };
  start();
})();
