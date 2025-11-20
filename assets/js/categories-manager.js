/**
 * Category Manager
 * Handles UI interactions for category management
 */

class CategoryManager {
  constructor() {
    this.currentPage = 1;
    this.limit = 10;
    this.searchTerm = "";
    this.sortBy = "createdAt";
    this.editingCategoryId = null;
  }

  /**
   * Initialize the manager
   */
  init() {
    this.bindEvents();
    this.loadCategories();
  }

  /**
   * Bind all event listeners
   */
  bindEvents() {
    // Search functionality
    $("#categorySearch").on("keyup", (e) => {
      if (e.key === "Enter" || e.keyCode === 13) {
        this.searchCategories();
      }
    });

    // Pagination
    $(document).on("click", ".pagination a", (e) => {
      e.preventDefault();
      const page = $(e.currentTarget).data("page");
      if (page) {
        this.currentPage = page;
        this.loadCategories();
      }
    });

    // Modal events
    $("#addCategoryModal").on("hidden.bs.modal", () => {
      this.resetModal();
    });

    // Form submission
    $("#categoryForm").on("submit", async (e) => {
      e.preventDefault();
      await this.saveCategory();
    });

    // Close modal btn
    $("#cancelCategoryModalBtn").on("click", () => {
      this.loadCategories();
    });

    // Delete buttons
    $(document).on("click", ".btn-delete-category", async (e) => {
      await this.deleteCategory(e);
    });

    // Edit buttons
    $(document).on("click", ".btn-edit-category", async (e) => {
      await this.editCategory(e);
    });
  }

  /**
   * Load categories from API
   */
  async loadCategories() {
    try {
      this.showLoading();

      const params = {
        page: this.currentPage,
        limit: this.limit,
        sort: this.sortBy,
      };

      if (this.searchTerm) {
        params.search = this.searchTerm;
      }

      const data = await categoryAPI.getCategories(params);

      if (data.success) {
        this.renderCategories(data.data.categories);
        this.renderPagination(data.data);
      } else {
        this.showError("Failed to load categories");
      }

      this.hideLoading();
    } catch (error) {
      console.error("Error loading categories:", error);
      this.showError("Error loading categories. Please try again.");
      this.hideLoading();
    }
  }

  /**
   * Render categories in table
   */
  renderCategories(categories) {
    const tbody = $("#categoryTable tbody");
    tbody.empty();

    if (!categories || categories.length === 0) {
      tbody.append(`
                <tr>
                    <td colspan="3" class="text-center">
                        <p class="text-muted">No categories found</p>
                    </td>
                </tr>
            `);
      return;
    }

    categories.forEach((category) => {
      const row = `
                <tr>
                    <td>
                        <img 
                            src="${
                              category.image ||
                              "assets/images/digital-product/graphic-design.png"
                            }" 
                            alt="${category.name}"
                            class="category-image"
                            style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;"
                        />
                    </td>
                    <td>
                        <div class="category-info">
                            <h6 class="mb-1">${category.name}</h6>
                            
                        </div>
                    </td>
                    <td>
                        <div class="category-info">
                            <p class="text-muted mb-0" style="font-size: 0.875rem;">${
                              category.description || ""
                            }</p>
                        </div>
                    </td>
                    <td>
                        <a href="javascript:void(0)" 
                           class="btn-edit-category" 
                           data-id="${category._id}"
                           title="Edit">
                            <i class="fa fa-edit me-2" style="color: #007bff;"></i>
                        </a>
                        <a href="javascript:void(0)" 
                           class="btn-delete-category" 
                           data-id="${category._id}"
                           data-name="${category.name}"
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
   * Render pagination
   */
  renderPagination(paginationData) {
    const pagination = $("#categoryPagination");
    pagination.empty();

    if (!paginationData || paginationData.totalPages <= 1) {
      return;
    }

    const { currentPage, totalPages } = paginationData;

    let paginationHTML = '<ul class="pagination justify-content-center">';

    // Previous button
    paginationHTML += `
            <li class="page-item ${currentPage.page === 1 ? "disabled" : ""}">
                <a class="page-link" href="#" data-page="${
                  currentPage.page - 1
                }">Previous</a>
            </li>
        `;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      paginationHTML += `
                <li class="page-item ${i === currentPage.page ? "active" : ""}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
    }

    // Next button
    paginationHTML += `
            <li class="page-item ${
              currentPage.page === totalPages ? "disabled" : ""
            }">
                <a class="page-link" href="#" data-page="${
                  currentPage.page + 1
                }">Next</a>
            </li>
        `;

    paginationHTML += "</ul>";
    pagination.html(paginationHTML);
  }

