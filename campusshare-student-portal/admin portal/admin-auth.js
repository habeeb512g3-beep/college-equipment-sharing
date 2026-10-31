
/* Admin-only route guard. Authorization is verified using Supabase. */
(() => {
  "use strict";

  const deny = async () => {
    try {
      await window.supabaseClient?.auth.signOut();
    } catch (_) {}

    document.body.classList.remove("auth-pending");
    window.top.location.replace("../index.html#login");
  };

  const start = async () => {
    try {
      const supabase = window.supabaseClient;

      if (!supabase) return deny();

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session) return deny();

      const user = sessionData.session.user;

      const { data: roleRecord, error: roleError } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (roleError || !roleRecord || roleRecord.role !== "admin") {
        return deny();
      }

      document.body.classList.remove("auth-pending");
      document.body.classList.add("admin-authorized");

      const identity = document.querySelector(".admin-identity strong");

      if (identity) {
        identity.textContent =
          roleRecord.full_name || user.email || "Administrator";
      }

      const logout = document.querySelector("#adminLogoutBtn");

      logout?.addEventListener("click", async () => {
        logout.disabled = true;

        await supabase.auth.signOut();

        localStorage.removeItem("campusshareAuthProfile");
        localStorage.removeItem("campusshareDemoSession");

        window.top.location.replace("../index.html#login");
      });

    } catch (error) {
      console.error("Admin authentication error:", error);
      deny();
    }
  };

  start();
})();
