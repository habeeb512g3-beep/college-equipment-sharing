
"use strict";

(() => {
  const loginForm = document.querySelector("#login-form");
  const emailInput = document.querySelector("#email");
  const passwordInput = document.querySelector("#password");
  const togglePasswordButton = document.querySelector("#toggle-password");
  const emailError = document.querySelector("#email-error");
  const passwordError = document.querySelector("#password-error");
  const formFeedback = document.querySelector("#form-feedback");
  const forgotPasswordButton = document.querySelector("#forgot-password");
  const registerLink = document.querySelector("#register-link");

  const requiredElements = {
    loginForm,
    emailInput,
    passwordInput,
    emailError,
    passwordError,
    formFeedback
  };

  const missingElements = Object.entries(requiredElements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missingElements.length) {
    console.error(
      "CampusShare login: missing HTML elements:",
      missingElements.join(", ")
    );
    return;
  }

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

  function showMessage(message) {
    formFeedback.classList.remove("error");
    formFeedback.textContent = message;
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function sendPortalMessage(type, profile, extra = {}) {
    if (window.parent === window) return false;

    const message = {
      source: "campusshare-page",
      type,
      ...extra
    };

    if (profile) message.profile = profile;

    window.parent.postMessage(message, window.location.origin);
    return true;
  }

  async function signOutQuietly() {
    try {
      if (window.supabaseClient?.auth) {
        await window.supabaseClient.auth.signOut();
      }
    } catch (error) {
      console.warn("CampusShare sign-out cleanup failed:", error);
    }
  }
  if (togglePasswordButton) {
    togglePasswordButton.addEventListener("click", () => {
      const show = passwordInput.type === "password";

      passwordInput.type = show ? "text" : "password";

      togglePasswordButton.setAttribute(
        "aria-pressed",
        String(show)
      );

      togglePasswordButton.setAttribute(
        "aria-label",
        show ? "Hide password" : "Show password"
      );
    });
  }
  [emailInput, passwordInput].forEach(input => {
    input.addEventListener("input", () => {
      clearFeedback();
      input.removeAttribute("aria-invalid");

      if (input === emailInput) emailError.textContent = "";
      if (input === passwordInput) passwordError.textContent = "";
    });
  });
  loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    clearFeedback();

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (!validEmail(email)) {
      emailError.textContent =
        "Enter a valid institutional email address.";

      emailInput.setAttribute("aria-invalid", "true");
      emailInput.focus();
      return;
    }

    if (!password) {
      passwordError.textContent = "Please enter your password.";

      passwordInput.setAttribute("aria-invalid", "true");
      passwordInput.focus();
      return;
    }

    const submitButton = loginForm.querySelector('[type="submit"]');

    if (submitButton) submitButton.disabled = true;

    showMessage("Verifying your account…");

    try {
      const client = window.supabaseClient;

      if (!client?.auth) {
        throw new Error(
          "Authentication service is not configured. Check js/supabase.js and reload."
        );
      }

  
      const { data: authData, error: authError } =
        await client.auth.signInWithPassword({
          email,
          password
        });

      if (authError) throw authError;

      const user = authData?.user;

      if (!user?.id) {
        throw new Error("Supabase did not return a valid user account.");
      }
      const { data: roleRecord, error: roleError } = await client
        .from("profiles")
        .select("id, role, full_name, email, department")
        .eq("id", user.id)
        .maybeSingle();

      if (roleError) {
  console.error("CampusShare profile lookup failed:", {
    message: roleError.message,
    code: roleError.code,
    details: roleError.details,
    hint: roleError.hint
  });

  throw new Error(
    `Profile lookup failed: ${roleError.message} (code: ${roleError.code || "unknown"})`
  );
}
      if (!roleRecord) {
        throw new Error(
          "Your account exists, but its CampusShare profile is missing. Ask the administrator to create or repair your profiles record, then sign in again."
        );
      }

      const role = String(roleRecord.role || "")
        .trim()
        .toLowerCase();

      const profile = {
        id: user.id,
        fullName:
          roleRecord.full_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.fullName ||
          email.split("@")[0],
        email: roleRecord.email || user.email || email,
        department: roleRecord.department || "",
        role
      };
      localStorage.removeItem("campusshareDemoSession");
      localStorage.removeItem("campusshareDemoProfile");

      localStorage.setItem(
        "campusshareAuthProfile",
        JSON.stringify(profile)
      );
      if (role === "admin") {
        showMessage("Administrator verified. Opening Admin Portal…");

        if (!sendPortalMessage("admin-login-success", profile)) {
          window.location.href = "../../admin%20portal/index.html";
        }

        return;
      }
      if (role === "owner") {
        showMessage("Equipment Owner verified. Opening Staff Portal…");

        if (!sendPortalMessage("owner-login-success", profile)) {
          window.location.href =
            "../../staff%20portal/dashboard.html";
        }

        return;
      }
      if (role === "student") {
        localStorage.setItem(
          "campusshareDemoSession",
          "student-demo"
        );

        localStorage.setItem(
          "campusshareDemoProfile",
          JSON.stringify(profile)
        );

        showMessage(
          "Sign-in successful. Opening your Student Portal…"
        );

        if (!sendPortalMessage("login-success", profile)) {
          window.location.href = "../../index.html#dashboard";
        }

        return;
      }
      await signOutQuietly();

      localStorage.removeItem("campusshareAuthProfile");

      if (role === "owner_applicant" || role === "pending") {
        throw new Error(
          "Your staff application is awaiting administrator approval. Staff Portal access is not active yet."
        );
      }

      throw new Error(
        "Your account has no recognized CampusShare role. Contact the campus administrator."
      );

    } catch (error) {
      await signOutQuietly();

      localStorage.removeItem("campusshareAuthProfile");
      localStorage.removeItem("campusshareDemoSession");
      localStorage.removeItem("campusshareDemoProfile");

      console.error("CampusShare login error:", error);

      showError(
        error?.message ||
        "Unable to sign in. Check your credentials and try again."
      );

    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
  if (forgotPasswordButton) {
    forgotPasswordButton.addEventListener("click", async () => {
      clearFeedback();

      const email = emailInput.value.trim().toLowerCase();

      if (!validEmail(email)) {
        showError(
          "Enter your email address first to request a password reset."
        );

        emailInput.focus();
        return;
      }

      try {
        const client = window.supabaseClient;

        if (!client?.auth) {
          throw new Error("Authentication service is not configured.");
        }

        const { error } =
          await client.auth.resetPasswordForEmail(email, {
            redirectTo:
              `${window.location.origin}${window.location.pathname}`
          });

        if (error) throw error;

        showMessage(
          "If the account exists, a password reset email has been sent."
        );

      } catch (error) {
        console.error("CampusShare password reset error:", error);

        showError(
          error?.message || "Password reset could not be started."
        );
      }
    });
  }


  if (registerLink) {
    registerLink.addEventListener("click", event => {
      event.preventDefault();

      if (
        !sendPortalMessage("navigate", null, {
          route: "registration"
        })
      ) {
        window.location.href = "../registration/index.html";
      }
    });
  }

  
  const emailFromRoute =
    new URLSearchParams(window.location.search).get("email");

  if (emailFromRoute) {
    emailInput.value = emailFromRoute;
  }

})();
