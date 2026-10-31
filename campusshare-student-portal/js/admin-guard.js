(async function () {
  const supabase = window.supabaseClient;

  if (!supabase) {
    window.location.href = "../index.html#login";
    return;
  }

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    window.location.href = "../index.html#login";
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "admin") {
    await supabase.auth.signOut();
    window.location.href = "../index.html#login";
    return;
  }

  console.log("CampusShare Admin verified.");
})();
