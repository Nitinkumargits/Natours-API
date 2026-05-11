require("@babel/polyfill");
var $8UIeK$axios = require("axios");


function $parcel$interopDefault(a) {
  return a && a.__esModule ? a.default : a;
}
/* eslint-disable */ 
/* eslint-disable */ const $4b7fb91bded50cb9$export$4c5dd147b21b9176 = (locations)=>{
    mapboxgl.accessToken = 'pk.eyJ1Ijoibml0aW5rLW1hcGJveCIsImEiOiJjbXAxNGYya3AwMTlwMnBxeWo5cW9ja2U4In0.1-uYjSBnd7GuVKSS1BijhQ';
    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12',
        scrollZoom: false
    });
    const bounds = new mapboxgl.LngLatBounds();
    locations.forEach((loc)=>{
        // Create marker element
        const el = document.createElement('div');
        el.className = 'marker';
        // Add marker
        new mapboxgl.Marker({
            element: el,
            anchor: 'bottom'
        }).setLngLat(loc.coordinates).addTo(map);
        // Add popup
        new mapboxgl.Popup({
            offset: 30
        }).setLngLat(loc.coordinates).setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`).addTo(map);
        // Extend bounds
        bounds.extend(loc.coordinates);
    });
    map.fitBounds(bounds, {
        padding: {
            top: 200,
            bottom: 150,
            left: 100,
            right: 100
        }
    });
};


/* eslint-disable */ 
/* eslint-disable */ const $e4c63cd70c9853e2$export$516836c6a9dfc573 = ()=>{
    const el = document.querySelector('.alert');
    if (el) el.parentElement.removeChild(el);
};
const $e4c63cd70c9853e2$export$de026b00723010c1 = (type, msg, time = 2)=>{
    $e4c63cd70c9853e2$export$516836c6a9dfc573();
    const markup = `<div class="alert alert--${type}">${msg}</div>`;
    document.querySelector('body').insertAdjacentHTML('afterbegin', markup);
    window.setTimeout($e4c63cd70c9853e2$export$516836c6a9dfc573, time * 1000);
};


const $c8d44e472e804981$export$596d806903d1f59e = async (email, password)=>{
    try {
        const res = await (0, ($parcel$interopDefault($8UIeK$axios)))({
            method: 'POST',
            url: '/api/v1/users/login',
            data: {
                email: email,
                password: password
            }
        });
        if (res.data.status === 'success') {
            (0, $e4c63cd70c9853e2$export$de026b00723010c1)('success', 'Logged in successfully!');
            window.setTimeout(()=>{
                location.assign('/');
            }, 1500);
        }
    } catch (err) {
        (0, $e4c63cd70c9853e2$export$de026b00723010c1)('error', err.response.data.message);
    }
};
const $c8d44e472e804981$export$a0973bcfe11b05c9 = async ()=>{
    try {
        const res = await (0, ($parcel$interopDefault($8UIeK$axios)))({
            method: 'GET',
            url: '/api/v1/users/logout'
        });
        res.data.status = 'success';
        location.reload(true);
    } catch (err) {
        console.log(err.response);
        (0, $e4c63cd70c9853e2$export$de026b00723010c1)('error', 'Error logging out! Try again.');
    }
};


/* eslint-disable */ 

const $0643dbd71e4c26d3$export$7200a869094fec36 = async (name, email, password, passwordConfirm)=>{
    try {
        const res = await (0, ($parcel$interopDefault($8UIeK$axios)))({
            method: 'POST',
            url: '/api/v1/users/signup',
            data: {
                name: name,
                email: email,
                password: password,
                passwordConfirm: passwordConfirm
            }
        });
        if (res.data.status === 'success') {
            (0, $e4c63cd70c9853e2$export$de026b00723010c1)('success', 'Account created successfully');
            window.setTimeout(()=>{
                location.assign('/');
            }, 1500);
        }
    } catch (err) {
        (0, $e4c63cd70c9853e2$export$de026b00723010c1)('error', err.response.data.message);
    }
};


/* eslint-disable */ 

const $49dfd691190869e5$export$f558026a994b6051 = async (data, type)=>{
    try {
        const url = type === 'password' ? '/api/v1/users/updateMyPassword' : '/api/v1/users/updateMe';
        const res = await (0, ($parcel$interopDefault($8UIeK$axios)))({
            method: 'PATCH',
            url: url,
            data: data
        });
        if (res.data.status === 'success') {
            (0, $e4c63cd70c9853e2$export$de026b00723010c1)('success', `${type.toUpperCase()} updated successfully!`);
            location.reload();
        }
    } catch (err) {
        (0, $e4c63cd70c9853e2$export$de026b00723010c1)('error', err.response.data.message);
    }
};


/* eslint-disable */ 

const $69d7ae852a37d7ce$export$8d5bdbf26681c0c2 = async (tourId)=>{
    const stripe = Stripe('pk_test_51PZqQ5IxMdURXTfy804fwNYPiXxWqX3f0D8zenRYfUpIzQLm42AES8oYA9KStVh4k1dS7w967AxlRYUNnJQLCx5w00gg5TBMP1');
    try {
        // 1) Get checkout session from API
        const session = await (0, ($parcel$interopDefault($8UIeK$axios)))(`/api/v1/bookings/checkout-session/${tourId}`);
        // 2) Create checkout form + charge credit card
        await stripe.redirectToCheckout({
            sessionId: session.data.session.id
        });
    } catch (err) {
        // console.log(err);
        (0, $e4c63cd70c9853e2$export$de026b00723010c1)('error', err);
    }
};



/* eslint-disable */ 

const $c4156380e69c5625$export$d46d49b9b030aae5 = async (email)=>{
    try {
        const res = await (0, ($parcel$interopDefault($8UIeK$axios)))({
            method: 'POST',
            url: '/api/v1/users/forgotPassword',
            data: {
                email: email
            }
        });
        console.log('response', res);
        if (res.data.status === 'success') (0, $e4c63cd70c9853e2$export$de026b00723010c1)('success', 'Kindly check your Email');
    } catch (err) {
        var _err_response;
        console.log(((_err_response = err.response) === null || _err_response === void 0 ? void 0 : _err_response.data) || err.message);
        (0, $e4c63cd70c9853e2$export$de026b00723010c1)('error', 'Failed to send reset link. Please try again.');
    }
};


/* eslint-disable */ 

const $4c02e7e71faa510a$export$77e41c302ce891cd = async (password, passwordConfirm, token)=>{
    try {
        var _res_data;
        const res = await (0, ($parcel$interopDefault($8UIeK$axios)))({
            method: 'PATCH',
            url: `/api/v1/users/resetPassword/${token}`,
            data: {
                password: password,
                passwordConfirm: passwordConfirm
            }
        });
        if ((res === null || res === void 0 ? void 0 : (_res_data = res.data) === null || _res_data === void 0 ? void 0 : _res_data.status) === 'success') {
            (0, $e4c63cd70c9853e2$export$de026b00723010c1)('success', 'Password reset successfully!');
            setTimeout(()=>{
                location.assign('/login');
            }, 1500);
        }
    } catch (err) {
        var _err_response_data, _err_response;
        console.error('Reset password error:', err);
        // Safe fallback if error has no response
        const message = (err === null || err === void 0 ? void 0 : (_err_response = err.response) === null || _err_response === void 0 ? void 0 : (_err_response_data = _err_response.data) === null || _err_response_data === void 0 ? void 0 : _err_response_data.message) || 'Something went wrong. Try again.';
        (0, $e4c63cd70c9853e2$export$de026b00723010c1)('error', message);
    }
};


// DOM ELEMENTS
const $eaeb59ab6a6fceba$var$mapBox = document.getElementById('map');
const $eaeb59ab6a6fceba$var$loginForm = document.querySelector('.form--login');
const $eaeb59ab6a6fceba$var$forgotForm = document.querySelector('.form--forgot');
const $eaeb59ab6a6fceba$var$resetForm = document.querySelector('.form--reset');
const $eaeb59ab6a6fceba$var$signupForm = document.querySelector('.signup-form');
const $eaeb59ab6a6fceba$var$logOutBtn = document.querySelector('.nav__el--logout');
const $eaeb59ab6a6fceba$var$userDataForm = document.querySelector('.form-user-data');
const $eaeb59ab6a6fceba$var$userPasswordForm = document.querySelector('.form-user-password');
const $eaeb59ab6a6fceba$var$bookBtn = document.getElementById('book-tour');
// DELEGATION
if ($eaeb59ab6a6fceba$var$mapBox) {
    const locations = JSON.parse($eaeb59ab6a6fceba$var$mapBox.dataset.locations);
    (0, $4b7fb91bded50cb9$export$4c5dd147b21b9176)(locations);
}
if ($eaeb59ab6a6fceba$var$loginForm) $eaeb59ab6a6fceba$var$loginForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    (0, $c8d44e472e804981$export$596d806903d1f59e)(email, password);
});
if ($eaeb59ab6a6fceba$var$forgotForm) $eaeb59ab6a6fceba$var$forgotForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = document.getElementById('email_forgotpass').value;
    if (!email) return (0, $e4c63cd70c9853e2$export$de026b00723010c1)('error', 'Please enter your email.');
    await (0, $c4156380e69c5625$export$d46d49b9b030aae5)(email);
});
if ($eaeb59ab6a6fceba$var$resetForm) $eaeb59ab6a6fceba$var$resetForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordConfirm').value;
    const token = document.querySelector('input[name="token"]').value;
    (0, $4c02e7e71faa510a$export$77e41c302ce891cd)(password, passwordConfirm, token);
});
if ($eaeb59ab6a6fceba$var$signupForm) $eaeb59ab6a6fceba$var$signupForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordconfirm').value;
    (0, $0643dbd71e4c26d3$export$7200a869094fec36)(name, email, password, passwordConfirm);
});
if ($eaeb59ab6a6fceba$var$logOutBtn) $eaeb59ab6a6fceba$var$logOutBtn.addEventListener('click', (0, $c8d44e472e804981$export$a0973bcfe11b05c9));
if ($eaeb59ab6a6fceba$var$userDataForm) $eaeb59ab6a6fceba$var$userDataForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    const photoFile = document.getElementById('photo').files[0];
    if (photoFile) form.append('photo', photoFile);
    (0, $49dfd691190869e5$export$f558026a994b6051)(form, 'data');
});
if ($eaeb59ab6a6fceba$var$userPasswordForm) $eaeb59ab6a6fceba$var$userPasswordForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    document.querySelector('.btn--save-password').textContent = 'Updating...';
    const passwordCurrent = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    await (0, $49dfd691190869e5$export$f558026a994b6051)({
        passwordCurrent: passwordCurrent,
        password: password,
        passwordConfirm: passwordConfirm
    }, 'password');
    document.querySelector('.btn--save-password').textContent = 'Save password';
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
});
if ($eaeb59ab6a6fceba$var$bookBtn) $eaeb59ab6a6fceba$var$bookBtn.addEventListener('click', (e)=>{
    e.target.textContent = 'Processing...';
    const { tourId: tourId } = e.target.dataset;
    (0, $69d7ae852a37d7ce$export$8d5bdbf26681c0c2)(tourId);
});
const $eaeb59ab6a6fceba$var$alertMessage = document.querySelector('body').dataset.alert;
if ($eaeb59ab6a6fceba$var$alertMessage) (0, $e4c63cd70c9853e2$export$de026b00723010c1)('success', $eaeb59ab6a6fceba$var$alertMessage, 20);


//# sourceMappingURL=app.js.map
