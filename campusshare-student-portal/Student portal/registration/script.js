
"use strict";



const form = document.getElementById("registration-form");

if (!form) {
  throw new Error("CampusShare: Registration form not found.");
}

const roleButtons = [...document.querySelectorAll(".role-option")];

const roleNote =
  document.getElementById("role-notice") ||
  document.getElementById("role-note");

const submitButton = document.getElementById("submit-button");

const submitLabel = document.getElementById("submit-label");

const formMessage = document.getElementById("form-message");

const fullNameInput = document.getElementById("full-name");
const emailInput = document.getElementById("personal-email");
const departmentInput = document.getElementById("department");
const passwordInput = document.getElementById("password");
const updatesInput = document.getElementById("updates");

const studentFields = document.getElementById("studentFields");
const campusIdInput = document.getElementById("campus-id");
const cohortSelect = document.getElementById("cohort");

const staffFields = document.getElementById("staffFields");
const staffIdInput = document.getElementById("staff-id");
const designationInput = document.getElementById("designation");
const assignedLabInput = document.getElementById("assigned-lab");

const studentConsent = document.getElementById("student-consent");
const studentTerms = document.getElementById("terms");

const staffConsent = document.getElementById("staff-consent");
const staffTerms = document.getElementById("staff-terms");

const strengthBar = document.getElementById("strength-bar");
const strengthText = document.getElementById("strength-text");
const strengthLevel = document.getElementById("strength-level");

let selectedRole = "student";

function setRole(role) {
  if (role !== "student" && role !== "staff") {
    return;
  }

  selectedRole = role;

  const isStudent = role === "student";

  roleButtons.forEach(button => {
    const active = button.dataset.role === role;

    button.classList.toggle("active", active);
    button.classList.toggle("is-active", active);

    button.setAttribute("aria-pressed", String(active));
  });

  if (studentFields) {
    studentFields.hidden = !isStudent;
  }

  if (staffFields) {
    staffFields.hidden = isStudent;
  }
  
  [campusIdInput, cohortSelect].forEach(input => {
    if (!input) return;

    input.disabled = !isStudent;
    input.required = isStudent;
  });

  [staffIdInput, designationInput, assignedLabInput].forEach(input => {
    if (!input) return;

    input.disabled = isStudent;
    input.required = !isStudent && input !== assignedLabInput;
  });
  if (studentConsent) {
    studentConsent.hidden = !isStudent;
  }

  if (staffConsent) {
    staffConsent.hidden = isStudent;
  }

  if (studentTerms) {
    studentTerms.disabled = !isStudent;
    studentTerms.required = isStudent;
  }

  if (staffTerms) {
    staffTerms.disabled = isStudent;
    staffTerms.required = !isStudent;
  }

  if (roleNote) {
    roleNote.textContent = isStudent
      ? "Student account: complete your academic information to request institutional equipment."
      : "Faculty and custodians can request equipment management access after institutional verification and administrator approval.";
  }

  if (submitLabel) {
    submitLabel.textContent = isStudent
      ? "Create Student Account"
      : "Submit Staff Application";
  } else {
    submitButton.innerHTML = `
      ${isStudent ? "Create Student Account" : "Submit Staff Application"}
      <span aria-hidden="true">→</span>
    `;
  }

  clearErrors();
  hideMessage();
}

roleButtons.forEach(button => {
  button.addEventListener("click", () => {
    setRole(button.dataset.role);
  });
});

const errorElements = {
  name: "name-error",
  email: "email-error",
  "campus-id": "campus-id-error",
  cohort: "cohort-error",
  "staff-id": "staff-id-error",
  designation: "designation-error",
  "assigned-lab": "assigned-lab-error",
  department: "department-error",
  password: "password-error",
  terms: "terms-error"
};

const inputElements = {
  name: fullNameInput,
  email: emailInput,
  "campus-id": campusIdInput,
  cohort: cohortSelect,
  "staff-id": staffIdInput,
  designation: designationInput,
  "assigned-lab": assignedLabInput,
  department: departmentInput,
  password: passwordInput,
  terms: null
};

function setFieldError(field, message) {
  const input = inputElements[field];
  const errorElement = document.getElementById(errorElements[field]);

  if (input) {
    input.setAttribute("aria-invalid", String(Boolean(message)));

    const wrapper = input.closest(".input-wrap");

    if (wrapper) {
      wrapper.classList.toggle("invalid", Boolean(message));
    }
  }

  if (field === "terms") {
    const activeTerms = selectedRole === "student"
      ? studentTerms
      : staffTerms;

    if (activeTerms) {
      activeTerms.setAttribute(
        "aria-invalid",
        String(Boolean(message))
      );
    }
  }

  if (errorElement) {
    errorElement.textContent = message;
  }
}

