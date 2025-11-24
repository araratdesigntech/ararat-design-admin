/**
 * FAQ Manager
 * Handles UI interactions for FAQ management
 */

class FAQManager {
  constructor() {
    this.editingFAQId = null;
  }

  /**
   * Initialize the manager
   */
  init() {
    this.bindEvents();
    this.loadFAQs();
  }

  /**
   * Bind all event listeners
   */
  bindEvents() {
    // Search functionality
    $("#faqSearch").on("keyup", (e) => {
      if (e.key === "Enter" || e.keyCode === 13) {
        this.searchFAQs();
      }
    });

    // Form submission
    $("#faqForm").on("submit", async (e) => {
      e.preventDefault();
      await this.saveFAQ();
    });

    // Modal events
    $("#addFAQModal").on("hidden.bs.modal", () => {
      this.resetModal();
    });

    // Close modal btn
    $("#cancelFAQModalBtn").on("click", () => {
      this.loadFAQs();
    });

    // Delete buttons
    $(document).on("click", ".btn-delete-faq", async (e) => {
      await this.deleteFAQ(e);
    });

    // Edit buttons
    $(document).on("click", ".btn-edit-faq", async (e) => {
      await this.editFAQ(e);
    });
  }

  /**
   * Load FAQs from API
   */
  async loadFAQs() {
    try {
      this.showLoading();

      const data = await faqAPI.getAllFAQs();

      if (data.success) {
        this.renderFAQs(data.data.faqs || []);
      } else {
        this.showError("Failed to load FAQs");
      }

      this.hideLoading();
    } catch (error) {
      console.error("Error loading FAQs:", error);
      this.showError("Error loading FAQs. Please try again.");
      this.hideLoading();
    }
  }

  /**
   * Render FAQs in table
   */
  renderFAQs(faqs) {
    const tbody = $("#faqTable tbody");
    tbody.empty();

    if (!faqs || faqs.length === 0) {
      tbody.append(`
                <tr>
                    <td colspan="5" class="text-center">
                        <p class="text-muted">No FAQs found</p>
                    </td>
                </tr>
            `);
      return;
    }

    faqs.forEach((faq) => {
      const statusBadge = faq.isActive 
        ? '<span class="badge bg-success">Active</span>'
        : '<span class="badge bg-secondary">Inactive</span>';
      
      const row = `
                <tr>
                    <td>
                        <div class="faq-info">
                            <h6 class="mb-1">${this.escapeHtml(faq.question || '')}</h6>
                        </div>
                    </td>
                    <td>
                        <div class="faq-info">
                            <p class="text-muted mb-0" style="font-size: 0.875rem; max-width: 300px; overflow: hidden; text-overflow: ellipsis;">
                              ${this.escapeHtml(faq.answer || '')}
                            </p>
                        </div>
                    </td>
                    <td>
                        <span class="badge bg-info">${this.escapeHtml(faq.category || 'General')}</span>
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                        <a href="javascript:void(0)" 
                           class="btn-edit-faq" 
                           data-id="${faq._id}"
                           title="Edit">
                            <i class="fa fa-edit me-2" style="color: #007bff;"></i>
                        </a>
                        <a href="javascript:void(0)" 
                           class="btn-delete-faq" 
                           data-id="${faq._id}"
                           data-question="${this.escapeHtml(faq.question || '')}"
                           title="Delete">
                            <i class="fa fa-trash" style="color: #dc3545;"></i>
                        </a>
                    </td>
                </tr>
            `;
      tbody.append(row);
    });
  }

  /**
   * Search FAQs
   */
  searchFAQs() {
    this.loadFAQs();
  }

