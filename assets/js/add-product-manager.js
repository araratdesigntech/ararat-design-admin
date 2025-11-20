/**
 * Product Manager
 * Handles UI interactions for product management
 */

class AddProductManager {
  constructor() {
    this.selectedFiles = [];
  }

  /**
   * Initialize the manager
   */
  init() {
    this.bindEvents();
    this.loadProducts();
  }

  /**
   * Bind all event listeners
   */
  bindEvents() {
    // Form submission
    $("#productForm").on("submit", async (e) => {
      e.preventDefault();
      // Sync CKEditor content (if present) to hidden textarea name=description
      try {
        let desc = "";
        if (window.CKEDITOR && CKEDITOR.instances && CKEDITOR.instances.editor1) {
          desc = CKEDITOR.instances.editor1.getData();
        }
        if (!desc) {
          desc = $("#editor1").val() || "";
        }
        $("#productDescription").val(desc);
      } catch (err) {}
      await this.saveProduct();
    });

    // Image previews
    $("#productImages").on("change", (e) => {
      this.handleFilesAdded(e.target.files);
    });

    // Close modal btn
    $("#cancelAddProductBtn").on("click", () => {});
  }

  /**
   * Load products from API
   */
  async loadProducts() {
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
      console.log(data.data.categories, "data.data.categories");
      if (data.success) {
        this.renderCategorySelect(data.data.categories);
      } else {
        this.showError("Failed to load products");
      }

      this.hideLoading();
    } catch (error) {
      console.error("Error loading categories:", error);
      this.showError("Error loading categories. Please try again.");
      this.hideLoading();
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Render products in table
   */
  renderCategorySelect(categories) {
    const select = document.getElementById("categorySelect");

    // Clear any existing dynamic options (keep the first default one)
    select
      .querySelectorAll("option:not(:first-child)")
      .forEach((opt) => opt.remove());

    // Loop through categories and append them
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category._id; // or category.id depending on your API
      option.textContent = category.name;
      select.appendChild(option);
    });
  }

  /**
   * Save product (create or update)
   */
  async saveProduct() {
    const form = document.getElementById("productForm");
    const formData = new FormData(form);

    const submitBtn = $("#productSubmit");
    submitBtn
      .prop("disabled", true)
      .html(
        '<span class="spinner-border spinner-border-sm me-2"></span>Saving...'
      );

    try {
      let result;

      // Create new product
      result = await productAPI.createProduct(formData);

      if (result.success) {
        this.showSuccess("Product created successfully");

        this.resetForm();
      } else {
        this.showError(result.message || "Failed to save product");
      }
    } catch (error) {
      console.error("Error saving product:", error);
      this.showError("Error saving product. Please try again.");
    } finally {
      submitBtn.prop("disabled", false);
      submitBtn.html(this.editingProductId ? "Update Product" : "Add Product");
    }
  }

  /**
   * Reset Form
   */
  resetForm() {
    $("#productForm")[0].reset();
    $("#currentProductImage").hide();
    $("#imagePreviewContainer").empty();
    this.selectedFiles = [];
    // clear input files completely
    const input = document.getElementById("productImages");
    if (input) input.value = "";
  }

  /**
   * Show loading indicator
   */
  showLoading() {
    // no-op on add page
  }

  /**
   * Hide loading indicator
   */
  hideLoading() {
    // no-op on add page
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    if (window.AdminApp) {
      AdminApp.showToast(message, 'success');
      return;
    }
    alert(message);
  }

  /**
   * Show error message
   */
  showError(message) {
    if (window.AdminApp) {
      AdminApp.showToast(message, 'danger');
      return;
    }
    alert(message);
  }
}

AddProductManager.prototype.handleFilesAdded = function (fileList) {
  const newFiles = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
  // merge without duplicates (name+size heuristic)
  const key = (f) => `${f.name}|${f.size}`;
  const existing = new Set(this.selectedFiles.map(key));
  newFiles.forEach((f) => {
    if (!existing.has(key(f))) this.selectedFiles.push(f);
  });
  this.updateInputFilesFromSelected();
  this.renderPreviews();
};

AddProductManager.prototype.updateInputFilesFromSelected = function () {
  const dt = new DataTransfer();
  this.selectedFiles.forEach((f) => dt.items.add(f));
  const input = document.getElementById("productImages");
  if (input) input.files = dt.files;
};

AddProductManager.prototype.removeSelectedFileAt = function (index) {
  if (index < 0 || index >= this.selectedFiles.length) return;
  this.selectedFiles.splice(index, 1);
  this.updateInputFilesFromSelected();
  this.renderPreviews();
};

AddProductManager.prototype.renderPreviews = function () {
  const container = document.getElementById("imagePreviewContainer");
  if (!container) return;
  container.innerHTML = "";
  this.selectedFiles.forEach((file, idx) => {
    const url = URL.createObjectURL(file);
    const col = document.createElement("div");
    col.className = "col-auto";
    col.innerHTML = `
      <div style="position:relative;width:90px;height:90px;border:1px solid #eee;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#fafafa">
        <img src="${url}" alt="preview" style="max-width:100%;max-height:100%;object-fit:cover"/>
        <button type="button" data-index="${idx}" class="btn btn-sm btn-light" style="position:absolute;top:4px;right:4px;padding:2px 6px;line-height:1;border-radius:6px">×</button>
      </div>
    `;
    container.appendChild(col);
    const img = col.querySelector("img");
    img.onload = () => URL.revokeObjectURL(url);
  });
  // bind remove handlers
  container.querySelectorAll('button[data-index]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const i = parseInt(e.currentTarget.getAttribute('data-index'));
      this.removeSelectedFileAt(i);
    });
  });
};

// Initialize when document is ready
$(document).ready(() => {
  if (window.AdminApp) {
    AdminApp.ensureAuth();
  }
  const addProductManager = new AddProductManager();
  addProductManager.init();
  window.addProductManager = addProductManager; // Make it globally accessible
});
