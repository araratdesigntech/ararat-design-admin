/**
 * Product Detail Manager
 * Handles loading and displaying product details
 */

(function() {
  'use strict';

  let currentProductId = null;

  // Initialize when DOM is ready
  function init() {
    const params = new URLSearchParams(window.location.search);
    currentProductId = params.get('productId');

    if (!currentProductId) {
      const loader = document.getElementById('productDetailsLoader');
      if (loader) {
        loader.innerHTML = '<div class="alert alert-danger">Missing productId in URL. Please navigate from the product list.</div>';
      }
      return;
    }

    // Wait for dependencies with timeout
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds total
    
    const checkAndLoad = () => {
      attempts++;
      
      // Check if dependencies are available
      const hasProductAPI = typeof productAPI !== 'undefined';
      const hasAdminApp = typeof window !== 'undefined' && window.AdminApp;
      
      if (hasProductAPI && hasAdminApp) {
        console.log('All dependencies loaded, loading product details...');
        loadProductDetails(currentProductId);
      } else if (attempts < maxAttempts) {
        if (attempts % 10 === 0) {
          console.log(`Waiting for dependencies... (${attempts}/${maxAttempts})`, {
            productAPI: hasProductAPI,
            AdminApp: hasAdminApp
          });
        }
        setTimeout(checkAndLoad, 100);
      } else {
        // Timeout - show error
        console.error('Dependencies not loaded after', maxAttempts, 'attempts');
        const loader = document.getElementById('productDetailsLoader');
        const imageLoader = document.getElementById('productImageLoader');
        
        if (loader) {
          loader.innerHTML = '<div class="alert alert-danger">Failed to load required scripts. Please refresh the page.<br><small>Check browser console for details</small></div>';
        }
        if (imageLoader) {
          imageLoader.innerHTML = '<div class="alert alert-danger">Failed to load required scripts.</div>';
        }
      }
    };

    // Start checking
    checkAndLoad();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already ready, but wait a bit for scripts to load
    setTimeout(init, 100);
  }

  async function loadProductDetails(productId) {
    try {
      // Show loading state
      document.getElementById('productImageLoader').style.display = 'block';
      document.getElementById('productDetailsLoader').style.display = 'block';

      // Load product data
      if (typeof productAPI === 'undefined') {
        throw new Error('ProductAPI is not available. Please ensure products-api.js is loaded.');
      }
      
      console.log('Loading product with ID:', productId);
      const data = await productAPI.getProductById(productId);
      console.log('Product data received:', data);
      console.log('Full response structure:', JSON.stringify(data, null, 2));

      // Handle different response structures
      let product = null;
      if (data && data.success) {
        // Standard structure: data.data.product
        if (data.data && data.data.product) {
          product = data.data.product;
          console.log('Found product in data.data.product');
        } 
        // Alternative: product directly in data
        else if (data.product) {
          product = data.product;
          console.log('Found product in data.product');
        }
        // Alternative: data is the product
        else if (data.data && !data.data.product && data.data._id) {
          product = data.data;
          console.log('Found product in data.data');
        }
      } else if (data && !data.success) {
        // Error response
        throw new Error(data.message || 'Failed to load product');
      } else if (data && data._id) {
        // Product might be directly the response
        product = data;
        console.log('Product is directly the response');
      }

      if (!product) {
        console.error('Product data structure:', data);
        console.error('Could not extract product from response');
        throw new Error(data?.message || 'Product not found or invalid response structure');
      }
      
      console.log('Extracted product:', product);

      // Populate product details
      populateProductDetails(product);

      // Hide loaders and show content
      const imageLoader = document.getElementById('productImageLoader');
      const detailsLoader = document.getElementById('productDetailsLoader');
      const productDetails = document.getElementById('productDetails');
      
      if (imageLoader) imageLoader.style.display = 'none';
      if (detailsLoader) detailsLoader.style.display = 'none';
      if (productDetails) productDetails.style.display = 'block';

    } catch (error) {
      console.error('Error loading product details:', error);
      console.error('Error stack:', error.stack);
      
      const imageLoader = document.getElementById('productImageLoader');
      const detailsLoader = document.getElementById('productDetailsLoader');
      
      if (imageLoader) {
        imageLoader.innerHTML = '<div class="alert alert-danger">Failed to load product images.</div>';
      }
      if (detailsLoader) {
        detailsLoader.innerHTML = `<div class="alert alert-danger">Error loading product: ${error.message || 'Unknown error'}<br><small>Check console for details</small></div>`;
      }
      
      if (window.AdminApp && window.AdminApp.showAlert) {
        window.AdminApp.showAlert('error', error.message || 'Failed to load product details');
      }
    }
  }

  function populateProductDetails(product) {
    console.log('Populating product details:', product);

    // Product Name
    const productNameEl = document.getElementById('productName');
    if (productNameEl && product.name) {
      productNameEl.textContent = product.name;
    }

    // Product Category
    const categoryEl = document.getElementById('productCategory');
    if (categoryEl) {
      const categoryName = product.category?.name || product.category || 'Uncategorized';
      categoryEl.textContent = categoryName;
    }

    // Product Stock
    const stockEl = document.getElementById('productStock');
    if (stockEl) {
      const stock = product.stock || product.stockQuantity || 'In Stock';
      stockEl.textContent = stock;
      // Update badge class based on stock
      if (typeof stock === 'number' && stock > 0) {
        stockEl.className = 'badge badge-success';
      } else if (stock === 'In Stock' || stock === 'Available') {
        stockEl.className = 'badge badge-success';
      } else {
        stockEl.className = 'badge badge-danger';
      }
    }

    // Product Description
    const descEl = document.getElementById('productDescription');
    if (descEl && product.description) {
      descEl.innerHTML = product.description;
    } else if (descEl) {
      descEl.textContent = 'No description available.';
    }

    // Product Price
    const priceEl = document.getElementById('productPrice');
    if (priceEl && product.price) {
      const formattedPrice = formatCurrency(product.price);
      priceEl.innerHTML = formattedPrice;
    }

    // Product Rating
    const rating = product.ratings || 0;
    const ratingSelect = document.getElementById('u-rating-fontawesome-o');
    if (ratingSelect) {
      ratingSelect.setAttribute('data-current-rating', rating.toString());
      // Set selected option
      const ratingValue = Math.round(rating);
      ratingSelect.value = ratingValue.toString();
    }

    const ratingTextEl = document.getElementById('productRatingText');
    if (ratingTextEl) {
      const reviewCount = product.numberOfReviews || 0;
      ratingTextEl.textContent = `(${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'})`;
    }

    // Product Images
    loadProductImages(product);

    // Edit Product Button
    const editBtn = document.getElementById('editProductBtn');
    if (editBtn) {
      editBtn.href = `edit-product.html?productId=${product._id || currentProductId}`;
    }

    // Initialize rating display after a short delay to ensure rating script is loaded
    setTimeout(() => {
      if (window.$ && $.fn.barrating) {
        $('#u-rating-fontawesome-o').barrating('show', {
          theme: 'fontawesome-stars-o',
          readonly: true
        });
      }
    }, 500);
  }

  function loadProductImages(product) {
    const mainSlider = document.getElementById('sync1');
    const thumbSlider = document.getElementById('sync2');

    if (!mainSlider || !thumbSlider) return;

    // Clear existing content
    mainSlider.innerHTML = '';
    thumbSlider.innerHTML = '';

    // Get images from product
    let images = [];
    if (product.productImages && Array.isArray(product.productImages) && product.productImages.length > 0) {
      images = product.productImages.map(img => img.url || img).filter(Boolean);
    } else if (product.productImage) {
      images = [product.productImage];
    } else if (product.images && Array.isArray(product.images)) {
      images = product.images.map(img => img.url || img).filter(Boolean);
    } else if (product.image) {
      images = [product.image];
    }

    // If no images, show placeholder
    if (images.length === 0) {
      images = ['assets/images/pro3/2.jpg']; // Fallback placeholder
    }

    // Create image slides
    images.forEach((imageUrl, index) => {
      // Main slider item
      const mainItem = document.createElement('div');
      mainItem.className = 'item';
      mainItem.innerHTML = `<img src="${imageUrl}" alt="${product.name || 'Product'} - Image ${index + 1}" class="blur-up lazyloaded" />`;
      mainSlider.appendChild(mainItem);

      // Thumbnail slider item
      const thumbItem = document.createElement('div');
      thumbItem.className = 'item';
      thumbItem.innerHTML = `<img src="${imageUrl}" alt="${product.name || 'Product'} - Thumbnail ${index + 1}" class="blur-up lazyloaded" />`;
      thumbSlider.appendChild(thumbItem);
    });

    // Hide loader and show sliders
    const imageLoader = document.getElementById('productImageLoader');
    if (imageLoader) {
      imageLoader.style.display = 'none';
    }
    mainSlider.style.display = 'block';
    thumbSlider.style.display = 'block';

    // Reinitialize owl carousel after images are loaded
    setTimeout(() => {
      if (window.$ && $.fn.owlCarousel) {
        // Destroy existing instances
        if ($('#sync1').data('owl.carousel')) {
          $('#sync1').data('owl.carousel').destroy();
        }
        if ($('#sync2').data('owl.carousel')) {
          $('#sync2').data('owl.carousel').destroy();
        }

        // Initialize main slider
        const sync1 = $('#sync1').owlCarousel({
          items: 1,
          slideSpeed: 1000,
          nav: true,
          autoplay: false,
          dots: false,
          loop: true,
          navText: ['<i class="fa fa-angle-left"></i>', '<i class="fa fa-angle-right"></i>'],
          responsiveRefreshRate: 200,
        });

        // Initialize thumbnail slider
        const sync2 = $('#sync2').owlCarousel({
          items: 4,
          slideSpeed: 1000,
          nav: true,
          autoplay: false,
          dots: false,
          loop: images.length > 4,
          margin: 10,
          navText: ['<i class="fa fa-angle-left"></i>', '<i class="fa fa-angle-right"></i>'],
          responsiveRefreshRate: 200,
          responsive: {
            0: { items: 2, margin: 5 },
            600: { items: 3, margin: 8 },
            1000: { items: 4, margin: 10 }
          }
        });

        // Sync sliders
        sync1.on('changed.owl.carousel', function(event) {
          sync2.trigger('to.owl.carousel', [event.item.index, 300]);
        });

        sync2.on('click', '.owl-item', function() {
          sync1.trigger('to.owl.carousel', [$(this).index(), 300]);
        });
      }
    }, 300);
  }

  function formatCurrency(amount) {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }
})();

