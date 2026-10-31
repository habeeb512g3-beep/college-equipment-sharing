const form = document.getElementById('registration-form');
const roleButtons = [...document.querySelectorAll('.role-option')];
const roleNote = document.getElementById('role-note');
const submitButton = document.getElementById('submit-button');
const campusIdLabel = document.getElementById('campus-id-label');
const campusIdInput = document.getElementById('campus-id');
const cohortLabel = document.getElementById('cohort-label');
const cohortSelect = document.getElementById('cohort');
const passwordInput = document.getElementById('password');
const strengthBar = document.getElementById('strength-bar');
const strengthText = document.getElementById('strength-text');
const strengthLevel = document.getElementById('strength-level');
const formMessage = document.getElementById('form-message');
let selectedRole = 'student';

const cohortOptions = {
  student: [
    ['UG - 1st Year ', 'UG - 1st Year '],
    ['UG - 2nd Year ', 'UG - 2nd Year '],
    ['UG - 3rd Year ', 'UG - 3rd Year '],
    ['UG - 4th Year ', 'UG - 4th Year '],
    ['Postgraduate', 'Postgraduate']
  ],
  staff: [
    ['Faculty', 'Faculty'],
    ['Lab Manager', 'Lab Manager'],
    ['Lab Technician', 'Lab Technician'],
    ['Research Staff', 'Research Staff'],
    ['Administrative Staff', 'Administrative Staff']
  ]
};

function setRole(role) {
  selectedRole = role;
  roleButtons.forEach((button) => {
    const isActive = button.dataset.role === role;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  const isStudent = role === 'student';
  roleNote.textContent = isStudent
    ? 'Instant Tier 1 Standard gear clearance upon .edu confirmation.'
    : 'Faculty and custodians can request inventory management access after institutional verification.';
  campusIdLabel.textContent = isStudent ? 'StudentID / NetID' : 'Employee / Staff ID';
  campusIdInput.placeholder = isStudent ? 'CS-2024-8841' : 'EMP-2024-102';
  cohortLabel.textContent = isStudent ? 'Cohort / Year' : 'Campus Role';
  cohortSelect.innerHTML = '<option value="">Select ' + (isStudent ? 'year' : 'role') + '</option>';
  cohortOptions[role].forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    cohortSelect.appendChild(option);
  });
  submitButton.innerHTML = `Create ${isStudent ? 'Student' : 'Faculty / Custodian'} Account <span aria-hidden="true">→</span>`;
  clearErrors();
  hideMessage();
}

roleButtons.forEach((button) => button.addEventListener('click', () => setRole(button.dataset.role)));

document.getElementById('toggle-password').addEventListener('click', (event) => {
  const button = event.currentTarget;
  const show = passwordInput.type === 'password';
  passwordInput.type = show ? 'text' : 'password';
  button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  button.setAttribute('aria-pressed', String(show));
});

function getPasswordStrength(value) {
  if (!value) return { score: 0, label: '—', hint: 'Use 12 or more characters' };
  let score = 0;
  if (value.length >=8) score++;
  if (value.length >=12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  if (score <= 2) return { score, label: 'WEAK', hint: 'Add length, numbers or symbols' };
  if (score <= 3) return { score, label: 'GOOD', hint: 'A little more complexity helps' };
  return { score, label: 'STRONG', hint: 'Good password strength' };
}

passwordInput.addEventListener('input', () => {
  const result = getPasswordStrength(passwordInput.value);
  strengthBar.style.width = `${Math.min(result.score / 5, 1) * 100}%`;
  strengthBar.style.background = result.score <= 2 ? '#d99a43' : result.score <= 3 ? '#2778d8' : '#0b9874';
  strengthText.textContent = result.hint;
  strengthLevel.textContent = result.label;
  clearFieldError('password');
});

function setFieldError(field, message) {
  const inputIds = {
    name: 'full-name',
    email: 'personal-email',
    'campus-id': 'campus-id',
    cohort: 'cohort',
    department: 'department',
    password: 'password',
    terms: 'terms'
  };
  const input = document.getElementById(inputIds[field]);
  const error = document.getElementById(`${field}-error`);
  const wrapper = input?.closest('.input-wrap');
  if (wrapper) wrapper.classList.toggle('invalid', Boolean(message));
  if (input && field === 'terms') input.setAttribute('aria-invalid', String(Boolean(message)));
  if (input && field !== 'terms') input.setAttribute('aria-invalid', String(Boolean(message)));
  if (error) error.textContent = message;
}

function clearFieldError(field) {
  setFieldError(field, '');
}

function clearErrors() {
  ['name', 'email', 'campus-id', 'cohort', 'department', 'password', 'terms'].forEach(clearFieldError);
}

function showMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.classList.add('visible');
  formMessage.classList.toggle('error-message', isError);
}

