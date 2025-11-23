/**
 * Product API Service
 * Handles all product-related API calls
 */

class ProductAPI {
    constructor() {
        this.apiBaseUrl = this.detectApiBaseUrl();
        // Debug: Log the detected API URL
        console.log('[ProductAPI] Detected API Base URL:', this.apiBaseUrl);
        console.log('[ProductAPI] Current hostname:', window.location.hostname);
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

        // For production, use production API URL (should be set by config.js, but fallback if not)
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
     * Get products with pagination and filters
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>}
     */
    async getProducts(params = {}) {
        try {
            const queryParams = new URLSearchParams();
            
            if (params.page) queryParams.append('page', params.page);
            if (params.limit) queryParams.append('limit', params.limit);
            if (params.search) queryParams.append('search', params.search);
            if (params.sort) queryParams.append('sort', params.sort);
            if (params.product) queryParams.append('product', params.product);

            const queryString = queryParams.toString();
            const url = `${this.apiBaseUrl}/admin/products${queryString ? `?${queryString}` : ''}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching products:', error);
            throw error;
        }
    }

    /**
     * Get single product by ID
     * @param {string} id - Product ID
     * @returns {Promise<Object>}
     */
    async getProductById(id) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/products/${id}`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching product:', error);
            throw error;
        }
    }

    /**
     * Create new product
     * @param {FormData} formData - Product data (name, description, image)
     * @returns {Promise<Object>}
     */
    async createProduct(formData) {
        try {
            const headers = {};
            const token = localStorage.getItem('admin_session');
            const session = token ? JSON.parse(token) : null;
            
            if (session?.accessToken) {
                headers['Authorization'] = `Bearer ${session.accessToken}`;
            }

            const response = await fetch(`${this.apiBaseUrl}/admin/products/add`, {
                method: 'POST',
                headers: headers,
                body: formData
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error creating product:', error);
            throw error;
        }
    }

    /**
     * Update product
     * @param {string} id - Product ID
     * @param {FormData} formData - Product data
     * @returns {Promise<Object>}
     */
    async updateProduct(id, formData) {
        try {
            const headers = {};
            const token = localStorage.getItem('admin_session');
            const session = token ? JSON.parse(token) : null;
            
            if (session?.accessToken) {
                headers['Authorization'] = `Bearer ${session.accessToken}`;
            }

            const response = await fetch(`${this.apiBaseUrl}/admin/products/${id}`, {
                method: 'PATCH',
                headers: headers,
                body: formData
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    }

    /**
     * Delete product
     * @param {string} id - Product ID
     * @returns {Promise<Object>}
     */
    async deleteProduct(id) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/products/${id}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    }
}

// Create global instance
const productAPI = new ProductAPI();

