(function () {
  if (!window.AdminApp) return;

  // Wait for Chart.js and DOM to be ready
  const waitForChartJS = () => {
    return new Promise((resolve) => {
      if (typeof Chart !== 'undefined' && typeof Chart === 'function') {
        console.log('[Dashboard] Chart.js already loaded');
        resolve();
      } else {
        console.log('[Dashboard] Waiting for Chart.js to load...');
        let attempts = 0;
        const checkInterval = setInterval(() => {
          attempts++;
          if (typeof Chart !== 'undefined' && typeof Chart === 'function') {
            clearInterval(checkInterval);
            console.log('[Dashboard] Chart.js loaded after', attempts * 100, 'ms');
            resolve();
          } else if (attempts > 100) { // 10 seconds timeout
            clearInterval(checkInterval);
            console.error('[Dashboard] Chart.js not loaded after 10 seconds. Chart type:', typeof Chart);
            resolve(); // Continue anyway
          }
        }, 100);
      }
    });
  };

  // Chart instances
  let revenueTrendsChart = null;
  let salesByLocationChart = null;
  let ordersByStatusChart = null;
  let topProductsChart = null;
  
  // Store chart data for resize redraws
  let chartDataCache = {
    locations: null,
    statuses: null,
    trends: null,
    products: null
  };

  const statTargets = {
    orders: document.getElementById('dashboardTotalOrders'),
    awaiting: document.getElementById('dashboardAwaitingOrders'),
    revenue: document.getElementById('dashboardRevenue'),
    products: document.getElementById('dashboardProducts'),
  };

  const recentOrdersContainer = document.getElementById('recentOrdersBody');
  const salesLocationList = document.getElementById('salesLocationList');
  const ordersStatusList = document.getElementById('ordersStatusList');

  const setStat = (key, value) => {
    if (statTargets[key]) {
      statTargets[key].textContent = value;
    }
  };

  const renderRecentOrders = (orders = []) => {
    if (!recentOrdersContainer) return;
    if (!orders.length) {
      recentOrdersContainer.innerHTML = `<tr><td colspan="4" class="text-center py-3">No recent orders.</td></tr>`;
      return;
    }
    recentOrdersContainer.innerHTML = '';
    orders.slice(0, 5).forEach((order) => {
      const statusBadge = order.orderStatus === 'awaiting_payment' ? 'badge-warning' :
                         order.orderStatus === 'delivered' ? 'badge-success' :
                         order.orderStatus === 'cancelled' ? 'badge-danger' :
                         order.orderStatus === 'processing' ? 'badge-info' : 'badge-secondary';
      
      recentOrdersContainer.insertAdjacentHTML(
        'beforeend',
        `<tr>
          <td><a href="order-detail.html?id=${order._id || ''}">${order.invoiceNumber || order._id?.slice(-8) || '—'}</a></td>
          <td>${AdminApp.formatCurrency(order.totalAmount || 0)}</td>
          <td class="text-capitalize">${(order.paymentMethod || 'bank-transfer').replace(/-/g, ' ')}</td>
          <td><span class="badge ${statusBadge}">${(order.orderStatus || 'pending').replace(/_/g, ' ')}</span></td>
        </tr>`
      );
    });
  };

  // Render sales by location chart and list (using Chart.js v2 API)
  const renderSalesByLocation = (locations = []) => {
    if (!salesLocationList || !locations.length) {
      if (salesLocationList) {
        salesLocationList.innerHTML = '<div class="text-center py-3 text-muted">No location data available.</div>';
      }
      return;
    }

    // Destroy existing chart
    if (salesByLocationChart) {
      try {
        salesByLocationChart.destroy();
      } catch (e) {
        console.error('Error destroying location chart:', e);
      }
      salesByLocationChart = null;
    }

    // Prepare data for pie chart (Chart.js v2 format)
    const colors = [
      '#ab8ce4', // primary
      '#26c6da', // secondary
      '#FF5370', // danger
      '#ffa726', // warning
      '#66bb6a', // success
      '#42a5f5', // info
      '#ec407a',
      '#8d6e63',
      '#78909c',
      '#7e57c2'
    ];

    // Create pie chart using Chart.js v2 API
    const canvas = document.getElementById('salesByLocationChart');
    if (!canvas || typeof Chart === 'undefined') {
      console.warn('Cannot render location chart: canvas missing or Chart.js not loaded');
      return;
    }

    // Check if canvas is visible
    const canvasStyle = window.getComputedStyle(canvas);
    if (canvasStyle.display === 'none' || canvasStyle.visibility === 'hidden') {
      console.warn('Location chart canvas is hidden, waiting...');
      setTimeout(() => renderSalesByLocation(locations), 500);
      return;
    }

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Could not get 2d context from canvas');
        return;
      }

      const pieData = locations.map((loc, index) => ({
        value: loc.revenue || 0,
        color: colors[index % colors.length],
        highlight: colors[index % colors.length],
        label: loc.location || 'Unknown'
      }));

      console.log('[Dashboard] Creating location chart with data:', pieData);

      // Get container dimensions for proper sizing
      const container = canvas.parentElement;
      let chartSize = 200; // Default size
      
      if (container) {
        // Calculate available space (account for padding)
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width - 40; // Account for padding
        const containerHeight = containerRect.height - 40;
        
        // Responsive chart sizing based on screen width
        let maxChartSize;
        const screenWidth = window.innerWidth;
        
        if (screenWidth < 768) {
          // Mobile: smaller charts
          maxChartSize = Math.min(containerWidth, containerHeight, 200);
        } else if (screenWidth < 1024) {
          // Tablet: medium charts
          maxChartSize = Math.min(containerWidth, containerHeight, 220);
        } else {
          // Desktop: larger charts
          maxChartSize = Math.min(containerWidth, containerHeight, 240);
        }
        
        // Ensure minimum size and use the smaller dimension to keep it square
        chartSize = Math.max(Math.min(maxChartSize, containerWidth, containerHeight), 180);
        
        // Ensure container has enough height
        if (containerHeight < chartSize + 20) {
          container.style.minHeight = (chartSize + 40) + 'px';
        }
        
        console.log('[Dashboard] Location chart container:', {
          width: containerRect.width,
          height: containerRect.height,
          availableWidth: containerWidth,
          availableHeight: containerHeight,
          chartSize: chartSize,
          screenWidth: screenWidth
        });
      }
      
      // Set canvas dimensions explicitly BEFORE creating chart (square for doughnut)
      // This is critical - Chart.js needs the canvas to be properly sized
      canvas.width = chartSize;
      canvas.height = chartSize;
      canvas.style.width = chartSize + 'px';
      canvas.style.height = chartSize + 'px';
      canvas.style.maxWidth = '100%';
      canvas.style.maxHeight = '100%';
      canvas.style.display = 'block';
      canvas.style.margin = '0 auto';
      canvas.style.verticalAlign = 'middle';

      salesByLocationChart = new Chart(ctx).Doughnut(pieData, {
        responsive: false, // Disable responsive to use our explicit sizing
        maintainAspectRatio: true, // Maintain aspect ratio for proper circle
        segmentShowStroke: true,
        segmentStrokeColor: '#fff',
        segmentStrokeWidth: 2,
        percentageInnerCutout: 50,
        animationSteps: 100,
        animationEasing: 'easeOutBounce',
        animateRotate: true,
        animateScale: false,
        tooltipTemplate: '<%if (label){%><%=label%>: ₦<%= value.toLocaleString() %> (<%=Math.round(circumference / 6.283 *100)%>%)<%}%>'
      });
      
      console.log('[Dashboard] Location chart sized to:', chartSize + 'x' + chartSize);
      
      console.log('[Dashboard] Sales by location chart rendered successfully', salesByLocationChart);
    } catch (error) {
      console.error('Error creating location chart:', error);
      console.error('Error stack:', error.stack);
      console.error('Location data:', locations);
      console.error('Chart.js available:', typeof Chart);
      console.error('Canvas element:', canvas);
    }

    // Render location list with colors matching the chart
    // Use the same color array as the chart to ensure perfect matching
    salesLocationList.innerHTML = locations.map((loc, index) => {
      const chartColor = colors[index % colors.length];
      return `
        <div class="media">
          <div class="order-shape-indicator" style="background-color: ${chartColor}; width: 18px; height: 8px; margin-top: 7px; border-radius: 4px; display: inline-block;"></div>
          <div class="media-body">
            <h6 class="mb-0 me-0">
              ${loc.location} <span class="pull-right">${loc.percentage}%</span>
            </h6>
          </div>
        </div>
      `;
    }).join('');
  };

  // Render orders by status chart (using Chart.js v2 API)
  const renderOrdersByStatus = (statuses = []) => {
    if (ordersByStatusChart) {
      try {
        ordersByStatusChart.destroy();
      } catch (e) {
        console.error('Error destroying status chart:', e);
      }
      ordersByStatusChart = null;
    }

    const canvas = document.getElementById('ordersByStatusChart');
    if (!canvas || !statuses.length || typeof Chart === 'undefined') {
      console.warn('Cannot render orders by status: canvas missing, no statuses, or Chart.js not loaded');
      return;
    }

    // Check if canvas is visible
    const canvasStyle = window.getComputedStyle(canvas);
    if (canvasStyle.display === 'none' || canvasStyle.visibility === 'hidden') {
      console.warn('Orders by status canvas is hidden, waiting...');
      setTimeout(() => renderOrdersByStatus(statuses), 500);
      return;
    }

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Could not get 2d context from orders by status canvas');
        return;
      }

      const colors = {
        'pending': '#ffa726',
        'awaiting_payment': '#ff9800',
        'processing': '#42a5f5',
        'delivered': '#66bb6a',
        'cancelled': '#ef5350',
        'shipped': '#26c6da'
      };

      const pieData = statuses.map(s => ({
        value: s.count || 0,
        color: colors[s.status] || '#9e9e9e',
        highlight: colors[s.status] || '#9e9e9e',
        label: s.label || s.status || 'Unknown'
      }));

      console.log('[Dashboard] Creating orders by status chart with data:', pieData);

      // Get container dimensions for proper sizing
      const statusContainer = canvas.parentElement;
      let statusChartSize = 200; // Default size
      
      if (statusContainer) {
        // Calculate available space (account for padding)
        const statusContainerRect = statusContainer.getBoundingClientRect();
        const statusContainerWidth = statusContainerRect.width - 40; // Account for padding
        const statusContainerHeight = statusContainerRect.height - 40; // Account for padding
        
        // Responsive chart sizing based on screen width
        let maxChartSize;
        const screenWidth = window.innerWidth;
        
        if (screenWidth < 768) {
          // Mobile: smaller charts
          maxChartSize = Math.min(statusContainerWidth, statusContainerHeight, 200);
        } else if (screenWidth < 1024) {
          // Tablet: medium charts
          maxChartSize = Math.min(statusContainerWidth, statusContainerHeight, 220);
        } else {
          // Desktop: larger charts
          maxChartSize = Math.min(statusContainerWidth, statusContainerHeight, 240);
        }
        
        // Ensure minimum size and use the smaller dimension to keep it square
        statusChartSize = Math.max(Math.min(maxChartSize, statusContainerWidth, statusContainerHeight), 180);
        
        // Ensure container has enough height
        if (statusContainerHeight < statusChartSize + 20) {
          statusContainer.style.minHeight = (statusChartSize + 40) + 'px';
        }
        
        console.log('[Dashboard] Status chart container:', {
          width: statusContainerRect.width,
          height: statusContainerRect.height,
          availableWidth: statusContainerWidth,
          availableHeight: statusContainerHeight,
          chartSize: statusChartSize,
          screenWidth: screenWidth
        });
      }
      
      // Set canvas dimensions explicitly BEFORE creating chart (square for doughnut)
      // This is critical - Chart.js needs the canvas to be properly sized
      canvas.width = statusChartSize;
      canvas.height = statusChartSize;
      canvas.style.width = statusChartSize + 'px';
      canvas.style.height = statusChartSize + 'px';
      canvas.style.maxWidth = '100%';
      canvas.style.maxHeight = '100%';
      canvas.style.display = 'block';
      canvas.style.margin = '0 auto';
      canvas.style.verticalAlign = 'middle';

      ordersByStatusChart = new Chart(ctx).Doughnut(pieData, {
        responsive: false, // Disable responsive to use our explicit sizing
        maintainAspectRatio: true, // Maintain aspect ratio for proper circle
        segmentShowStroke: true,
        segmentStrokeColor: '#fff',
        segmentStrokeWidth: 2,
        percentageInnerCutout: 50,
        animationSteps: 100,
        animationEasing: 'easeOutBounce',
        animateRotate: true,
        animateScale: false,
        tooltipTemplate: '<%if (label){%><%=label%>: <%= value %> orders (<%=Math.round(circumference / 6.283 *100)%>%)<%}%>'
      });
      
      console.log('[Dashboard] Status chart sized to:', statusChartSize + 'x' + statusChartSize);
      
      console.log('[Dashboard] Orders by status chart rendered successfully', ordersByStatusChart);
      
      // Render status list
      if (!ordersStatusList || !statuses.length) {
        if (ordersStatusList) {
          ordersStatusList.innerHTML = '<div class="text-center py-3 text-muted">No status data available.</div>';
        }
        return;
      }
      
      const statusColors = {
        'pending': 'order-shape-warning',
        'awaiting_payment': 'order-shape-warning',
        'processing': 'order-shape-primary',
        'delivered': 'order-shape-success',
        'cancelled': 'order-shape-danger',
        'shipped': 'order-shape-secondary'
      };
      
      // Calculate total orders for percentage calculation
      const totalOrders = statuses.reduce((sum, s) => sum + (s.count || 0), 0);
      
      ordersStatusList.innerHTML = statuses.map((status) => {
        const colorClass = statusColors[status.status] || 'order-shape-primary';
        const percentage = totalOrders > 0 ? Math.round((status.count / totalOrders) * 100) : 0;
        const statusLabel = status.label || status.status || 'Unknown';
        
        return `
          <div class="media">
            <div class="${colorClass}"></div>
            <div class="media-body">
              <h6 class="mb-0 me-0">
                ${statusLabel} <span class="pull-right">${status.count || 0} (${percentage}%)</span>
              </h6>
            </div>
          </div>
        `;
      }).join('');
      
    } catch (error) {
      console.error('Error creating orders by status chart:', error);
      console.error('Error stack:', error.stack);
      console.error('Status data:', statuses);
      
      // Show error message in status list
      if (ordersStatusList) {
        ordersStatusList.innerHTML = '<div class="text-center py-3 text-danger">Error loading status data.</div>';
      }
    }
  };

  // Render revenue trends chart (using Chart.js v2 API)
  const renderRevenueTrends = (trends = [], period = 'monthly') => {
    // Hide loading and empty states
    const loadingEl = document.getElementById('revenueTrendsLoading');
    const emptyEl = document.getElementById('revenueTrendsEmpty');
    if (loadingEl) loadingEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';
    
    if (revenueTrendsChart) {
      try {
        revenueTrendsChart.destroy();
      } catch (e) {
        console.error('Error destroying revenue trends chart:', e);
      }
      revenueTrendsChart = null;
    }

    const canvas = document.getElementById('revenueTrendsChart');
    if (!canvas || typeof Chart === 'undefined') {
      console.warn('Cannot render revenue trends: canvas missing or Chart.js not loaded');
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }
    
    if (!trends.length) {
      console.warn('No trend data available');
      canvas.style.display = 'none';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }
    
    // Show canvas
    canvas.style.display = 'block';

    // Check if canvas is visible
    const canvasStyle = window.getComputedStyle(canvas);
    if (canvasStyle.display === 'none' || canvasStyle.visibility === 'hidden') {
      console.warn('Revenue trends canvas is hidden, waiting...');
      setTimeout(() => renderRevenueTrends(trends, period), 500);
      return;
    }

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Could not get 2d context from revenue trends canvas');
        return;
      }

      const labels = trends.map(t => t.label);
      const revenues = trends.map(t => t.revenue || 0);
      const orders = trends.map(t => t.orders || 0);

      // Get container dimensions for proper sizing
      const container = canvas.parentElement;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width - 40; // Account for padding
        const containerHeight = 300; // Use fixed height from CSS
        
        // Set canvas dimensions
        canvas.width = containerWidth;
        canvas.height = containerHeight;
        canvas.style.width = containerWidth + 'px';
        canvas.style.height = containerHeight + 'px';
        canvas.style.maxWidth = '100%';
        canvas.style.display = 'block';
        
        console.log('[Dashboard] Revenue trends chart container:', {
          width: containerRect.width,
          height: containerRect.height,
          canvasWidth: containerWidth,
          canvasHeight: containerHeight
        });
      }

      const lineData = {
        labels: labels,
        datasets: [
          {
            label: 'Revenue (₦)',
            fillColor: 'rgba(171, 140, 228, 0.2)',
            strokeColor: '#ab8ce4',
            pointColor: '#ab8ce4',
            pointStrokeColor: '#fff',
            pointHighlightFill: '#fff',
            pointHighlightStroke: '#ab8ce4',
            data: revenues
          },
          {
            label: 'Orders',
            fillColor: 'rgba(38, 198, 218, 0.2)',
            strokeColor: '#26c6da',
            pointColor: '#26c6da',
            pointStrokeColor: '#fff',
            pointHighlightFill: '#fff',
            pointHighlightStroke: '#26c6da',
            data: orders
          }
        ]
      };

      console.log('[Dashboard] Creating revenue trends chart with data:', {
        labels: labels.length,
        revenues: revenues.length,
        orders: orders.length,
        sampleLabels: labels.slice(0, 3),
        sampleRevenues: revenues.slice(0, 3),
        sampleOrders: orders.slice(0, 3)
      });

      revenueTrendsChart = new Chart(ctx).Line(lineData, {
        responsive: true,
        maintainAspectRatio: false,
        multiTooltipTemplate: '<%if (datasetLabel){%><%=datasetLabel%>: <%}%><%if (datasetLabel === "Revenue (₦)"){%>₦<%= value.toLocaleString() %><%}else{%><%= value %><%}%>',
        scaleBeginAtZero: true
      });
      
      console.log('[Dashboard] Revenue trends chart rendered successfully', revenueTrendsChart);
    } catch (error) {
      console.error('Error creating revenue trends chart:', error);
      console.error('Error stack:', error.stack);
      console.error('Chart data:', trends);
    }
  };

  // Render top products chart (using Chart.js v2 API)
  const renderTopProducts = (products = []) => {
    if (topProductsChart) {
      try {
        topProductsChart.destroy();
      } catch (e) {
        console.error('Error destroying top products chart:', e);
      }
      topProductsChart = null;
    }

    const canvas = document.getElementById('topProductsChart');
    if (!canvas || !products.length || typeof Chart === 'undefined') {
      console.warn('Cannot render top products: canvas missing, no products, or Chart.js not loaded');
      return;
    }

    // Check if canvas is visible
    const canvasStyle = window.getComputedStyle(canvas);
    if (canvasStyle.display === 'none' || canvasStyle.visibility === 'hidden') {
      console.warn('Top products canvas is hidden, waiting...');
      setTimeout(() => renderTopProducts(products), 500);
      return;
    }

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Could not get 2d context from top products canvas');
        return;
      }

      const displayProducts = products.slice(0, 10);
      const labels = displayProducts.map(p => {
        // Truncate long product names
        const name = p.productName || 'Unknown Product';
        return name.length > 20 ? name.substring(0, 20) + '...' : name;
      });
      const revenues = displayProducts.map(p => p.revenue || 0);
      const quantities = displayProducts.map(p => p.quantitySold || 0);

      const barData = {
        labels: labels,
        datasets: [
          {
            label: 'Revenue (₦)',
            fillColor: 'rgba(171, 140, 228, 0.8)',
            strokeColor: '#ab8ce4',
            highlightFill: '#ab8ce4',
            highlightStroke: '#ab8ce4',
            data: revenues
          },
          {
            label: 'Quantity Sold',
            fillColor: 'rgba(38, 198, 218, 0.8)',
            strokeColor: '#26c6da',
            highlightFill: '#26c6da',
            highlightStroke: '#26c6da',
            data: quantities
          }
        ]
      };

      console.log('[Dashboard] Creating top products chart with data:', {
        labels: labels.length,
        revenues: revenues.length,
        quantities: quantities.length
      });

      topProductsChart = new Chart(ctx).Bar(barData, {
        responsive: true,
        maintainAspectRatio: false,
        multiTooltipTemplate: '<%if (datasetLabel){%><%=datasetLabel%>: <%}%><%if (datasetLabel === "Revenue (₦)"){%>₦<%= value.toLocaleString() %><%}else{%><%= value %><%}%>',
        scaleBeginAtZero: true
      });
      
      console.log('[Dashboard] Top products chart rendered successfully', topProductsChart);
    } catch (error) {
      console.error('Error creating top products chart:', error);
      console.error('Error stack:', error.stack);
      console.error('Chart data:', products);
    }
  };

  const loadDashboard = async () => {
    // Wait for Chart.js and DOM to be ready
    await waitForChartJS();
    
    // Wait a bit more to ensure session is fully loaded and auth is established
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const session = AdminApp.getSession && AdminApp.getSession();
    if (!session || !session.accessToken) {
      console.error('[Dashboard] No session or access token available.');
      return;
    }
    
      console.log('[Dashboard] Starting to load dashboard data...');
    
    // Show loading state for revenue trends
    const revenueLoading = document.getElementById('revenueTrendsLoading');
    const revenueCanvas = document.getElementById('revenueTrendsChart');
    if (revenueLoading) revenueLoading.style.display = 'block';
    if (revenueCanvas) revenueCanvas.style.display = 'none';
    
    try {
      // Load dashboard stats
      const [statsResponse, ordersResponse, revenueTrendsResponse, locationResponse, statusResponse, topProductsResponse] = await Promise.all([
        AdminApp.request('/analytics/dashboard/stats'),
        AdminApp.request('/admin/orders'),
        AdminApp.request('/analytics/revenue/trends?period=monthly'),
        AdminApp.request('/analytics/orders/location?groupBy=country'),
        AdminApp.request('/analytics/orders/status'),
        AdminApp.request('/analytics/products/top?limit=10')
      ]);

      console.log('[Dashboard] Data fetched successfully:', {
        stats: !!statsResponse,
        orders: !!ordersResponse,
        revenueTrends: !!revenueTrendsResponse,
        location: !!locationResponse,
        status: !!statusResponse,
        topProducts: !!topProductsResponse
      });

      // Update stats
      const stats = statsResponse?.data || {};
      const overview = stats.overview || {};
      setStat('orders', overview.totalOrders || 0);
      setStat('awaiting', overview.awaitingPayment || 0);
      setStat('revenue', AdminApp.formatCurrency(overview.totalRevenue || 0));
      setStat('products', overview.totalProducts || 0);

      // Render recent orders
      const orders = ordersResponse?.data?.orders || [];
      renderRecentOrders(
        orders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      );

      // Render charts - wait a bit for DOM to be ready and ensure canvas elements exist
      // Give extra time for default.js chart initialization to complete
      await new Promise(resolve => setTimeout(resolve, 800));

      // Verify Chart.js is loaded
      if (typeof Chart === 'undefined') {
        console.error('[Dashboard] Chart.js is not loaded!');
        AdminApp.showToast && AdminApp.showToast('Chart library not loaded. Please refresh the page.', 'danger');
        return;
      }

      // Check if all canvas elements exist and are visible
      const canvases = {
        revenueTrends: document.getElementById('revenueTrendsChart'),
        salesByLocation: document.getElementById('salesByLocationChart'),
        ordersByStatus: document.getElementById('ordersByStatusChart'),
        topProducts: document.getElementById('topProductsChart')
      };

      console.log('[Dashboard] Canvas elements check:', {
        revenueTrends: !!canvases.revenueTrends,
        salesByLocation: !!canvases.salesByLocation,
        ordersByStatus: !!canvases.ordersByStatus,
        topProducts: !!canvases.topProducts,
        chartJsLoaded: typeof Chart !== 'undefined',
        ChartVersion: Chart?.defaults ? 'v2' : 'unknown'
      });

      // Verify all canvas elements exist
      if (!canvases.revenueTrends || !canvases.salesByLocation || !canvases.ordersByStatus || !canvases.topProducts) {
        console.error('[Dashboard] Missing canvas elements!', {
          revenueTrends: !!canvases.revenueTrends,
          salesByLocation: !!canvases.salesByLocation,
          ordersByStatus: !!canvases.ordersByStatus,
          topProducts: !!canvases.topProducts
        });
      }

      // Render charts one by one with error handling
      try {
        const trends = revenueTrendsResponse?.data?.trends || [];
        chartDataCache.trends = trends; // Cache for resize
        console.log('[Dashboard] Rendering revenue trends:', trends.length, 'data points', trends);
        console.log('[Dashboard] Revenue trends response:', revenueTrendsResponse);
        
        if (canvases.revenueTrends) {
          if (trends.length > 0) {
            renderRevenueTrends(trends, revenueTrendsResponse?.data?.period || 'monthly');
          } else {
            console.warn('[Dashboard] No trend data available, showing empty state');
            // Show empty state message
            const container = canvases.revenueTrends.parentElement;
            if (container) {
              container.innerHTML = '<div class="text-center py-5 text-muted"><p>No revenue trend data available</p><p class="small">Data will appear here once orders are placed</p></div>';
            }
          }
        } else {
          console.warn('[Dashboard] Revenue trends canvas missing');
        }
      } catch (error) {
        console.error('[Dashboard] Error rendering revenue trends:', error);
        // Show error message in chart container
        const canvas = document.getElementById('revenueTrendsChart');
        if (canvas && canvas.parentElement) {
          canvas.parentElement.innerHTML = '<div class="text-center py-5 text-danger"><p>Error loading revenue trends</p><p class="small">Please refresh the page</p></div>';
        }
      }

      try {
        const locations = locationResponse?.data?.locations || [];
        chartDataCache.locations = locations; // Cache for resize
        console.log('[Dashboard] Rendering sales by location:', locations.length, 'locations', locations);
        if (canvases.salesByLocation && locations.length > 0) {
          renderSalesByLocation(locations);
        } else {
          console.warn('[Dashboard] Skipping sales by location chart - no data or canvas missing');
        }
      } catch (error) {
        console.error('[Dashboard] Error rendering sales by location:', error);
      }

      try {
        const statuses = statusResponse?.data?.statuses || [];
        chartDataCache.statuses = statuses; // Cache for resize
        console.log('[Dashboard] Rendering orders by status:', statuses.length, 'statuses', statuses);
        if (canvases.ordersByStatus && statuses.length > 0) {
          renderOrdersByStatus(statuses);
        } else {
          console.warn('[Dashboard] Skipping orders by status chart - no data or canvas missing');
        }
      } catch (error) {
        console.error('[Dashboard] Error rendering orders by status:', error);
      }

      try {
        const topProducts = topProductsResponse?.data?.products || [];
        console.log('[Dashboard] Rendering top products:', topProducts.length, 'products', topProducts);
        if (canvases.topProducts && topProducts.length > 0) {
          renderTopProducts(topProducts);
        } else {
          console.warn('[Dashboard] Skipping top products chart - no data or canvas missing');
        }
      } catch (error) {
        console.error('[Dashboard] Error rendering top products:', error);
      }

      // Handle revenue trend period change
      const periodSelect = document.getElementById('revenueTrendPeriod');
      if (periodSelect) {
        periodSelect.addEventListener('change', async (e) => {
          const period = e.target.value;
          try {
            const response = await AdminApp.request(`/analytics/revenue/trends?period=${period}`);
            const trends = response?.data?.trends || [];
            renderRevenueTrends(trends, period);
          } catch (error) {
            console.error('Error loading revenue trends:', error);
            AdminApp.showToast && AdminApp.showToast('Error loading revenue trends.', 'danger');
          }
        });
      }

    } catch (error) {
      console.error('Dashboard error:', error);
      AdminApp.showToast && AdminApp.showToast('Error loading dashboard data. Please refresh.', 'danger');
    }
  };

  // Initialize dashboard when page loads
  const init = () => {
    // Wait for DOM and Chart.js to be ready
    const initDashboard = async () => {
      // Wait for Chart.js library to load
      await waitForChartJS();
      
      // Additional delay to ensure all DOM elements are ready and default.js has finished
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if we're on the dashboard page
      const isDashboardPage = window.location.pathname.includes('index.html') || 
                              window.location.pathname.endsWith('/admin/') ||
                              window.location.pathname.endsWith('/admin') ||
                              (window.location.pathname.includes('/admin') && !window.location.pathname.match(/\.(html|php)$/));
      
      if (isDashboardPage) {
        console.log('[Dashboard] Initializing dashboard...');
        loadDashboard();
      } else {
        console.log('[Dashboard] Not on dashboard page, skipping initialization');
      }
    };

    // Wait for window load to ensure all scripts including default.js are loaded
    if (document.readyState === 'complete') {
      initDashboard();
    } else {
      window.addEventListener('load', () => {
        setTimeout(initDashboard, 500);
      });
    }
  };

  // Handle window resize to redraw charts responsively
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      console.log('[Dashboard] Window resized, redrawing charts...');
      // Redraw charts with cached data
      if (chartDataCache.locations) {
        renderSalesByLocation(chartDataCache.locations);
      }
      if (chartDataCache.statuses) {
        renderOrdersByStatus(chartDataCache.statuses);
      }
    }, 250); // Debounce resize events
  });

  // Start initialization
  init();
})();
