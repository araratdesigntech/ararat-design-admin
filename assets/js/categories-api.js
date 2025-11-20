/**
 * Category API Service
 * Handles all category-related API calls
 */

class CategoryAPI {
    constructor() {
        this.apiBaseUrl = this.detectApiBaseUrl();
    }

    /**
     * Detect API base URL
     */
    detectApiBaseUrl() {
        // Check for explicit configuration first
        if (window.ADMIN_API_BASE_URL) {
            return window.ADMIN_API_BASE_URL.replace(/\/$/, '');
        }
        if (window.ARARAT_API_BASE_URL) {
            return window.ARARAT_API_BASE_URL.replace(/\/$/, '');
        }

        // If running on localhost/127.0.0.1 with a development server port (like 5500, 3000, etc.)
        // default to backend port 8000
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        if ((hostname === 'localhost' || hostname === '127.0.0.1') && port && port !== '8000') {
            // Development mode - use backend port 8000
            return `http://${hostname}:8000/api/v1`;
        }

        // Production API URL
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
     * Get categories with pagination and filters
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>}
     */
    async getCategories(params = {}) {
        try {
            const queryParams = new URLSearchParams();
            
            if (params.page) queryParams.append('page', params.page);
            if (params.limit) queryParams.append('limit', params.limit);
            if (params.search) queryParams.append('search', params.search);
            if (params.sort) queryParams.append('sort', params.sort);

            const queryString = queryParams.toString();
            const url = `${this.apiBaseUrl}/categories${queryString ? `?${queryString}` : ''}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching categories:', error);
            throw error;
        }
    }

    /**
     * Get single category by ID
     * @param {string} id - Category ID
     * @returns {Promise<Object>}
     */
    async getCategoryById(id) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/categories/${id}`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching category:', error);
            throw error;
        }
    }

    /**
     * Create new category
     * @param {FormData} formData - Category data (name, description, image)
     * @returns {Promise<Object>}
     */
    async createCategory(formData) {
        try {
            const headers = {};
            const token = localStorage.getItem('admin_session');
            const session = token ? JSON.parse(token) : null;
            
            if (session?.accessToken) {
                headers['Authorization'] = `Bearer ${session.accessToken}`;
            }

            const response = await fetch(`${this.apiBaseUrl}/categories`, {
                method: 'POST',
                headers: headers,
                body: formData
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error creating category:', error);
            throw error;
        }
    }

    /**
     * Update category
     * @param {string} id - Category ID
     * @param {FormData} formData - Category data
     * @returns {Promise<Object>}
     */
    async updateCategory(id, formData) {
        try {
            const headers = {};
            const token = localStorage.getItem('admin_session');
            const session = token ? JSON.parse(token) : null;
            
            if (session?.accessToken) {
                headers['Authorization'] = `Bearer ${session.accessToken}`;
            }

            const response = await fetch(`${this.apiBaseUrl}/categories/${id}`, {
                method: 'PATCH',
                headers: headers,
                body: formData
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error updating category:', error);
            throw error;
        }
    }

    /**
     * Delete category
     * @param {string} id - Category ID
     * @returns {Promise<Object>}
     */
    async deleteCategory(id) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/categories/${id}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error deleting category:', error);
            throw error;
        }
    }
}

// Create global instance
const categoryAPI = new CategoryAPI();

