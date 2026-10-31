"use strict";

const loginForm = document.querySelector("#login-form");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const togglePasswordButton = document.querySelector("#toggle-password");
const emailError = document.querySelector("#email-error");
const passwordError = document.querySelector("#password-error");
const formFeedback = document.querySelector("#form-feedback");

// Account type selector
roleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedRole = button.dataset.role;
    roleButtons.forEach((item) => {
      const isSelected = item === button;
      item.classList.toggle("is-active", isSelected);
      item.setAttribute("aria-pressed", String(isSelected));
    });
    clearFeedback();
  });
});

// Show / hide password
 togglePasswordButton.addEventListener("click", () => {
  const shouldShow = passwordInput.type === "password";
  passwordInput.type = shouldShow ? "text" : "password";
  togglePasswordButton.setAttribute("aria-pressed", String(shouldShow));
  togglePasswordButton.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
});

function clearFeedback() {
  emailError.textContent = "";
  passwordError.textContent = "";
  formFeedback.textContent = "";
  formFeedback.classList.remove("error");
  emailInput.removeAttribute("aria-invalid");
  passwordInput.removeAttribute("aria-invalid");
}

function isValidInstitutionalEmail(value) {
  // This is a basic client-side format check only. Configure approved domains on the server.
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(value.trim());
}

[emailInput, passwordInput].forEach((input) => {
  input.addEventListener("input", () => {
    if (input === emailInput) {
      emailError.textContent = "";
      emailInput.removeAttribute("aria-invalid");
    } else {
      passwordError.textContent = "";
      passwordInput.removeAttribute("aria-invalid");
    }
    formFeedback.textContent = "";
    formFeedback.classList.remove("error");
  });
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFeedback();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !isValidInstitutionalEmail(email)) {
    emailError.textContent = "Enter a valid email address.";
    emailInput.setAttribute("aria-invalid", "true");
    emailInput.focus();
    return;
  }

  if (!password || password.length < 6) {
    passwordError.textContent = "Enter a valid password.";
    passwordInput.setAttribute("aria-invalid", "true");
    passwordInput.focus();
    return;
  }

  if (selectedRole !== "student") {
    formFeedback.textContent = "Staff Portal is being developed separately.";
    return;
  }

  const submitButton = loginForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Signing in...";

  try {
    const { data, error } =
      await window.supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) throw error;

    const user = data.user;
    const metadata = user.user_metadata || {};

    let { data: profile, error: profileError } =
      await window.supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) throw profileError;

    if (!profile) {
      const newProfile = {
        id: user.id,
        full_name: metadata.full_name || email.split("@")[0],
        email: user.email,
        department: metadata.department || null,
        role: "student"
      };

      const result = await window.supabaseClient
        .from("profiles")
        .insert(newProfile)
        .select()
        .single();

      if (result.error) throw result.error;
      profile = result.data;
    }

    if (profile.role !== "student") {
      throw new Error("This account is not registered as a student.");
    }

    formFeedback.textContent = "Login successful! Opening your portal...";

    if (window.parent !== window) {
      window.parent.postMessage({
        source: "campusshare-page",
        type: "login-success",
        profile
      }, "*");
    }

  } catch (error) {
    formFeedback.classList.add("error");
    formFeedback.textContent = error.message || "Login failed.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Sign In";
  }
});

// These actions are placeholders until registration and password-reset services are connected.
document.querySelector("#forgot-password").addEventListener("click", () => {
  formFeedback.classList.remove("error");
  formFeedback.textContent = "Password reset will be available once the university authentication flow is connected.";
});


document.querySelector("#register-link").addEventListener("click", (event) => {
  event.preventDefault();
  if (window.parent !== window) window.parent.postMessage({ source: "campusshare-page", type: "navigate", route: "registration" }, "*");
});

const emailFromRoute = new URLSearchParams(window.location.search).get("email");
if (emailFromRoute) emailInput.value = emailFromRoute;