  /**
   * Save FAQ (create or update)
   */
  async saveFAQ() {
    const form = document.getElementById("faqForm");
    const formData = {
      question: $("#faqQuestion").val().trim(),
      answer: $("#faqAnswer").val().trim(),
      category: $("#faqCategory").val().trim() || undefined,
      order: parseInt($("#faqOrder").val()) || 0,
      isActive: $("#faqIsActive").is(":checked"),
    };

    // Validation
    if (!formData.question || formData.question.length < 10) {
      AdminApp.showToast("Question must be at least 10 characters long", "error");
      return;
    }

    if (!formData.answer || formData.answer.length < 10) {
      AdminApp.showToast("Answer must be at least 10 characters long", "error");
      return;
    }

    const submitBtn = $("#faqSubmit");
    submitBtn
      .prop("disabled", true)
      .html('<span class="spinner-border spinner-border-sm me-2"></span>Saving...');

    try {
      let result;

      if (this.editingFAQId) {
        // Update existing FAQ
        result = await faqAPI.updateFAQ(this.editingFAQId, formData);
      } else {
        // Create new FAQ
        result = await faqAPI.createFAQ(formData);
      }

      if (result.success) {
        AdminApp.showToast(
          this.editingFAQId ? "FAQ updated successfully" : "FAQ created successfully",
          "success"
        );
        $("#addFAQModal").modal("hide");
        this.resetModal();
        this.loadFAQs();
      } else {
        AdminApp.showToast(result.message || "Failed to save FAQ", "error");
      }
    } catch (error) {
      console.error("Error saving FAQ:", error);
      AdminApp.showToast("Error saving FAQ. Please try again.", "error");
    } finally {
      submitBtn.prop("disabled", false).html("Save FAQ");
    }
  }

  /**
   * Edit FAQ
   */
  async editFAQ(e) {
    const faqId = $(e.currentTarget).data("id");

    try {
      this.showLoading();
      const data = await faqAPI.getFAQById(faqId);

      if (data.success && data.data.faq) {
        const faq = data.data.faq;
        this.editingFAQId = faq._id;

        // Populate form
        $("#faqQuestion").val(faq.question || "");
        $("#faqAnswer").val(faq.answer || "");
        $("#faqCategory").val(faq.category || "");
        $("#faqOrder").val(faq.order || 0);
        $("#faqIsActive").prop("checked", faq.isActive !== false);

        // Update modal title
        $("#modalTitle").text("Edit FAQ");

        // Show modal
        $("#addFAQModal").modal("show");
      } else {
        AdminApp.showToast("Failed to load FAQ", "error");
      }

      this.hideLoading();
    } catch (error) {
      console.error("Error loading FAQ:", error);
      AdminApp.showToast("Error loading FAQ. Please try again.", "error");
      this.hideLoading();
    }
  }

  /**
   * Delete FAQ
   */
  async deleteFAQ(e) {
    const faqId = $(e.currentTarget).data("id");
    const question = $(e.currentTarget).data("question") || "this FAQ";

    if (!confirm(`Are you sure you want to delete ${question}?`)) {
      return;
    }

    try {
      const result = await faqAPI.deleteFAQ(faqId);

      if (result.success) {
        AdminApp.showToast("FAQ deleted successfully", "success");
        this.loadFAQs();
      } else {
        AdminApp.showToast(result.message || "Failed to delete FAQ", "error");
      }
    } catch (error) {
      console.error("Error deleting FAQ:", error);
      AdminApp.showToast("Error deleting FAQ. Please try again.", "error");
    }
  }

  /**
   * Reset modal
   */
  resetModal() {
    this.editingFAQId = null;
    $("#faqForm")[0].reset();
    $("#modalTitle").text("Add New FAQ");
    $("#faqIsActive").prop("checked", true);
  }

  /**
   * Show loading state
   */
  showLoading() {
    const tbody = $("#faqTable tbody");
    tbody.html(`
            <tr>
                <td colspan="5" class="text-center">
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
    // Loading is replaced by renderFAQs
  }

  /**
   * Show error message
   */
  showError(message) {
    AdminApp.showToast(message, "error");
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

// Initialize FAQ Manager when DOM is ready
let faqManager;
document.addEventListener("DOMContentLoaded", function () {
  if (document.getElementById("faqTable")) {
    faqManager = new FAQManager();
    faqManager.init();
  }
});

