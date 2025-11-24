/**
 * Contact Manager
 * Handles UI interactions for contact management
 */

class ContactManager {
  constructor() {
    this.currentPage = 1;
    this.limit = 20;
    this.searchTerm = "";
    this.statusFilter = "";
  }

  /**
   * Initialize the manager
   */
  init() {
    this.bindEvents();
    this.loadContacts();
  }

  /**
   * Bind all event listeners
   */
  bindEvents() {
    // Search functionality
    $("#contactSearch").on("keyup", (e) => {
      if (e.key === "Enter" || e.keyCode === 13) {
        this.searchContacts();
      }
    });

    // Status filter
    $("#contactStatusFilter").on("change", () => {
      this.statusFilter = $("#contactStatusFilter").val();
      this.currentPage = 1;
      this.loadContacts();
    });

    // Pagination
    $(document).on("click", ".pagination a", (e) => {
      e.preventDefault();
      const page = $(e.currentTarget).data("page");
      if (page) {
        this.currentPage = page;
        this.loadContacts();
      }
    });
  }

  /**
   * Load contacts from API
   */
  async loadContacts() {
    try {
      this.showLoading();

      const params = {
        page: this.currentPage,
        limit: this.limit,
      };

      if (this.searchTerm) {
        params.search = this.searchTerm;
      }

      if (this.statusFilter) {
        params.status = this.statusFilter;
      }

      const data = await contactAPI.getAllContacts(params);

      if (data.success) {
        this.renderContacts(data.data.contacts || []);
        this.renderPagination(data.data.pagination);
      } else {
        this.showError("Failed to load contacts");
      }

      this.hideLoading();
    } catch (error) {
      console.error("Error loading contacts:", error);
      this.showError("Error loading contacts. Please try again.");
      this.hideLoading();
    }
  }

  /**
   * Render contacts in table
   */
  renderContacts(contacts) {
    const tbody = $("#contactTable tbody");
    tbody.empty();

    if (!contacts || contacts.length === 0) {
      tbody.append(`
                <tr>
                    <td colspan="6" class="text-center">
                        <p class="text-muted">No contacts found</p>
                    </td>
                </tr>
            `);
      return;
    }

    contacts.forEach((contact) => {
      const statusBadge = this.getStatusBadge(contact.status);
      const date = new Date(contact.createdAt).toLocaleDateString();
      
      const row = `
                <tr>
                    <td>
                        <div class="contact-info">
                            <h6 class="mb-1">${this.escapeHtml(contact.name || '')}</h6>
                            <small class="text-muted">${this.escapeHtml(contact.email || '')}</small>
                        </div>
                    </td>
                    <td>
                        <div class="contact-info">
                            <p class="mb-0">${this.escapeHtml(contact.phone || 'N/A')}</p>
                        </div>
                    </td>
                    <td>
                        <div class="contact-info">
                            <h6 class="mb-1">${this.escapeHtml(contact.subject || '')}</h6>
                        </div>
                    </td>
                    <td>
                        <div class="contact-info">
                            <p class="text-muted mb-0" style="font-size: 0.875rem; max-width: 300px; overflow: hidden; text-overflow: ellipsis;">
                              ${this.escapeHtml(contact.message || '')}
                            </p>
                        </div>
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                        <small class="text-muted">${date}</small>
                    </td>
                </tr>
            `;
      tbody.append(row);
    });
  }

  /**
   * Get status badge HTML
   */
  getStatusBadge(status) {
    const badges = {
      'new': '<span class="badge bg-primary">New</span>',
      'read': '<span class="badge bg-info">Read</span>',
      'replied': '<span class="badge bg-success">Replied</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
  }

  /**
   * Render pagination
   */
  renderPagination(paginationData) {
    const pagination = $("#contactPagination");
    pagination.empty();

    if (!paginationData || paginationData.pages <= 1) {
      return;
    }

    const { page, pages } = paginationData;

    let paginationHTML = '<ul class="pagination justify-content-center">';

    // Previous button
    paginationHTML += `
            <li class="page-item ${page === 1 ? "disabled" : ""}">
                <a class="page-link" href="#" data-page="${page - 1}">Previous</a>
            </li>
        `;

    // Page numbers
    for (let i = 1; i <= pages; i++) {
      paginationHTML += `
                <li class="page-item ${i === page ? "active" : ""}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
    }

    // Next button
    paginationHTML += `
            <li class="page-item ${page === pages ? "disabled" : ""}">
                <a class="page-link" href="#" data-page="${page + 1}">Next</a>
            </li>
        `;

    paginationHTML += "</ul>";
    pagination.html(paginationHTML);
  }

  /**
   * Search contacts
   */
  searchContacts() {
    this.searchTerm = $("#contactSearch").val().trim();
    this.currentPage = 1;
    this.loadContacts();
  }

  /**
   * Show loading state
   */
  showLoading() {
    const tbody = $("#contactTable tbody");
    tbody.html(`
            <tr>
                <td colspan="6" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="sr-only">Loading...</span>
                    </div>
                </td>
            </tr>
        `);
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    // Loading is replaced by renderContacts
  }

  /**
   * Show error message
   */
  showError(message) {
    if (typeof AdminApp !== 'undefined' && AdminApp.showToast) {
      AdminApp.showToast(message, "error");
    } else {
      alert(message);
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
  }
}

// Initialize Contact Manager when DOM is ready
let contactManager;
document.addEventListener("DOMContentLoaded", function () {
  if (document.getElementById("contactTable")) {
    contactManager = new ContactManager();
    contactManager.init();
  }
});