function hideMessage() {
  formMessage.classList.remove('visible', 'error-message');
  formMessage.textContent = '';
}

form.addEventListener('input', (event) => {
  const fieldMap = {
    'full-name': 'name',
    'personal-email': 'email',
    'campus-id': 'campus-id',
    cohort: 'cohort',
    department: 'department',
    password: 'password'
  };
  const field = fieldMap[event.target.id];
  if (field) clearFieldError(field);
  hideMessage();
});

document.getElementById('terms').addEventListener('change', () => clearFieldError('terms'));

function validateForm() {
  clearErrors();
  let valid = true;
  const fullName = document.getElementById('full-name').value.trim();
  const email = document.getElementById('personal-email').value.trim();
  const campusId = campusIdInput.value.trim();
  const cohort = cohortSelect.value;
  const department = document.getElementById('department').value;
  const password = passwordInput.value;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (fullName.length < 2) { setFieldError('name', 'Enter your full name.'); valid = false; }
  if (!emailPattern.test(email)) { setFieldError('email', 'Enter a valid personal email address.'); valid = false; }
  if (!campusId) { setFieldError('campus-id', 'This field is required.'); valid = false; }
  if (!cohort) { setFieldError('cohort', 'Please select an option.'); valid = false; }
  if (!department) { setFieldError('department', 'Please select your department.'); valid = false; }
  if (password.length < 12) { setFieldError('password', 'Your security keyphrase must be at least 12 characters.'); valid = false; }
  if (!document.getElementById('terms').checked) { setFieldError('terms', 'Please accept the campus asset custody guidelines to continue.'); valid = false; }
  return valid;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideMessage();
  if (!validateForm()) {
    showMessage('Please review the highlighted fields and complete the required information.', true);
    const firstInvalid = form.querySelector('.input-wrap.invalid input, .input-wrap.invalid select, #terms:not(:checked)');
    firstInvalid?.focus();
    return;
  }

  const data = {
    role: selectedRole,
    fullName: document.getElementById('full-name').value.trim(),
    email: document.getElementById('personal-email').value.trim(),
    campusId: campusIdInput.value.trim(),
    cohort: cohortSelect.value,
    department: document.getElementById('department').value,
    dispatchAlerts: document.getElementById('updates').checked
  };
  // Admin privileges are never granted through public registration.
  if (selectedRole !== 'student') {
    showMessage('Faculty / Custodian registration will be enabled when the Staff Portal is added. You can create a Student account in this release.', true);
    return;
  }
  try {
    if (!window.supabaseClient) throw new Error('Authentication service is not configured. Reload and try again.');
    submitButton.disabled = true;
    submitButton.textContent = 'Creating secure account…';
    const { data: signupData, error } = await window.supabaseClient.auth.signUp({
      email: data.email, password: passwordInput.value,
      options: { data: { full_name: data.fullName, campus_id: data.campusId, cohort: data.cohort, department: data.department, account_type: 'student' } }
    });
    if (error) throw error;
    localStorage.setItem('campusshareAuthProfile', JSON.stringify(data));
    showMessage(signupData.session ? 'Your account is ready. Please sign in to continue.' : 'Account created. Check your institutional email to confirm it, then sign in.', false);
    if (window.parent !== window) window.parent.postMessage({ source: 'campusshare-page', type: 'registration-success', profile: data }, '*');
  } catch (error) {
    showMessage(error.message || 'Account creation failed. Please try again.', true);
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = `Create ${selectedRole === 'student' ? 'Student' : 'Faculty / Custodian'} Account <span aria-hidden="true">→</span>`;
  }
});

document.getElementById('signin-link').addEventListener('click', (event) => {
  event.preventDefault();
  if (window.parent !== window) window.parent.postMessage({ source: 'campusshare-page', type: 'navigate', route: 'login' }, '*');
});