function clearFieldError(field) {
  setFieldError(field, "");
}

function clearErrors() {
  Object.keys(errorElements).forEach(clearFieldError);
}

function showMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.classList.add("visible");
  formMessage.classList.toggle("error-message", isError);
}

function hideMessage() {
  formMessage.textContent = "";
  formMessage.classList.remove("visible", "error-message");
}

const togglePassword = document.getElementById("toggle-password");

if (togglePassword) {
  togglePassword.addEventListener("click", event => {
    const show = passwordInput.type === "password";

    passwordInput.type = show ? "text" : "password";

    event.currentTarget.setAttribute(
      "aria-label",
      show ? "Hide password" : "Show password"
    );

    event.currentTarget.setAttribute(
      "aria-pressed",
      String(show)
    );
  });
}

function getPasswordStrength(value) {
  if (!value) {
    return {
      score: 0,
      label: "—",
      hint: "Use 12 or more characters"
    };
  }

  let score = 0;

  if (value.length >= 8) score++;
  if (value.length >= 12) score++;

  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) {
    score++;
  }

  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;

  if (score <= 2) {
    return {
      score,
      label: "WEAK",
      hint: "Add length, numbers or symbols"
    };
  }

  if (score <= 3) {
    return {
      score,
      label: "GOOD",
      hint: "A little more complexity helps"
    };
  }

  return {
    score,
    label: "STRONG",
    hint: "Good password strength"
  };
}

passwordInput.addEventListener("input", () => {
  const result = getPasswordStrength(passwordInput.value);

  strengthBar.style.width =
    `${Math.min(result.score / 5, 1) * 100}%`;

  strengthBar.style.background =
    result.score <= 2
      ? "#d99a43"
      : result.score <= 3
        ? "#2778d8"
        : "#0b9874";

  strengthText.textContent = result.hint;
  strengthLevel.textContent = result.label;

  clearFieldError("password");
});

form.addEventListener("input", event => {
  const fieldMap = {
    "full-name": "name",
    "personal-email": "email",
    "campus-id": "campus-id",
    cohort: "cohort",
    "staff-id": "staff-id",
    designation: "designation",
    "assigned-lab": "assigned-lab",
    department: "department",
    password: "password"
  };

  const field = fieldMap[event.target.id];

  if (field) {
    clearFieldError(field);
  }

  hideMessage();
});

[studentTerms, staffTerms].forEach(checkbox => {
  if (!checkbox) return;

  checkbox.addEventListener("change", () => {
    clearFieldError("terms");
  });
});

function validateForm() {
  clearErrors();

  let valid = true;

  const fullName = fullNameInput.value.trim();
  const email = emailInput.value.trim();
  const department = departmentInput.value;
  const password = passwordInput.value;

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (fullName.length < 2) {
    setFieldError("name", "Enter your full name.");
    valid = false;
  }

  if (!emailPattern.test(email)) {
    setFieldError("email", "Enter a valid institutional email address.");
    valid = false;
  }

  if (!department) {
    setFieldError("department", "Please select your department.");
    valid = false;
  }

  if (password.length < 12) {
    setFieldError(
      "password",
      "Your security keyphrase must be at least 12 characters."
    );
    valid = false;
  }

  if (selectedRole === "student") {
    if (!campusIdInput.value.trim()) {
      setFieldError("campus-id", "Enter your Student ID / NetID.");
      valid = false;
    }

    if (!cohortSelect.value) {
      setFieldError("cohort", "Please select your academic year.");
      valid = false;
    }

    if (!studentTerms || !studentTerms.checked) {
      setFieldError(
        "terms",
        "Please accept the campus asset custody guidelines."
      );
      valid = false;
    }
  } else {
    if (!staffIdInput.value.trim()) {
      setFieldError("staff-id", "Enter your Staff / Employee ID.");
      valid = false;
    }

    if (!designationInput.value) {
      setFieldError("designation", "Please select your designation.");
      valid = false;
    }

    if (!staffTerms || !staffTerms.checked) {
      setFieldError(
        "terms",
        "Please accept the staff custody and safety declaration."
      );
      valid = false;
    }
  }

  return valid;
}

