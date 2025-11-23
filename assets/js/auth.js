/**
 * Admin Authentication System
 * Handles login, logout, and session management
 */

class AdminAuth {
    constructor() {
        this.storageKey = 'admin_session';
        this.sessionTimeout = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
        this.isAuthenticated = false;
        const detectApiBaseUrl = () => {
            if (window.getAraratApiBaseUrl) return window.getAraratApiBaseUrl();
            if (window.ARARAT_API_BASE_URL) return window.ARARAT_API_BASE_URL.replace(/\/$/, '');
            if (window.ADMIN_API_BASE_URL) return window.ADMIN_API_BASE_URL.replace(/\/$/, '');

            // Last-resort fallback
            const hostname = window.location.hostname;
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                return `http://${hostname}:800/api/v1`;
            }

            // For production, use production API URL (should be set by config.js, but fallback if not)
            return 'https://api.araratdesigns.org/api/v1';
        };

        this.apiBaseUrl = detectApiBaseUrl();
    }

    /**
     * Initialize authentication check
     */
    init() {
        this.checkAuthentication();
        this.setupSessionTimeout();
        this.setupHeartbeat();
    }

    /**
     * Authenticate user via API
     * @param {string} email - Admin email
     * @param {string} password - Admin password
     * @returns {Promise<Object>} - Object with success and message properties
     */
    async login(email, password) {
        try {
            console.log('Login attempt:', { email, apiBaseUrl: this.apiBaseUrl });
            
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            console.log('Login response status:', response.status);

            const data = await response.json();
            console.log('Login response data:', data);

            // Check if login was successful
            if (response.ok && data.success && !data.error && data.status === 200) {
                // Check if user data exists
                const user = data.data?.user || data.data;
                if (!user) {
                    console.error('No user data in response');
                    return {
                        success: false,
                        message: 'Invalid response from server. Please try again.'
                    };
                }

                // Verify user has admin role
                if (user.role && user.role !== 'admin') {
                    console.error('User does not have admin role:', user.role);
                    return {
                        success: false,
                        message: 'Access denied. You do not have admin privileges.'
                    };
                }

                // Create session data with API response
                // Backend response structure: { success: true, data: { accessToken, refreshToken, user } }
                const accessToken = data.data?.accessToken;
                const refreshToken = data.data?.refreshToken;
                
                if (!accessToken || !refreshToken) {
                    console.error('Login response missing tokens:', { 
                        hasData: !!data.data,
                        hasAccessToken: !!accessToken,
                        hasRefreshToken: !!refreshToken,
                        responseData: data.data 
                    });
                    return {
                        success: false,
                        message: 'Invalid response from server - missing authentication tokens.'
                    };
                }
                
                const sessionData = {
                    username: user.name || user.username || email,
                    email: user.email || email,
                    user: user,
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    loginTime: Date.now(),
                    userId: user._id || user.id
                };

                // Store session
                localStorage.setItem(this.storageKey, JSON.stringify(sessionData));
                console.log('Session stored successfully:', { 
                    hasAccessToken: !!sessionData.accessToken,
                    hasRefreshToken: !!sessionData.refreshToken,
                    tokenLength: sessionData.accessToken?.length 
                });

                this.isAuthenticated = true;
                return {
                    success: true,
                    message: data.message || 'Login successful'
                };
            } else {
                const errorMsg = data.message || data.error?.message || 'Invalid email or password. Please try again.';
                console.error('Login failed:', errorMsg, data);
                return {
                    success: false,
                    message: errorMsg
                };
            }
        } catch (error) {
            const errorMsg = error.message || 'Network error. Please check your connection.';
            console.error('Login error:', error);
            return {
                success: false,
                message: errorMsg
            };
        }
    }

    /**
     * Logout current user
     */
    logout() {
        localStorage.removeItem(this.storageKey);
        this.isAuthenticated = false;
        window.location.href = 'login.html';
    }

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isLoggedIn() {
        const sessionData = this.getSessionData();

        if (!sessionData) {
            return false;
        }

        // Check if session has expired
        // Only check expiry if loginTime exists and is valid
        if (sessionData.loginTime && typeof sessionData.loginTime === 'number') {
            const currentTime = Date.now();
            const sessionAge = currentTime - sessionData.loginTime;

            // Only logout if session has actually expired (not just missing loginTime)
            if (sessionAge > this.sessionTimeout) {
                console.warn('Session expired - session age:', sessionAge, 'timeout:', this.sessionTimeout);
                this.logout();
                return false;
            }
        } else if (!sessionData.loginTime) {
            // If loginTime is missing, check if we have tokens - might be from old session format
            // Only logout if we also don't have access token
            if (!sessionData.accessToken) {
                console.warn('Invalid session - missing loginTime and accessToken');
                return false;
            }
            // Update session with loginTime for future checks
            sessionData.loginTime = Date.now();
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(sessionData));
            } catch (error) {
                console.error('Error updating session:', error);
            }
        }

        // Check if we have required session data
        if (!sessionData.accessToken) {
            return false;
        }

        this.isAuthenticated = true;
        return true;
    }

    /**
     * Get current session data
     * @returns {Object|null}
     */
    getSessionData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error reading session data:', error);
            return null;
        }
    }

    /**
     * Get current username
     * @returns {string|null}
     */
    getUsername() {
        const sessionData = this.getSessionData();
        return sessionData ? sessionData.username : null;
    }

    /**
     * Get access token for API calls
     * @returns {string|null}
     */
    getAccessToken() {
        const sessionData = this.getSessionData();
        return sessionData ? sessionData.accessToken : null;
    }

    /**
     * Get user information from session
     * @returns {Object|null}
     */
    getUserInfo() {
        const sessionData = this.getSessionData();
        return sessionData ? sessionData.user : null;
    }

    /**
     * Check if current page is a public page (doesn't require authentication)
     * @returns {boolean}
     */
    isPublicPage() {
        const pathname = window.location.pathname.toLowerCase();
        return pathname.includes('login.html') || 
               pathname.includes('forgot-password.html') || 
               pathname.includes('reset-password.html');
    }

    /**
     * Protect a route - redirects to login if not authenticated
     */
    protectRoute() {
        // Don't protect public pages
        if (this.isPublicPage()) {
            return;
        }

        if (!this.isLoggedIn()) {
            this.redirectToLogin();
        }
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        // Don't redirect if already on a public page
        if (this.isPublicPage()) {
            return;
        }

        // Store the current URL for redirect after login
        const currentUrl = window.location.pathname;
        sessionStorage.setItem('redirectAfterLogin', currentUrl);

        window.location.href = 'login.html';
    }

    /**
     * Check authentication status and redirect if needed
     */
    checkAuthentication() {
        // Don't check authentication on public pages
        if (this.isPublicPage()) {
            return;
        }

        if (!this.isLoggedIn()) {
            this.redirectToLogin();
        }
    }

    /**
     * Generate a simple token
     * @returns {string}
     */
    generateToken() {
        return 'token_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    /**
     * Setup session timeout warning
     */
    setupSessionTimeout() {
        // Warn user before session expires (15 minutes before timeout)
        const warningTime = this.sessionTimeout - (15 * 60 * 1000);

        setTimeout(() => {
            if (this.isLoggedIn()) {
                const extendSession = confirm(
                    'Your session will expire in 15 minutes. Do you want to extend your session?'
                );

                if (extendSession) {
                    const sessionData = this.getSessionData();
                    if (sessionData) {
                        sessionData.loginTime = Date.now();
                        localStorage.setItem(this.storageKey, JSON.stringify(sessionData));
                    }
                }
            }
        }, warningTime);
    }

    /**
     * Setup heartbeat to keep session alive
     */
    setupHeartbeat() {
        // Send heartbeat every 10 minutes
        setInterval(() => {
            if (this.isLoggedIn()) {
                const sessionData = this.getSessionData();
                if (sessionData) {
                    // Update login time
                    sessionData.loginTime = Date.now();
                    localStorage.setItem(this.storageKey, JSON.stringify(sessionData));
                }
            }
        }, 10 * 60 * 1000);
    }

    /**
     * Clear expired sessions
     */
    clearExpiredSessions() {
        const sessionData = this.getSessionData();
        
        if (!sessionData) {
            return;
        }

        const currentTime = Date.now();
        const sessionAge = currentTime - sessionData.loginTime;

        if (sessionAge > this.sessionTimeout) {
            this.logout();
        }
    }
}

// Create global instance
const adminAuth = new AdminAuth();

// Expose to window for use in other scripts
window.adminAuth = adminAuth;

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        adminAuth.init();
    });
} else {
    adminAuth.init();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminAuth;
}
