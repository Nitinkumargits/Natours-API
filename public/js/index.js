/* eslint-disable */
import '@babel/polyfill';
import { displayMap } from './mapbox';
import { login, logout } from './login';
import { updateSettings } from './updateSettings';

// DOM ELEMENTS
const mapBox = document.getElementById('map');
const loginForm = document.querySelector('.form');
const logOutBtn = document.querySelector('.nav__el--logout');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const signupForm = document.querySelector('.signup-form');

// DELEGATION
if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

// SIGNUP NEWUSER USING AXION(API) //////////////////////////////////////////////////////////////////////
if (signupForm) {
  signupForm.addEventListener('submit', async e => {
    e.preventDefault();

    // Change button text while Signing up a new user
    document.querySelector('.btn--signup').innerText = 'Signing...';

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordconfirm').value;
    await signup(name, email, password, passwordConfirm);

    // Change button text and clear input-fields after Signing up new user
    document.querySelector('.btn--signup').innerText = 'Signup';
    signupForm.reset();
  });
}

if (loginForm) {
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();

    // Change button text while login
    document.querySelector('.btn--login').innerText = 'Logging...';

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    await login(email, password);

    // Change button text after login
    document.querySelector('.btn--login').innerText = 'Login';
  });
}

if (logOutBtn) logOutBtn.addEventListener('click', logout);

if (userDataForm)
  userDataForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    updateSettings({ name, email }, 'data');
  });

if (userPasswordForm)
  userPasswordForm.addEventListener('submit', async e => {
    e.preventDefault();
    document.querySelector('.btn--save-password').textContent = 'Updating...';

    const passwordCurrent = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    await updateSettings(
      { passwordCurrent, password, passwordConfirm },
      'password'
    );

    document.querySelector('.btn--save-password').textContent = 'Save password';
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });
