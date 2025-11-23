(function () {
  const detectApiBaseUrl = () => {
    // Prefer the central config getter if available
    if (window.getAraratApiBaseUrl) {
      return window.getAraratApiBaseUrl();
    }

    // Backwards-compatible checks
    if (window.ARARAT_API_BASE_URL) return window.ARARAT_API_BASE_URL.replace(/\/$/, '');
    if (window.ADMIN_API_BASE_URL) return window.ADMIN_API_BASE_URL.replace(/\/$/, '');

    // Last-resort fallback: local development uses port 8000, otherwise production host
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://${hostname}:8000/api/v1`;
    }

    // For production, use production API URL (should be set by config.js, but fallback if not)
    return 'https://api.araratdesigns.org/api/v1';
  };

  const API_BASE_URL = detectApiBaseUrl();
  
  // Debug: Log the detected API URL (remove in production if desired)
  console.log('[AdminApp] Detected API Base URL:', API_BASE_URL);
  console.log('[AdminApp] Current hostname:', window.location.hostname);

  const STORAGE_KEY = 'admin_session';

  const getSession = () => {
    if (window.adminAuth?.getSessionData) {
      return window.adminAuth.getSessionData();
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  };

  const clearSession = () => {
    const pathname = window.location.pathname.toLowerCase();
    const isPublicPage = pathname.includes('login.html') || 
                         pathname.includes('forgot-password.html') || 
                         pathname.includes('reset-password.html');
    
    // Don't redirect if already on a public page
    if (isPublicPage) {
      return;
    }

    if (window.adminAuth?.logout) {
      window.adminAuth.logout();
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = 'login.html';
  };

  const formatCurrency = (value = 0) => {
    try {
      return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(value || 0);
    } catch (error) {
      return `₦${Number(value || 0).toFixed(2)}`;
    }
  };

  const formatDate = (value) => {
    if (!value) return '—';
    try {
      const date = new Date(value);
      return date.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (error) {
      return value;
    }
  };

  const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `admin-toast admin-toast--${type}`;
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = 1050;
    toast.style.padding = '12px 18px';
    toast.style.borderRadius = '8px';
    toast.style.color = '#fff';
    toast.style.fontSize = '14px';
    toast.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
    toast.style.background =
      type === 'success' ? '#28a745' : type === 'danger' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#0d6efd';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  };

  /**
   * Refresh access token using refresh token
   */
  let isRefreshing = false;
  let refreshTokenPromise = null;

  const refreshAccessToken = async () => {
    // If already refreshing, return the existing promise
    if (isRefreshing && refreshTokenPromise) {
      return refreshTokenPromise;
    }

    isRefreshing = true;
    refreshTokenPromise = (async () => {
      try {
        const session = getSession();
        if (!session?.refreshToken) {
          console.error('No refresh token available');
          clearSession();
          throw new Error('No refresh token available');
        }

        const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refreshToken: session.refreshToken,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          console.error('Token refresh failed:', data);
          const pathname = window.location.pathname.toLowerCase();
          const isPublicPage = pathname.includes('login.html') || 
                               pathname.includes('forgot-password.html') || 
                               pathname.includes('reset-password.html');
          
          clearSession();
          
          // Only redirect if not already on a public page
          if (!isPublicPage) {
            // Small delay to prevent immediate redirect during page load
            setTimeout(() => {
              if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html';
              }
            }, 100);
          }
          throw new Error(data?.message || 'Token refresh failed');
        }

        // Update session with new tokens
        // Refresh token response structure: data.data.user.accessToken
        if (!data.data?.user?.accessToken || !data.data?.user?.refreshToken) {
          console.error('Invalid refresh token response structure:', data);
          const pathname = window.location.pathname.toLowerCase();
          const isPublicPage = pathname.includes('login.html') || 
                               pathname.includes('forgot-password.html') || 
                               pathname.includes('reset-password.html');
          
          clearSession();
          
          // Only redirect if not already on a public page
          if (!isPublicPage) {
            setTimeout(() => {
              if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html';
              }
            }, 100);
          }
          throw new Error('Invalid token refresh response');
        }

        const updatedSession = {
          ...session,
          accessToken: data.data.user.accessToken,
          refreshToken: data.data.user.refreshToken,
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSession));

        return updatedSession.accessToken;
      } catch (error) {
        console.error('Error refreshing token:', error);
        const pathname = window.location.pathname.toLowerCase();
        const isPublicPage = pathname.includes('login.html') || 
                             pathname.includes('forgot-password.html') || 
                             pathname.includes('reset-password.html');
        
        clearSession();
        
        // Only redirect if not already on a public page
        if (!isPublicPage) {
          setTimeout(() => {
            if (!window.location.pathname.includes('login.html')) {
              window.location.href = 'login.html';
            }
          }, 100);
        }
        return null;
      } finally {
        isRefreshing = false;
        refreshTokenPromise = null;
      }
    })();

    return refreshTokenPromise;
  };

  const request = async (path, options = {}) => {
    const { method = 'GET', body, headers = {}, raw = false, retryOn401 = true, skipAuth = false } = options;
    const session = getSession();
    const finalHeaders = { Accept: 'application/json', ...headers };
    let payload = body;
    
    // Log if session is missing for debugging
    if (!skipAuth && !session) {
      console.warn('AdminApp.request: No session found for authenticated request:', path);
    }
    if (!skipAuth && session && !session.accessToken) {
      console.warn('AdminApp.request: Session exists but no accessToken for request:', path);
    }

    if (!(body instanceof FormData) && body && typeof body === 'object') {
      finalHeaders['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    if (body instanceof FormData) {
      delete finalHeaders['Content-Type'];
    }

    // Helper to make request with auth token
    const makeRequest = async (authToken) => {
      const reqHeaders = { ...finalHeaders };
      
      // Determine the actual token to use
      let tokenToUse = authToken;
      if (!tokenToUse && !skipAuth) {
        const currentSession = getSession();
        tokenToUse = currentSession?.accessToken;
      }
      
      // Add Authorization header if we have a token
      if (tokenToUse) {
        reqHeaders.Authorization = `Bearer ${tokenToUse}`;
      } else if (!skipAuth) {
        // No token available for authenticated request - log warning
        console.warn(`[AdminApp.request] Missing token for authenticated request: ${path}`, {
          providedToken: !!authToken,
          sessionToken: !!getSession()?.accessToken,
          skipAuth
        });
      }

      // Log request details for debugging (remove in production)
      if (!skipAuth) {
        console.log(`[AdminApp.request] Making request: ${method} ${path}`, {
          hasToken: !!tokenToUse,
          tokenLength: tokenToUse?.length,
          tokenPrefix: tokenToUse?.substring(0, 20) + '...'
        });
      }

      const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: reqHeaders,
        body: payload,
      });

      if (raw) return response;

      const data = await response.json().catch(() => ({}));

      return { response, data };
    };

    // Make initial request - ensure we always have a token if skipAuth is false
    let tokenToUse = session?.accessToken;
    
    // If no token but we need auth, try to get it from current session
    if (!tokenToUse && !skipAuth) {
      const currentSession = getSession();
      tokenToUse = currentSession?.accessToken;
    }
    
    // Log if we're missing a token for debugging
    if (!tokenToUse && !skipAuth) {
      console.warn(`AdminApp.request: No access token available for ${path}. Session:`, session);
    }
    
    let result = await makeRequest(tokenToUse);

    // Only check HTTP status codes for auth errors, not response body status field
    // 403 is returned when JWT is invalid/expired (from backend checkIsAuth middleware)
    // 401 is returned for other auth failures
    const httpStatus = result.response.status;
    const isAuthError = httpStatus === 401 || httpStatus === 403;

    // Only attempt refresh if:
    // 1. It's an auth error (401 or 403)
    // 2. retryOn401 is enabled
    // 3. We have a refresh token
    // 4. The request actually failed (not ok)
    // 5. Token is not too fresh (logged in less than 5 seconds ago - avoid refresh immediately after login)
    const tokenAge = session?.loginTime ? Date.now() - session.loginTime : Infinity;
    const isTokenTooFresh = tokenAge < 5000; // 5 seconds
    
    if (!result.response.ok && isAuthError && retryOn401 && session?.refreshToken && !isTokenTooFresh) {
      try {
        const newAccessToken = await refreshAccessToken();
        if (newAccessToken) {
          // Retry the request with the new token
          result = await makeRequest(newAccessToken);
        } else {
          // Refresh returned null - user has been logged out
          throw new Error('Token refresh failed');
        }
      } catch (error) {
        // Refresh failed - check if we're already on login page to avoid infinite loops
        const pathname = window.location.pathname.toLowerCase();
        const isPublicPage = pathname.includes('login.html') || 
                             pathname.includes('forgot-password.html') || 
                             pathname.includes('reset-password.html');
        
        if (!isPublicPage) {
          showToast('Session expired, please login again.', 'warning');
        }
        throw new Error('Unauthorized');
      }
    } else if (!result.response.ok && isAuthError && isTokenTooFresh) {
      // If token is too fresh but we got an auth error, the token might be invalid
      // Log this for debugging but don't attempt refresh (might be a different issue)
      console.warn('Auth error with fresh token - possible invalid token or session issue');
    }

    if (raw) return result.response;

    // Handle final response - only check HTTP status codes
    // But don't throw/logout if we just tried to refresh and the token is very fresh
    if (result.response.status === 401 || result.response.status === 403) {
      const pathname = window.location.pathname.toLowerCase();
      const isPublicPage = pathname.includes('login.html') || 
                           pathname.includes('forgot-password.html') || 
                           pathname.includes('reset-password.html');
      
      // Check if token is very fresh (just logged in) - might be a different issue
      const tokenAge = session?.loginTime ? Date.now() - session.loginTime : Infinity;
      const isTokenVeryFresh = tokenAge < 10000; // 10 seconds
      
      // If token is very fresh, don't immediately logout - might be a server issue or invalid request
      if (!isPublicPage && !isTokenVeryFresh) {
        showToast('Session expired, please login again.', 'warning');
        clearSession();
      } else if (!isPublicPage && isTokenVeryFresh) {
        // Very fresh token with auth error - log for debugging but don't logout immediately
        console.warn('Auth error with very fresh token (logged in < 10s ago). Possible server issue or invalid request.');
        console.warn('Response:', result.response.status, result.data);
      }
      throw new Error('Unauthorized');
    }

    // Check for other errors (not auth errors)
    if (!result.response.ok || result.data.error) {
      // Don't treat non-auth errors as session expiration
      throw new Error(result.data?.message || 'Request failed');
    }

    return result.data;
  };

  const ensureAuth = () => {
    const pathname = window.location.pathname.toLowerCase();
    const isPublicPage = pathname.includes('login.html') || 
                         pathname.includes('forgot-password.html') || 
                         pathname.includes('reset-password.html');

    if (isPublicPage) {
      return;
    }

    // Add a small delay to ensure session is fully loaded after redirect
    // This prevents race conditions where session might not be available immediately
    setTimeout(() => {
      const session = getSession();
      
      if (!session) {
        console.warn('No session found on page load');
        // Don't immediately redirect - might be still loading
        // Only redirect if we're definitely not logged in
        if (window.adminAuth && !window.adminAuth.isLoggedIn()) {
          clearSession();
        }
        return;
      }

      // Check if we have required session data
      if (!session.accessToken) {
        console.warn('Session missing accessToken');
        if (window.adminAuth && !window.adminAuth.isLoggedIn()) {
          clearSession();
        }
        return;
      }

      // Use protectRoute if available
      if (window.adminAuth?.protectRoute) {
        window.adminAuth.protectRoute();
      }
    }, 100); // Small delay to ensure localStorage is fully accessible
  };

  const updateHeaderUser = () => {
    const session = getSession();
    if (!session) return;
    const nameTargets = document.querySelectorAll('[data-admin-name]');
    nameTargets.forEach((el) => {
      el.textContent = session.user?.name || session.username || 'Admin';
    });
    const emailTargets = document.querySelectorAll('[data-admin-email]');
    emailTargets.forEach((el) => {
      el.textContent = session.user?.email || session.email || '';
    });
  };

  const applyLogoutHandlers = () => {
    document.body.addEventListener('click', (event) => {
      const target = event.target.closest('[data-admin-logout]');
      if (!target) return;
      event.preventDefault();
      if (confirm('Are you sure you want to logout?')) {
        clearSession();
      }
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    ensureAuth();
    updateHeaderUser();
    applyLogoutHandlers();
  });

  window.AdminApp = {
    request,
    formatCurrency,
    formatDate,
    showToast,
    getSession,
    ensureAuth,
    updateHeaderUser,
    getApiBaseUrl: () => API_BASE_URL,
  };
})();

