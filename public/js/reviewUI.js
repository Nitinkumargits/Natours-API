/* eslint-disable */
(function () {
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

  function init() {
    var toggleBtn = document.getElementById('toggle-review-form');
    var formContainer = document.getElementById('review-form-container');
    var reviewForm = document.getElementById('review-form');
    var ratingWidget = document.getElementById('review-rating');

    if (toggleBtn && formContainer) {
      toggleBtn.addEventListener('click', function () {
        var isHidden = formContainer.classList.toggle('hidden');
        var label = toggleBtn.querySelector('.btn-write-review__label');
        if (label) label.textContent = isHidden ? 'Write a Review' : 'Cancel';
        if (!isHidden) {
          formContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }

    if (ratingWidget) {
      var stars = ratingWidget.querySelectorAll('.review-form__star');
      var paint = function (value) {
        stars.forEach(function (s) {
          var v = Number(s.dataset.value);
          s.classList.toggle('review-form__star--active', v <= value);
        });
      };
      stars.forEach(function (star) {
        star.addEventListener('mouseenter', function () {
          paint(Number(star.dataset.value));
        });
        star.addEventListener('click', function () {
          ratingWidget.dataset.rating = star.dataset.value;
          paint(Number(star.dataset.value));
        });
      });
      ratingWidget.addEventListener('mouseleave', function () {
        paint(Number(ratingWidget.dataset.rating));
      });
    }

    if (reviewForm) {
      reviewForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var tourId = reviewForm.dataset.tourId;
        var reviewText = document.getElementById('review-text').value;
        var rating = Number(ratingWidget && ratingWidget.dataset.rating);
        if (!rating) {
          showAlert('error', 'Please select a rating.');
          return;
        }
        fetch('/api/v1/tours/' + tourId + '/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ review: reviewText, rating: rating }),
        })
          .then(function (res) {
            return res.json().then(function (data) {
              return { ok: res.ok, data: data };
            });
          })
          .then(function (result) {
            if (result.ok && result.data.status === 'success') {
              showAlert('success', 'Review submitted successfully!');
              window.setTimeout(function () {
                location.reload();
              }, 1500);
            } else {
              showAlert('error', (result.data && result.data.message) || 'Could not submit review.');
            }
          })
          .catch(function () {
            showAlert('error', 'Network error. Please try again.');
          });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
