"use strict";

const loginForm = document.querySelector("#login-form");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const togglePasswordButton = document.querySelector("#toggle-password");
const emailError = document.querySelector("#email-error");
const passwordError = document.querySelector("#password-error");
const formFeedback = document.querySelector("#form-feedback");

function clearFeedback() {
  emailError.textContent = "";
  passwordError.textContent = "";
  formFeedback.textContent = "";
  formFeedback.classList.remove("error");
  emailInput.removeAttribute("aria-invalid");
  passwordInput.removeAttribute("aria-invalid");
}
function showError(message) {
  formFeedback.classList.add("error");
  formFeedback.textContent = message;
}
function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }

togglePasswordButton.addEventListener("click", () => {
  const show = passwordInput.type === "password";
  passwordInput.type = show ? "text" : "password";
  togglePasswordButton.setAttribute("aria-pressed", String(show));
  togglePasswordButton.setAttribute("aria-label", show ? "Hide password" : "Show password");
});

[emailInput, passwordInput].forEach(input => input.addEventListener("input", () => {
  clearFeedback();
  input.removeAttribute("aria-invalid");
  if (input === emailInput) emailError.textContent = "";
  else passwordError.textContent = "";
}));

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  clearFeedback();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!validEmail(email)) {
    emailError.textContent = "Enter a valid institutional email address.";
    emailInput.setAttribute("aria-invalid", "true"); emailInput.focus(); return;
  }
  if (!password) {
    passwordError.textContent = "Please enter your password.";
    passwordInput.setAttribute("aria-invalid", "true"); passwordInput.focus(); return;
  }
  const submit = loginForm.querySelector('[type="submit"]');
  submit.disabled = true;
  formFeedback.textContent = "Verifying your account…";
  try {
    if (!window.supabaseClient) throw new Error("Authentication service is not configured. Reload and try again.");
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const user = data.user;
    const { data: roleRecord, error: roleError } = await window.supabaseClient
      .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    if (roleError) throw new Error("Your account role could not be verified. Contact the campus administrator.");
    const role = roleRecord?.role;
    const profile = {
      fullName: user.user_metadata?.full_name || user.user_metadata?.name || email.split("@")[0],
      email
    };
    localStorage.setItem("campusshareAuthProfile", JSON.stringify(profile));
    localStorage.removeItem("campusshareDemoSession");
    if (role === "admin") {
      formFeedback.textContent = "Administrator verified. Opening Admin Portal…";
      if (window.parent !== window) window.parent.postMessage({ source: "campusshare-page", type: "admin-login-success" }, "*");
      else window.location.href = "../../admin%20portal/index.html";
      return;
    }
    if (role !== "student") {
      await window.supabaseClient.auth.signOut();
      throw new Error("This account does not have student or administrator access.");
    }
    localStorage.setItem("campusshareDemoSession", "student-demo");
    localStorage.setItem("campusshareDemoProfile", JSON.stringify(profile));
    formFeedback.textContent = "Sign-in successful. Opening your Student Portal…";
    if (window.parent !== window) window.parent.postMessage({ source: "campusshare-page", type: "login-success", profile }, "*");
  } catch (error) {
    try { await window.supabaseClient?.auth.signOut(); } catch (_) {}
    showError(error.message || "Unable to sign in. Check your credentials and try again.");
  } finally { submit.disabled = false; }
});

document.querySelector("#forgot-password").addEventListener("click", async () => {
  clearFeedback();
  const email = emailInput.value.trim();
  if (!validEmail(email)) { showError("Enter your email address first to request a password reset."); emailInput.focus(); return; }
  try {
    const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${window.location.pathname}`
    });
    if (error) throw error;
    formFeedback.textContent = "If the account exists, a password reset email has been sent.";
  } catch (error) { showError(error.message || "Password reset could not be started."); }
});

document.querySelector("#register-link").addEventListener("click", event => {
  event.preventDefault();
  if (window.parent !== window){ window.parent.postMessage({ source: "campusshare-page", type: "navigate", route: "registration" }, "*");}
 // else{ window.location.href='../../registration/index.html';}
                                                            
});
const emailFromRoute = new URLSearchParams(window.location.search).get("email");
if (emailFromRoute) emailInput.value = emailFromRoute;
