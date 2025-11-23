// Central API base URL configuration
// Sets a global variable `ARARAT_API_BASE_URL` (and ADMIN_API_BASE_URL for compatibility)
// Behavior:
// - On development (localhost/127.0.0.1 or private LAN) -> http://localhost:8000/api/v1
// - On production -> https://api.araratdesigns.org/api/v1
(function (window) {
  try {
    var hostname = window.location.hostname;
    var isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.indexOf('192.168.') === 0;

    // Allow explicit override via an environment-specific inline script that sets
    // window.ARARAT_API_BASE_URL or window.ADMIN_API_BASE_URL before this file runs.
    if (window.ARARAT_API_BASE_URL || window.ADMIN_API_BASE_URL) {
      // normalize (remove trailing slash)
      var existing = (window.ARARAT_API_BASE_URL || window.ADMIN_API_BASE_URL).replace(/\/$/, '');
      window.ARARAT_API_BASE_URL = existing;
      window.ADMIN_API_BASE_URL = existing; // keep compatibility
    } else if (isLocalHost) {
      window.ARARAT_API_BASE_URL = 'http://localhost:8000/api/v1';
      window.ADMIN_API_BASE_URL = window.ARARAT_API_BASE_URL;
    } else {
      window.ARARAT_API_BASE_URL = 'https://api.araratdesigns.org/api/v1';
      window.ADMIN_API_BASE_URL = window.ARARAT_API_BASE_URL;
    }

    // Helper (optional) - a safe getter that other scripts can call
    window.getAraratApiBaseUrl = function () {
      return (window.ARARAT_API_BASE_URL || window.ADMIN_API_BASE_URL || '').replace(/\/$/, '');
    };

    // Console banner for easier debugging
    try {
      var resolved = window.getAraratApiBaseUrl();
      var env = /localhost|127\.0\.0\.1/.test(window.location.hostname) ? 'development' : 'production';
      console.log('%cARARAT API', 'background:#111;color:#fff;padding:4px 8px;border-radius:4px;', resolved, '(' + env + ')');
    } catch (e) {
      // ignore console banner errors
    }
  } catch (e) {
    // Fail silently - don't break pages
    console.error('[config.js] failed to determine API base URL', e);
  }
})(window);
