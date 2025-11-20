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
      // parse productId
      const params = new URLSearchParams(window.location.search);
      const productId = params.get("productId");
      if (!productId) {
        this.showError("Missing productId in URL");
        return;
      }
      this.editingProductId = productId;

      // Load categories first
      const cats = await categoryAPI.getCategories({ limit: 100 });
      if (cats?.success) {
        this.renderCategorySelect(cats.data.categories || []);
      }

      // Load product details
      const data = await productAPI.getProductById(productId);
      if (data.success && data.data.product) {
        this.populateForm(data.data.product);
      } else {
        this.showError("Failed to load product details");
      }
    } catch (err) {
      console.error(err);
      this.showError("Error loading product details");
    }
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
    $("#validationCustom01").val(product.name || "");
    $("#validationCustomtitle").val(product.stock || "");
    $("#categorySelect").val(product.category?._id || product.category || "");
    $("#validationCustom02").val(product.price || "");
    // short description
    $("textarea[name='shortDescription']").val(product.shortDescription || "");
    // description
    try {
      if (window.CKEDITOR && CKEDITOR.instances && CKEDITOR.instances.editor1) {
        CKEDITOR.instances.editor1.setData(product.description || "");
      } else {
        $("#productDescription").val(product.description || "");
      }
    } catch (err) {}
    // status
    if (product.status === "enabled" || product.status === true) {
      $("#edo-ani").prop("checked", true);
    } else if (product.status === "disabled" || product.status === false) {
      $("#edo-ani1").prop("checked", true);
    }
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
    alert(message);
  }

  showError(message) {
    alert(message);
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
  const editProductManager = new EditProductManager();
  editProductManager.init();
  window.editProductManager = editProductManager;
});
