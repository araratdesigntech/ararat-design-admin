/**
 * Contact API Service
 * Handles all contact-related API calls
 */

class ContactAPI {
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
     * Get all contacts (admin)
     * @param {Object} params - Query parameters (page, limit, status, search)
     * @returns {Promise<Object>}
     */
    async getAllContacts(params = {}) {
        try {
            // Wait for AdminApp to be available (with timeout)
            let retries = 0;
            while (!window.AdminApp && retries < 10) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
            }
            
            // Use AdminApp.request for automatic token refresh handling
            if (window.AdminApp && window.AdminApp.request) {
                const queryParams = new URLSearchParams();
                
                if (params.page) queryParams.append('page', params.page);
                if (params.limit) queryParams.append('limit', params.limit);
                if (params.status) queryParams.append('status', params.status);
                if (params.search) queryParams.append('search', params.search);

                const queryString = queryParams.toString();
                const path = `/contact/admin/all${queryString ? `?${queryString}` : ''}`;
                
                return await window.AdminApp.request(path, {
                    method: 'GET'
                });
            }
            
            // Fallback to direct fetch if AdminApp is not available
            const queryParams = new URLSearchParams();
            
            if (params.page) queryParams.append('page', params.page);
            if (params.limit) queryParams.append('limit', params.limit);
            if (params.status) queryParams.append('status', params.status);
            if (params.search) queryParams.append('search', params.search);

            const queryString = queryParams.toString();
            const url = `${this.apiBaseUrl}/contact/admin/all${queryString ? `?${queryString}` : ''}`;

            const response = await fetch(url, {
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
            console.error('Error fetching contacts:', error);
            throw error;
        }
    }
}

// Create global instance
const contactAPI = new ContactAPI();

