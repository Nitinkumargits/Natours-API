/* eslint-disable */
(function () {
  // Field definitions per resource — drives modal forms.
  var SCHEMAS = {
    tours: {
      label: 'tour',
      apiPath: '/api/v1/tours',
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'price', label: 'Price ($)', type: 'number', required: true, min: 0 },
        { name: 'duration', label: 'Duration (days)', type: 'number', required: true, min: 1 },
        { name: 'maxGroupSize', label: 'Max group size', type: 'number', required: true, min: 1 },
        {
          name: 'difficulty',
          label: 'Difficulty',
          type: 'select',
          required: true,
          options: ['easy', 'medium', 'difficult'],
        },
        { name: 'summary', label: 'Summary', type: 'textarea', required: true },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'imageCover', label: 'Cover image filename', type: 'text', placeholder: 'tour-default.jpg' },
      ],
      createDefaults: { imageCover: 'tour-default.jpg' },
    },
    users: {
      label: 'user',
      apiPath: '/api/v1/users',
      // Backend forbids POST /users — no create here.
      canCreate: false,
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        {
          name: 'role',
          label: 'Role',
          type: 'select',
          required: true,
          options: ['user', 'guide', 'lead-guide', 'admin'],
        },
      ],
    },
    reviews: {
      label: 'review',
      apiPath: '/api/v1/reviews',
      // Reviews are created from the tour page, not here.
      canCreate: false,
      fields: [
        { name: 'review', label: 'Review', type: 'textarea', required: true },
        { name: 'rating', label: 'Rating (1-5)', type: 'number', required: true, min: 1, max: 5 },
      ],
    },
    bookings: {
      label: 'booking',
      apiPath: '/api/v1/bookings',
      fields: [
        { name: 'tour', label: 'Tour ID', type: 'text', required: true, createOnly: true },
        { name: 'user', label: 'User ID', type: 'text', required: true, createOnly: true },
        { name: 'price', label: 'Price ($)', type: 'number', required: true, min: 0 },
        { name: 'paid', label: 'Paid', type: 'select', options: ['true', 'false'], boolean: true },
      ],
    },
  };

  function showAlert(type, msg, time) {
    if (!time) time = 5;
    var existing = document.querySelector('.alert');
    if (existing && existing.parentElement) existing.parentElement.removeChild(existing);
    var markup = '<div class="alert alert--' + type + '">' + msg + '</div>';
    document.querySelector('body').insertAdjacentHTML('afterbegin', markup);
    window.setTimeout(function () {
      var el = document.querySelector('.alert');
      if (el && el.parentElement) el.parentElement.removeChild(el);
    }, time * 1000);
  }

  function escapeAttr(v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderField(field, value) {
    var v = value === undefined || value === null ? '' : value;
    var common =
      'id="fld-' + field.name + '" name="' + field.name + '"' +
      (field.required ? ' required' : '') +
      (field.min !== undefined ? ' min="' + field.min + '"' : '') +
      (field.max !== undefined ? ' max="' + field.max + '"' : '') +
      (field.placeholder ? ' placeholder="' + escapeAttr(field.placeholder) + '"' : '');

    if (field.type === 'textarea') {
      return (
        '<label class="admin-form__label" for="fld-' + field.name + '">' + field.label + '</label>' +
        '<textarea class="admin-form__input" rows="3" ' + common + '>' + escapeAttr(v) + '</textarea>'
      );
    }
    if (field.type === 'select') {
      var opts = field.options
        .map(function (o) {
          var sel = String(v) === String(o) ? ' selected' : '';
          return '<option value="' + escapeAttr(o) + '"' + sel + '>' + o + '</option>';
        })
        .join('');
      return (
        '<label class="admin-form__label" for="fld-' + field.name + '">' + field.label + '</label>' +
        '<select class="admin-form__input" ' + common + '>' + opts + '</select>'
      );
    }
    return (
      '<label class="admin-form__label" for="fld-' + field.name + '">' + field.label + '</label>' +
      '<input class="admin-form__input" type="' + field.type + '" value="' + escapeAttr(v) + '" ' + common + ' />'
    );
  }

  // ---- Confirm dialog ----
  var confirmEl = document.getElementById('admin-confirm');
  var confirmTitle = document.getElementById('admin-confirm-title');
  var confirmMsg = document.getElementById('admin-confirm-message');
  var confirmOk = document.getElementById('admin-confirm-ok');
  var confirmResolver = null;

  function openConfirm(opts) {
    if (!confirmEl) return Promise.resolve(window.confirm(opts.message));
    confirmTitle.textContent = opts.title || 'Are you sure?';
    confirmMsg.textContent = opts.message || '';
    confirmOk.textContent = opts.okText || 'Delete';
    confirmEl.classList.remove('hidden');
    confirmEl.setAttribute('aria-hidden', 'false');
    setTimeout(function () { confirmOk.focus(); }, 0);
    return new Promise(function (resolve) {
      confirmResolver = resolve;
    });
  }

  function closeConfirm(result) {
    if (!confirmEl) return;
    confirmEl.classList.add('hidden');
    confirmEl.setAttribute('aria-hidden', 'true');
    if (confirmResolver) {
      var r = confirmResolver;
      confirmResolver = null;
      r(!!result);
    }
  }

  if (confirmOk) {
    confirmOk.addEventListener('click', function () { closeConfirm(true); });
  }

  var state = { resource: null, id: null, mode: 'edit' };

  var modal = document.getElementById('admin-modal');
  var modalTitle = document.getElementById('admin-modal-title');
  var modalBody = document.getElementById('admin-modal-body');
  var modalForm = document.getElementById('admin-modal-form');
  var modalSubmit = document.getElementById('admin-modal-submit');

  function openModal(resource, mode, id, values) {
    if (!modal) return;
    var schema = SCHEMAS[resource];
    if (!schema) return;
    state.resource = resource;
    state.mode = mode;
    state.id = id || null;

    modalTitle.textContent =
      (mode === 'create' ? 'New ' : 'Edit ') + schema.label;
    modalSubmit.textContent = mode === 'create' ? 'Create' : 'Save';

    var defaults = mode === 'create' ? schema.createDefaults || {} : {};
    var data = values || {};

    var html = schema.fields
      .filter(function (f) {
        return mode === 'create' ? true : !f.createOnly;
      })
      .map(function (f) {
        var val = data[f.name];
        if (val === undefined) val = defaults[f.name];
        if (f.boolean && val !== undefined && val !== null) val = String(val);
        return '<div class="admin-form__group">' + renderField(f, val) + '</div>';
      })
      .join('');

    modalBody.innerHTML = html;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    var first = modalBody.querySelector('input, select, textarea');
    if (first) first.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    modalForm.reset();
    state.resource = null;
    state.id = null;
  }

  function collectFormData() {
    var schema = SCHEMAS[state.resource];
    var out = {};
    schema.fields.forEach(function (f) {
      if (state.mode !== 'create' && f.createOnly) return;
      var el = modalForm.querySelector('[name="' + f.name + '"]');
      if (!el) return;
      var v = el.value;
      if (v === '') return; // skip empty
      if (f.type === 'number') v = Number(v);
      if (f.boolean) v = v === 'true';
      out[f.name] = v;
    });
    return out;
  }

  function removeRow(resource, id) {
    var row = document.querySelector(
      'tr[data-id="' + id + '"]'
    );
    if (row && row.parentElement) row.parentElement.removeChild(row);
  }

  // Event delegation
  document.addEventListener('click', function (e) {
    var target = e.target.closest ? e.target.closest('button, a') : null;
    if (!target) return;

    if (target.classList.contains('js-admin-delete')) {
      e.preventDefault();
      var resource = target.dataset.resource;
      var id = target.dataset.id;
      var schema = SCHEMAS[resource];
      if (!schema) return;
      openConfirm({
        title: 'Delete ' + schema.label + '?',
        message:
          'Delete this ' + schema.label + '? This cannot be undone.',
        okText: 'Delete',
      }).then(function (ok) {
        if (!ok) return;
        axios
          .delete(schema.apiPath + '/' + id)
          .then(function () {
            showAlert(
              'success',
              schema.label[0].toUpperCase() +
                schema.label.slice(1) +
                ' deleted.'
            );
            removeRow(resource, id);
          })
          .catch(function (err) {
            var msg =
              (err.response && err.response.data && err.response.data.message) ||
              'Delete failed.';
            showAlert('error', msg);
          });
      });
      return;
    }

    if (target.classList.contains('js-admin-edit')) {
      e.preventDefault();
      var payload = {};
      try {
        payload = target.dataset.payload ? JSON.parse(target.dataset.payload) : {};
      } catch (e2) {
        payload = {};
      }
      openModal(target.dataset.resource, 'edit', target.dataset.id, payload);
      return;
    }

    if (target.classList.contains('js-admin-create')) {
      e.preventDefault();
      var r = target.dataset.resource;
      if (SCHEMAS[r] && SCHEMAS[r].canCreate === false) {
        showAlert('error', 'Creating ' + SCHEMAS[r].label + 's from here is not supported.');
        return;
      }
      openModal(r, 'create', null, null);
      return;
    }

    if (target.classList.contains('js-admin-modal-close')) {
      e.preventDefault();
      closeModal();
      return;
    }

    if (target.classList.contains('js-admin-confirm-cancel')) {
      e.preventDefault();
      closeConfirm(false);
      return;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (confirmEl && !confirmEl.classList.contains('hidden')) {
        closeConfirm(false);
      } else if (modal && !modal.classList.contains('hidden')) {
        closeModal();
      }
    }
  });

  if (modalForm) {
    modalForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!state.resource) return;
      var schema = SCHEMAS[state.resource];
      var body = collectFormData();

      modalSubmit.disabled = true;
      var prev = modalSubmit.textContent;
      modalSubmit.textContent = 'Saving…';

      var req;
      if (state.mode === 'create') {
        req = axios.post(schema.apiPath, body);
      } else {
        req = axios.patch(schema.apiPath + '/' + state.id, body);
      }

      req
        .then(function () {
          showAlert('success', schema.label + ' saved.');
          closeModal();
          window.setTimeout(function () {
            location.reload();
          }, 800);
        })
        .catch(function (err) {
          var msg =
            (err.response && err.response.data && err.response.data.message) ||
            'Save failed.';
          showAlert('error', msg);
          modalSubmit.disabled = false;
          modalSubmit.textContent = prev;
        });
    });
  }
})();
