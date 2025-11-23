/**
 * Product Manager
 * Handles UI interactions for product management
 */

class ProductManager {
  constructor() {
    this.currentPage = 1;
    this.limit = 10;
    this.searchTerm = "";
    this.sortBy = "createdAt";
    this.editingProductId = null;
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
    // Search functionality
    $("#productSearch").on("keyup", (e) => {
      if (e.key === "Enter" || e.keyCode === 13) {
        this.searchProducts();
      }
    });

    // Pagination
    $(document).on("click", ".pagination a", (e) => {
      e.preventDefault();
      const page = $(e.currentTarget).data("page");
      if (page) {
        this.currentPage = page;
        this.loadProducts();
      }
    });

    // Form submission
    $("#productForm").on("submit", async (e) => {
      e.preventDefault();
      await this.saveProduct();
    });

    // Close modal btn
    $("#cancelProductModalBtn").on("click", () => {
      this.loadProducts();
    });

    // Delete buttons
    $(document).on("click", ".btn-delete-product", async (e) => {
      await this.deleteProduct(e);
    });

    // Edit buttons
    $(document).on("click", ".btn-edit-product", async (e) => {
      await this.editProduct(e);
    });
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

      const data = await productAPI.getProducts(params);

      console.log('Products API response:', data); // Debug log

      if (data.success && data.data) {
        const products = data.data.products || data.data.results || [];
        this.renderProducts(products);
        this.renderPagination(data.data);
      } else {
        console.error('API returned error:', data);
        this.showError(data.message || "Failed to load products");
      }

      this.hideLoading();
    } catch (error) {
      console.error("Error loading products:", error);
      this.showError("Error loading products. Please try again.");
      this.hideLoading();
    }
  }

  /**
   * Render products in table
   */
  renderProducts(products) {
    const tbody = $("#productTable tbody");
    tbody.empty();

    if (!products || products.length === 0) {
      tbody.append(`
                  <tr>
                      <td colspan="6" class="text-center">
                          <p class="text-muted">No products found</p>
                      </td>
                  </tr>
              `);
      return;
    }

    products.forEach((product) => {
      // Safely get product image
      let productImageUrl = "assets/images/digital-product/graphic-design.png";
      if (product.productImages && Array.isArray(product.productImages) && product.productImages.length > 0) {
        const firstImage = product.productImages[0];
        if (firstImage && firstImage.url) {
          productImageUrl = firstImage.url;
        }
      } else if (product.productImage) {
        // Fallback to productImage if productImages is not available
        productImageUrl = product.productImage;
      }

      // Safely get category name
      let categoryName = "N/A";
      if (product.category) {
        if (typeof product.category === 'string') {
          categoryName = product.category;
        } else if (product.category.name) {
          categoryName = product.category.name;
        }
      }

      // Safely format price
      const price = product.price ? (typeof product.price === 'number' ? product.price.toFixed(2) : product.price) : "0.00";

      const row = `

        <tr>
                            <td>
                              <img 
                                  src="${productImageUrl}" 
                                  alt="${product.name || 'Product'}"
                                  class="product-image"
                                  style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;"
                              />
                            </td>

                            <td data-field="name">${product.name || 'N/A'}</td>

                            <td data-field="price">₦${price}</td>

                            <td class="order-success" data-field="status">
                              <span>Success</span>
                            </td>

                            <td data-field="category">${categoryName}</td>

                            <td>
                              <a href="product-detail.html?productId=${
                                product._id
                              }">
                                <i class="fa fa-eye" title="View"></i>
                              </a>

                              <a href="edit-product.html?productId=${
                                product._id
                              }" 
                                class="btn-edit-product" 
                                data-id="${product._id}"
                                title="Edit">
                                <i class="fa fa-edit me-2" style="color: #007bff;"></i>
                              </a>

                              <a href="javascript:void(0)" 
                                class="btn-delete-product" 
                                data-id="${product._id}"
                                data-name="${product.name || 'Product'}"
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
    const pagination = $("#productPagination");
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
                  <li class="page-item ${
                    i === currentPage.page ? "active" : ""
                  }">
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
   * Search products
   */
  searchProducts() {
    this.searchTerm = $("#productSearch").val().trim();
    this.currentPage = 1;
    this.loadProducts();
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

      if (this.editingProductId) {
        // Update existing product
        result = await productAPI.updateProduct(
          this.editingProductId,
          formData
        );
      } else {
        // Create new product
        result = await productAPI.createProduct(formData);
      }

      if (result.success) {
        $("#addProductModal").modal("hide");
        this.showSuccess(
          this.editingProductId
            ? "Product updated successfully"
            : "Product created successfully"
        );
        this.loadProducts();
        this.resetModal();
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
   * Edit product
   */
  async editProduct(e) {
    const productId = $(e.currentTarget).data("id");
    this.editingProductId = productId;

    try {
      this.showLoading();
      const data = await productAPI.getProductById(productId);

      if (data.success && data.data.product) {
        const product = data.data.product;

        // Populate form
        $("#productName").val(product.name);
        $("#productDescription").val(product.description || "");

        // Show current image
        if (product.image) {
          $("#currentProductImage")
            .html(
              `
                          <img src="${product.image}" 
                               alt="${product.name}" 
                               style="max-width: 200px; max-height: 200px; border-radius: 8px; margin-bottom: 10px;">
                          <p class="text-muted small">Current image</p>
                      `
            )
            .show();
        }

        // Update modal title
        $("#modalTitle").text("Edit Product");
        $("#productSubmit").text("Update Product");

        // Show modal
        $("#addProductModal").modal("show");
      } else {
        this.showError("Failed to load product details");
      }

      this.hideLoading();
    } catch (error) {
      console.error("Error editing product:", error);
      this.showError("Error loading product details");
      this.hideLoading();
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(e) {
    const productId = $(e.currentTarget).data("id");
    const productName = $(e.currentTarget).data("name");

    if (
      !confirm(
        `Are you sure you want to delete "${productName}"?\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      this.showLoading();
      const result = await productAPI.deleteProduct(productId);

      if (result.success) {
        this.showSuccess("Product deleted successfully");
        this.loadProducts();
      } else {
        this.showError(result.message || "Failed to delete product");
      }

      this.hideLoading();
    } catch (error) {
      console.error("Error deleting product:", error);
      this.showError("Error deleting product. Please try again.");
      this.hideLoading();
    }
  }

  /**
   * Reset modal
   */
  resetModal() {
    this.editingProductId = null;
    $("#productForm")[0].reset();
    $("#currentProductImage").hide();
    $("#modalTitle").text("Add New Product");
    $("#productSubmit").text("Add Product");
  }

  /**
   * Show loading indicator
   */
  showLoading() {
    $("#productTable tbody").html(`
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
   * Hide loading indicator
   */
  hideLoading() {
    // Loading is replaced by actual data
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

// Initialize when document is ready
$(document).ready(() => {
  if (window.AdminApp) {
    AdminApp.ensureAuth();
  }
  const productManager = new ProductManager();
  productManager.init();
  window.productManager = productManager; // Make it globally accessible
});
