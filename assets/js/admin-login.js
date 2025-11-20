(function () {
  // Wait for DOM and adminAuth to be ready
  const initLoginHandler = () => {
    const form = document.getElementById('loginForm');
    if (!form) {
      console.warn('Login form not found, retrying...');
      setTimeout(initLoginHandler, 100);
      return;
    }

    if (!window.adminAuth) {
      console.warn('adminAuth not available, retrying...');
      setTimeout(initLoginHandler, 100);
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('.btn-primary');
    const errorBanner = document.getElementById('loginErrorMessage');

    const setSubmitting = (state) => {
      if (!submitBtn) return;
      submitBtn.disabled = state;
      const spinner = submitBtn.querySelector('.spinner-border');
      if (spinner) {
        spinner.classList.toggle('d-none', !state);
      } else {
        submitBtn.innerHTML = state
          ? '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...'
          : 'Login';
      }
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (errorBanner) errorBanner.classList.add('d-none');

      const email = form.querySelector('#username')?.value?.trim();
      const password = form.querySelector('#password')?.value;

      if (!email || !password) {
        if (errorBanner) {
          errorBanner.textContent = 'Please provide both email and password.';
          errorBanner.classList.remove('d-none');
        }
        return;
      }

      setSubmitting(true);

      try {
        console.log('Attempting login with:', { email, apiBaseUrl: window.adminAuth.apiBaseUrl });
        const result = await window.adminAuth.login(email, password);

        if (result.success) {
          const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || 'index.html';
          sessionStorage.removeItem('redirectAfterLogin');
          window.location.href = redirectUrl;
          return;
        }

        if (errorBanner) {
          errorBanner.textContent = result.message || 'Unable to login, please try again.';
          errorBanner.classList.remove('d-none');
        }
      } catch (error) {
        console.error('Login error:', error);
        if (errorBanner) {
          errorBanner.textContent = error.message || 'Network error. Please check your connection and try again.';
          errorBanner.classList.remove('d-none');
        }
      } finally {
        setSubmitting(false);
      }
    });
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoginHandler);
  } else {
    // DOM already ready, wait a bit for scripts to load
    setTimeout(initLoginHandler, 100);
  }
})();

