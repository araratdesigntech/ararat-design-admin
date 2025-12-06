/**
 * Edit Product Manager
 * Handles UI interactions for product management
 */

class EditProductManager {
  constructor() {
    this.editingProductId = null;
    this.selectedFiles = [];
  }

  init() {
    this.bindEvents();
    this.bootstrap();
  }

  bindEvents() {
    $("#productForm").on("submit", async (e) => {
      e.preventDefault();
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

    $("#productImages").on("change", (e) => {
      this.handleFilesAdded(e.target.files);
    });
  }

  async bootstrap() {
    try {
      // Wait for AdminApp to be available
      await this.waitForAdminApp();
      
      // parse productId
      const params = new URLSearchParams(window.location.search);
      const productId = params.get("productId");
      if (!productId) {
        this.showError("Missing productId in URL. Please navigate from the product list.");
        return;
      }
      this.editingProductId = productId;

      // Load categories first
      try {
        const cats = await categoryAPI.getCategories({ limit: 100 });
        if (cats?.success) {
          this.renderCategorySelect(cats.data.categories || []);
        }
      } catch (catError) {
        console.error("Error loading categories:", catError);
        // Continue even if categories fail to load
      }

      // Load product details
      const data = await productAPI.getProductById(productId);
      console.log("Product data received:", data);
      
      // Handle different response structures
      let product = null;
      if (data.success) {
        if (data.data?.product) {
          product = data.data.product;
        } else if (data.data && !data.data.product) {
          // Product might be directly in data
          product = data.data;
        } else if (data.product) {
          // Alternative structure
          product = data.product;
        }
      }
      
      if (product) {
        console.log("Product to populate:", product);
        this.populateForm(product);
      } else {
        const errorMsg = data.message || "Failed to load product details";
        this.showError(errorMsg);
        console.error("Failed to load product. Response:", data);
      }
    } catch (err) {
      console.error("Error in bootstrap:", err);
      this.showError(err.message || "Error loading product details. Please check the console for details.");
    }
  }
  
  waitForAdminApp() {
    return new Promise((resolve) => {
      if (window.AdminApp) {
        resolve();
        return;
      }
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        if (window.AdminApp) {
          clearInterval(checkInterval);
          resolve();
        } else if (attempts > 50) {
          // Wait up to 5 seconds (50 * 100ms)
          clearInterval(checkInterval);
          console.warn("AdminApp not available after waiting, continuing anyway...");
          resolve();
        }
      }, 100);
    });
  }

  renderCategorySelect(categories) {
    const select = document.getElementById("categorySelect");
    select
      .querySelectorAll("option:not(:first-child)")
      .forEach((opt) => opt.remove());
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category._id;
      option.textContent = category.name;
      select.appendChild(option);
    });
  }

  populateForm(product) {
    console.log('Populating form with product:', product);
    
    // Basic fields
    $("#validationCustom01").val(product.name || "");
    $("#validationCustomtitle").val(product.stock || "");
    $("#categorySelect").val(product.category?._id || product.category || "");
    $("#validationCustom02").val(product.price || "");
    
    // short description
    $("textarea[name='shortDescription']").val(product.shortDescription || "");
    
    // description - wait for CKEditor to be ready
    const setDescription = () => {
      try {
        if (window.CKEDITOR && CKEDITOR.instances && CKEDITOR.instances.editor1) {
          CKEDITOR.instances.editor1.setData(product.description || "");
        } else {
          $("#productDescription").val(product.description || "");
          // Try again after a short delay if CKEditor not ready
          setTimeout(setDescription, 100);
        }
      } catch (err) {
        console.error('Error setting description:', err);
      }
    };
    setDescription();
    
    // status
    if (product.status === "enabled" || product.status === true || product.status === "active") {
      $("#edo-ani").prop("checked", true);
    } else if (product.status === "disabled" || product.status === false || product.status === "inactive") {
      $("#edo-ani1").prop("checked", true);
    }
    
    // Handle existing product images
    // Product can have productImages (array) or productImage (single string)
    let imageUrls = [];
    if (product.productImages && Array.isArray(product.productImages) && product.productImages.length > 0) {
      // productImages is an array of objects with url property
      imageUrls = product.productImages.map(img => img.url || img).filter(Boolean);
    } else if (product.productImage) {
      // Single productImage (backward compatibility)
      imageUrls = [product.productImage];
    } else if (product.images && Array.isArray(product.images)) {
      // Alternative images field
      imageUrls = product.images.map(img => img.url || img).filter(Boolean);
    } else if (product.image) {
      // Alternative single image field
      imageUrls = [product.image];
    }
    
    if (imageUrls.length > 0) {
      this.renderExistingImages(imageUrls);
    }
  }
  
  renderExistingImages(imageUrls) {
    const container = document.getElementById("imagePreviewContainer");
    if (!container) return;
    
    // Clear existing previews
    container.innerHTML = "";
    
    // Store existing image URLs for reference
    this.existingImages = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
    
    imageUrls.forEach((imageUrl, idx) => {
      if (!imageUrl) return;
      
      const col = document.createElement("div");
      col.className = "col-auto";
      col.innerHTML = `
        <div style="position:relative;width:90px;height:90px;border:1px solid #eee;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#fafafa">
          <img src="${imageUrl}" alt="existing image ${idx + 1}" style="max-width:100%;max-height:100%;object-fit:cover"/>
          <button type="button" data-image-index="${idx}" class="btn btn-sm btn-light existing-image-remove" style="position:absolute;top:4px;right:4px;padding:2px 6px;line-height:1;border-radius:6px">×</button>
          <span class="badge badge-info" style="position:absolute;bottom:4px;left:4px;font-size:10px;padding:2px 4px">Existing</span>
        </div>
      `;
      container.appendChild(col);
    });
    
    // Handle remove buttons for existing images
    container.querySelectorAll('.existing-image-remove').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-image-index'));
        if (this.existingImages && this.existingImages[idx]) {
          // Mark as removed (we'll handle this in save)
          if (!this.removedImages) this.removedImages = [];
          this.removedImages.push(this.existingImages[idx]);
          e.currentTarget.closest('.col-auto').remove();
        }
      });
    });
  }

  async saveProduct() {
    const form = document.getElementById("productForm");
    const formData = new FormData(form);
    const submitBtn = $("#productSubmit");
    submitBtn
      .prop("disabled", true)
      .html('<span class="spinner-border spinner-border-sm me-2"></span>Saving...');
    try {
      const result = await productAPI.updateProduct(this.editingProductId, formData);
      if (result.success) {
        this.showSuccess("Product updated successfully");
      } else {
        this.showError(result.message || "Failed to update product");
      }
    } catch (error) {
      console.error("Error saving product:", error);
      this.showError("Error saving product. Please try again.");
    } finally {
      submitBtn.prop("disabled", false).html("Update");
    }
  }

  showSuccess(message) {
    if (window.AdminApp && window.AdminApp.showAlert) {
      window.AdminApp.showAlert('success', message);
    } else {
      alert(message);
    }
  }

  showError(message) {
    if (window.AdminApp && window.AdminApp.showAlert) {
      window.AdminApp.showAlert('error', message);
    } else {
      alert(message);
    }
  }
}

EditProductManager.prototype.handleFilesAdded = function (fileList) {
  const newFiles = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
  const key = (f) => `${f.name}|${f.size}`;
  const existing = new Set(this.selectedFiles.map(key));
  newFiles.forEach((f) => { if (!existing.has(key(f))) this.selectedFiles.push(f); });
  this.updateInputFilesFromSelected();
  this.renderPreviews();
};

EditProductManager.prototype.updateInputFilesFromSelected = function () {
  const dt = new DataTransfer();
  this.selectedFiles.forEach((f) => dt.items.add(f));
  const input = document.getElementById("productImages");
  if (input) input.files = dt.files;
};

EditProductManager.prototype.removeSelectedFileAt = function (index) {
  if (index < 0 || index >= this.selectedFiles.length) return;
  this.selectedFiles.splice(index, 1);
  this.updateInputFilesFromSelected();
  this.renderPreviews();
};

EditProductManager.prototype.renderPreviews = function () {
  const container = document.getElementById("imagePreviewContainer");
  if (!container) return;
  container.innerHTML = "";
  this.selectedFiles.forEach((file, idx) => {
    const url = URL.createObjectURL(file);
    const col = document.createElement("div");
    col.className = "col-auto";
    col.innerHTML = `
      <div style=\"position:relative;width:90px;height:90px;border:1px solid #eee;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#fafafa\">
        <img src=\"${url}\" alt=\"preview\" style=\"max-width:100%;max-height:100%;object-fit:cover\"/>
        <button type=\"button\" data-index=\"${idx}\" class=\"btn btn-sm btn-light\" style=\"position:absolute;top:4px;right:4px;padding:2px 6px;line-height:1;border-radius:6px\">×</button>
      </div>
    `;
    container.appendChild(col);
    const img = col.querySelector("img");
    img.onload = () => URL.revokeObjectURL(url);
  });
  container.querySelectorAll('button[data-index]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const i = parseInt(e.currentTarget.getAttribute('data-index'));
      this.removeSelectedFileAt(i);
    });
  });
};

// Initialize when document is ready
$(document).ready(() => {
  // Wait for AdminApp to be available before initializing
  const waitForAdminApp = () => {
    if (window.AdminApp) {
      const editProductManager = new EditProductManager();
      editProductManager.init();
      window.editProductManager = editProductManager;
    } else {
      setTimeout(waitForAdminApp, 100);
    }
  };
  waitForAdminApp();
});