  /**
   * Search categories
   */
  searchCategories() {
    this.searchTerm = $("#categorySearch").val().trim();
    this.currentPage = 1;
    this.loadCategories();
  }

  /**
   * Save category (create or update)
   */
  async saveCategory() {
    const form = document.getElementById("categoryForm");
    const formData = new FormData(form);

    const submitBtn = $("#categorySubmit");
    submitBtn
      .prop("disabled", true)
      .html(
        '<span class="spinner-border spinner-border-sm me-2"></span>Saving...'
      );

    try {
      let result;

      if (this.editingCategoryId) {
        // Update existing category
        result = await categoryAPI.updateCategory(
          this.editingCategoryId,
          formData
        );
      } else {
        // Create new category
        result = await categoryAPI.createCategory(formData);
      }

      if (result.success) {
        $("#addCategoryModal").modal("hide");
        this.showSuccess(
          this.editingCategoryId
            ? "Category updated successfully"
            : "Category created successfully"
        );
        this.loadCategories();
        this.resetModal();
      } else {
        this.showError(result.message || "Failed to save category");
      }
    } catch (error) {
      console.error("Error saving category:", error);
      this.showError("Error saving category. Please try again.");
    } finally {
      submitBtn.prop("disabled", false);
      submitBtn.html(
        this.editingCategoryId ? "Update Category" : "Add Category"
      );
    }
  }

  /**
   * Edit category
   */
  async editCategory(e) {
    const categoryId = $(e.currentTarget).data("id");
    this.editingCategoryId = categoryId;

    try {
      this.showLoading();
      const data = await categoryAPI.getCategoryById(categoryId);

      if (data.success && data.data.category) {
        const category = data.data.category;

        // Populate form
        $("#categoryName").val(category.name);
        $("#categoryDescription").val(category.description || "");

        // Show current image
        if (category.image) {
          $("#currentCategoryImage")
            .html(
              `
                        <img src="${category.image}" 
                             alt="${category.name}" 
                             style="max-width: 200px; max-height: 200px; border-radius: 8px; margin-bottom: 10px;">
                        <p class="text-muted small">Current image</p>
                    `
            )
            .show();
        }

        // Update modal title
        $("#modalTitle").text("Edit Category");
        $("#categorySubmit").text("Update Category");

        // Show modal
        $("#addCategoryModal").modal("show");
      } else {
        this.showError("Failed to load category details");
      }

      this.hideLoading();
    } catch (error) {
      console.error("Error editing category:", error);
      this.showError("Error loading category details");
      this.hideLoading();
    }
  }

  /**
   * Delete category
   */
  async deleteCategory(e) {
    const categoryId = $(e.currentTarget).data("id");
    const categoryName = $(e.currentTarget).data("name");

    if (
      !confirm(
        `Are you sure you want to delete "${categoryName}"?\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      this.showLoading();
      const result = await categoryAPI.deleteCategory(categoryId);

      if (result.success) {
        this.showSuccess("Category deleted successfully");
        this.loadCategories();
      } else {
        this.showError(result.message || "Failed to delete category");
      }

      this.hideLoading();
    } catch (error) {
      console.error("Error deleting category:", error);
      this.showError("Error deleting category. Please try again.");
      this.hideLoading();
    }
  }

  /**
   * Reset modal
   */
  resetModal() {
    this.editingCategoryId = null;
    $("#categoryForm")[0].reset();
    $("#currentCategoryImage").hide();
    $("#modalTitle").text("Add New Category");
    $("#categorySubmit").text("Add Category");
  }

  /**
   * Show loading indicator
   */
  showLoading() {
    $("#categoryTable tbody").html(`
            <tr>
                <td colspan="3" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="sr-only">Loading...</span>
                    </div>
                </td>
            </tr>
        `);
  }

  /**
   * Hide loading indicator
   */
  hideLoading() {
    // Loading is replaced by actual data
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    // You can implement toast notifications here
    alert(message);
  }

  /**
   * Show error message
   */
  showError(message) {
    // You can implement toast notifications here
    alert(message);
  }
}

// Initialize when document is ready
$(document).ready(() => {
  const categoryManager = new CategoryManager();
  categoryManager.init();
  window.categoryManager = categoryManager; // Make it globally accessible
});
