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
          
          // Check if refresh token is also expired
          const errorMessage = data?.message || data?.error || '';
          const isRefreshTokenExpired = errorMessage.toLowerCase().includes('jwt expired') || 
                                       errorMessage.toLowerCase().includes('token expired') ||
                                       errorMessage.toLowerCase().includes('expired') ||
                                       response.status === 401 || 
                                       response.status === 403;
          
          if (isRefreshTokenExpired) {
            // Refresh token is expired - logout user
            console.log('Refresh token expired - logging out user');
            clearSession();
            return null;
          }
          
          // Other error - still logout for security
          clearSession();
          return null;
        }

        // Update session with new tokens
        // Refresh token response structure: data.data.accessToken and data.data.refreshToken
        // OR data.data.user.accessToken and data.data.user.refreshToken
        const accessToken = data.data?.accessToken || data.data?.user?.accessToken;
        const refreshToken = data.data?.refreshToken || data.data?.user?.refreshToken;
        
        if (!accessToken || !refreshToken) {
          console.error('Invalid refresh token response structure:', data);
          clearSession();
          return null;
        }

        const updatedSession = {
          ...session,
          accessToken: accessToken,
          refreshToken: refreshToken,
          loginTime: Date.now(), // Update login time
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
    
    // Check for JWT expiration in response
    const responseData = result.data || {};
    const errorMessage = responseData.message || responseData.error || '';
    const isJwtExpired = errorMessage.toLowerCase().includes('jwt expired') || 
                         errorMessage.toLowerCase().includes('token expired') ||
                         errorMessage.toLowerCase().includes('expired');
    
    // Only check HTTP status codes for auth errors, not response body status field
    // 403 is returned when JWT is invalid/expired (from backend checkIsAuth middleware)
    // 401 is returned for other auth failures
    const httpStatus = result.response.status;
    const isAuthError = httpStatus === 401 || httpStatus === 403 || isJwtExpired;

    // Only attempt refresh if:
    // 1. It's an auth error (401, 403, or jwt expired message)
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
        // Refresh failed - user should be logged out
        stopAllLoadingSpinners();
        // clearSession() already handles redirect, so just throw to stop execution
        throw new Error('Token refresh failed - session expired');
      }
    } else if (!result.response.ok && isAuthError && isTokenTooFresh) {
      // If token is too fresh but we got an auth error, the token might be invalid
      // Log this for debugging but don't attempt refresh (might be a different issue)
      console.warn('Auth error with fresh token - possible invalid token or session issue');
    } else if (!result.response.ok && isAuthError && !session?.refreshToken) {
      // No refresh token available - logout immediately
      const pathname = window.location.pathname.toLowerCase();
      const isPublicPage = pathname.includes('login.html') || 
                           pathname.includes('forgot-password.html') || 
                           pathname.includes('reset-password.html');
      
      if (!isPublicPage) {
        stopAllLoadingSpinners();
        showToast('Session expired, please login again.', 'warning');
        clearSession();
      }
      throw new Error('Unauthorized - no refresh token available');
    }

    if (raw) return result.response;

    // Handle final response - check for auth errors that weren't handled by refresh
    const finalResponseData = result.data || {};
    const finalErrorMessage = finalResponseData.message || finalResponseData.error || '';
    const isFinalJwtExpired = finalErrorMessage.toLowerCase().includes('jwt expired') || 
                              finalErrorMessage.toLowerCase().includes('token expired') ||
                              finalErrorMessage.toLowerCase().includes('expired');
    
    if ((result.response.status === 401 || result.response.status === 403 || isFinalJwtExpired) && !isRefreshing) {
      // If we're not already refreshing and we got an auth error, try one more time with refresh
      // This handles cases where the error message indicates expiration but status wasn't caught
      if (retryOn401 && session?.refreshToken) {
        const tokenAge = session?.loginTime ? Date.now() - session.loginTime : Infinity;
        const isTokenTooFresh = tokenAge < 5000;
        
        if (!isTokenTooFresh) {
          try {
            const newAccessToken = await refreshAccessToken();
            if (newAccessToken) {
              // Retry the request with the new token
              result = await makeRequest(newAccessToken);
              // If retry succeeded, continue with the response
              if (result.response.ok) {
                if (raw) return result.response;
                return result.data;
              }
            }
          } catch (refreshError) {
            // Refresh failed - will be handled by clearSession in refreshAccessToken
            throw new Error('Token refresh failed');
          }
        }
      }
      
      // If we get here, auth failed and refresh didn't work or wasn't attempted
      const pathname = window.location.pathname.toLowerCase();
      const isPublicPage = pathname.includes('login.html') || 
                           pathname.includes('forgot-password.html') || 
                           pathname.includes('reset-password.html');
      
      if (!isPublicPage) {
        stopAllLoadingSpinners();
        showToast('Session expired, please login again.', 'warning');
        clearSession();
      }
      throw new Error('Unauthorized');
    }

    // Check for other errors (not auth errors)
    if (!result.response.ok || result.data.error) {
      // Stop any loading spinners on error
      stopAllLoadingSpinners();
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

  // Global error handler to stop loading spinners on errors
  const stopAllLoadingSpinners = () => {
    // Remove all spinner elements
    document.querySelectorAll('.spinner-border, .spinner-grow, [role="status"]').forEach(spinner => {
      const parent = spinner.closest('tr, td, div');
      if (parent) {
        const text = parent.textContent || '';
        if (text.includes('Loading') || text.includes('loading')) {
          parent.style.display = 'none';
        }
      }
    });
    
    // Hide loading overlays
    document.querySelectorAll('.loading-overlay, .loader, [class*="loading"]').forEach(loader => {
      if (loader.style) {
        loader.style.display = 'none';
      }
    });
  };

  // Handle unhandled promise rejections to prevent infinite loading
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    stopAllLoadingSpinners();
    
    // If it's an auth error, ensure user is logged out
    const errorMessage = event.reason?.message || String(event.reason || '');
    if (errorMessage.includes('Unauthorized') || errorMessage.includes('expired') || errorMessage.includes('Token')) {
      const pathname = window.location.pathname.toLowerCase();
      const isPublicPage = pathname.includes('login.html') || 
                           pathname.includes('forgot-password.html') || 
                           pathname.includes('reset-password.html');
      
      if (!isPublicPage) {
        setTimeout(() => {
          if (window.location.pathname && !window.location.pathname.includes('login.html')) {
            clearSession();
          }
        }, 100);
      }
    }
  });

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
    stopAllLoadingSpinners,
  };
})();