function buildProfile() {
  const isStudent = selectedRole === "student";

  return {
    fullName: fullNameInput.value.trim(),
    email: emailInput.value.trim().toLowerCase(),

    role: isStudent ? "student" : "owner_applicant",

    campusId: isStudent
      ? campusIdInput.value.trim()
      : null,

    cohort: isStudent
      ? cohortSelect.value
      : null,

    staffId: isStudent
      ? null
      : staffIdInput.value.trim(),

    designation: isStudent
      ? null
      : designationInput.value,

    assignedLab: isStudent
      ? null
      : assignedLabInput.value.trim(),

    department: departmentInput.value,

    dispatchAlerts: updatesInput.checked,

    applicationStatus: isStudent
      ? "active"
      : "pending"
  };
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  hideMessage();

  if (!validateForm()) {
    showMessage(
      "Please review the highlighted fields and complete the required information.",
      true
    );

    const firstInvalid = form.querySelector(
      ".input-wrap.invalid input:not(:disabled), " +
      ".input-wrap.invalid select:not(:disabled), " +
      'input[aria-invalid="true"]'
    );

    firstInvalid?.focus();
    return;
  }

  const profile = buildProfile();
  const isStudent = selectedRole === "student";

  if (!window.supabaseClient?.auth) {
    showMessage(
      "Authentication service is not configured. Check your Supabase setup and reload.",
      true
    );
    return;
  }

  submitButton.disabled = true;

  if (submitLabel) {
    submitLabel.textContent = "Creating secure account...";
  } else {
    submitButton.textContent = "Creating secure account...";
  }

  try {
    const metadata = {
      full_name: profile.fullName,
      department: profile.department,
      dispatch_alerts: profile.dispatchAlerts,
      account_type: isStudent ? "student" : "owner_applicant",

      requested_role: isStudent ? "student" : "owner",

      application_status: isStudent ? "active" : "pending"
    };

    if (isStudent) {
      metadata.campus_id = profile.campusId;
      metadata.cohort = profile.cohort;
    } else {
      metadata.staff_id = profile.staffId;
      metadata.designation = profile.designation;
      metadata.assigned_lab = profile.assignedLab;
    }

    const { data: signupData, error } =
      await window.supabaseClient.auth.signUp({
        email: profile.email,
        password: passwordInput.value,

        options: {
          data: metadata
        }
      });

    if (error) {
      throw error;
    }

    if (!signupData?.user) {
      throw new Error(
        "Account creation could not be confirmed. Please try again."
      );
    }
    const storageKey = isStudent
      ? "campusshareDemoProfile"
      : "campusshareAuthProfile";

    localStorage.setItem(
      storageKey,
      JSON.stringify(profile)
    );

    if (isStudent) {
      showMessage(
        signupData.session
          ? "Student account created successfully. Please sign in."
          : "Student account created. Check your email for confirmation, then sign in."
      );
    } else {
      showMessage(
        signupData.session
          ? "Staff application submitted. Your account requires Admin approval before Staff Portal access."
          : "Staff application submitted. Confirm your email and wait for Admin approval before accessing the Staff Portal."
      );
    }

  
    const message = {
      source: "campusshare-page",

      type: isStudent
        ? "registration-success"
        : "owner-registration-success",

      profile
    };

    if (window.parent !== window) {
      window.parent.postMessage(message, "*");
    } else {
      // Direct-page fallback: return to sibling login page.
      window.location.href =
        `../login/index.html?email=${encodeURIComponent(profile.email)}`;
    }

  } catch (error) {
    console.error("CampusShare registration error:", error);

    showMessage(
      error.message || "Account creation failed. Please try again.",
      true
    );

  } finally {
    submitButton.disabled = false;

    if (submitLabel) {
      submitLabel.textContent = isStudent
        ? "Create Student Account"
        : "Submit Staff Application";
    } else {
      submitButton.innerHTML = `
        ${isStudent ? "Create Student Account" : "Submit Staff Application"}
        <span aria-hidden="true">→</span>
      `;
    }
  }
});

const signinLink = document.getElementById("signin-link");

if (signinLink) {
  signinLink.addEventListener("click", event => {
    event.preventDefault();

    if (window.parent !== window) {
      window.parent.postMessage(
        {
          source: "campusshare-page",
          type: "navigate",
          route: "login"
        },
        "*"
      );
    } else {
      window.location.href = "../login/index.html";
    }
  });
}

setRole("student");
