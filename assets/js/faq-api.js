/**
 * FAQ API Service
 * Handles all FAQ-related API calls
 */

class FAQAPI {
    constructor() {
        this.apiBaseUrl = this.detectApiBaseUrl();
    }

    /**
     * Detect API base URL
     */
    detectApiBaseUrl() {
        // Prefer central config getter
        if (window.getAraratApiBaseUrl) return window.getAraratApiBaseUrl();
        if (window.ARARAT_API_BASE_URL) return window.ARARAT_API_BASE_URL.replace(/\/$/, '');
        if (window.ADMIN_API_BASE_URL) return window.ADMIN_API_BASE_URL.replace(/\/$/, '');

        // Last-resort fallback
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `http://${hostname}:8000/api/v1`;
        }

        // For production, use production API URL
        return 'https://api.araratdesigns.org/api/v1';
    }

    /**
     * Get Authorization headers
     */
    getAuthHeaders() {
        const token = localStorage.getItem('admin_session');
        const session = token ? JSON.parse(token) : null;
        
        return {
            'Content-Type': 'application/json',
            ...(session?.accessToken ? { 'Authorization': `Bearer ${session.accessToken}` } : {})
        };
    }

    /**
     * Get all FAQs (admin)
     * @returns {Promise<Object>}
     */
    async getAllFAQs() {
        try {
            // Wait for AdminApp to be available (with timeout)
            let retries = 0;
            while (!window.AdminApp && retries < 10) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
            }
            
            // Use AdminApp.request for automatic token refresh handling
            if (window.AdminApp && window.AdminApp.request) {
                return await window.AdminApp.request('/faqs/admin/all', {
                    method: 'GET'
                });
            }
            
            // Fallback to direct fetch if AdminApp is not available
            const response = await fetch(`${this.apiBaseUrl}/faqs/admin/all`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            const data = await response.json();
            
            // Check for auth errors and handle them
            if (response.status === 401 || response.status === 403 || 
                data.message?.toLowerCase().includes('jwt expired') ||
                data.message?.toLowerCase().includes('expired')) {
                // Logout if auth error
                if (window.adminAuth && window.adminAuth.logout) {
                    window.adminAuth.logout();
                } else {
                    localStorage.removeItem('admin_session');
                    window.location.href = 'login.html';
                }
                throw new Error('Session expired');
            }
            
            return data;
        } catch (error) {
            console.error('Error fetching FAQs:', error);
            throw error;
        }
    }

    /**
     * Get single FAQ by ID
     * @param {string} id - FAQ ID
     * @returns {Promise<Object>}
     */
    async getFAQById(id) {
        try {
            if (window.AdminApp && window.AdminApp.request) {
                return await window.AdminApp.request(`/faqs/admin/${id}`, {
                    method: 'GET'
                });
            }
            
            const response = await fetch(`${this.apiBaseUrl}/faqs/admin/${id}`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            const data = await response.json();
            if (response.status === 401 || response.status === 403) {
                if (window.adminAuth && window.adminAuth.logout) {
                    window.adminAuth.logout();
                }
                throw new Error('Unauthorized');
            }
            return data;
        } catch (error) {
            console.error('Error fetching FAQ:', error);
            throw error;
        }
    }

    /**
     * Create new FAQ
     * @param {Object} faqData - FAQ data (question, answer, category, order, isActive)
     * @returns {Promise<Object>}
     */
    async createFAQ(faqData) {
        try {
            if (window.AdminApp && window.AdminApp.request) {
                return await window.AdminApp.request('/faqs/admin', {
                    method: 'POST',
                    body: faqData
                });
            }
            
            const response = await fetch(`${this.apiBaseUrl}/faqs/admin`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(faqData)
            });

            const data = await response.json();
            if (response.status === 401 || response.status === 403) {
                if (window.adminAuth && window.adminAuth.logout) {
                    window.adminAuth.logout();
                }
                throw new Error('Unauthorized');
            }
            return data;
        } catch (error) {
            console.error('Error creating FAQ:', error);
            throw error;
        }
    }

    /**
     * Update FAQ
     * @param {string} id - FAQ ID
     * @param {Object} faqData - FAQ data
     * @returns {Promise<Object>}
     */
    async updateFAQ(id, faqData) {
        try {
            if (window.AdminApp && window.AdminApp.request) {
                return await window.AdminApp.request(`/faqs/admin/${id}`, {
                    method: 'PUT',
                    body: faqData
                });
            }
            
            const response = await fetch(`${this.apiBaseUrl}/faqs/admin/${id}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(faqData)
            });

            const data = await response.json();
            if (response.status === 401 || response.status === 403) {
                if (window.adminAuth && window.adminAuth.logout) {
                    window.adminAuth.logout();
                }
                throw new Error('Unauthorized');
            }
            return data;
        } catch (error) {
            console.error('Error updating FAQ:', error);
            throw error;
        }
    }

    /**
     * Delete FAQ
     * @param {string} id - FAQ ID
     * @returns {Promise<Object>}
     */
    async deleteFAQ(id) {
        try {
            if (window.AdminApp && window.AdminApp.request) {
                return await window.AdminApp.request(`/faqs/admin/${id}`, {
                    method: 'DELETE'
                });
            }
            
            const response = await fetch(`${this.apiBaseUrl}/faqs/admin/${id}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            const data = await response.json();
            if (response.status === 401 || response.status === 403) {
                if (window.adminAuth && window.adminAuth.logout) {
                    window.adminAuth.logout();
                }
                throw new Error('Unauthorized');
            }
            return data;
        } catch (error) {
            console.error('Error deleting FAQ:', error);
            throw error;
        }
    }
}

// Create global instance
const faqAPI = new FAQAPI();

