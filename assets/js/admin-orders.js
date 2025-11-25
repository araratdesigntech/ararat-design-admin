(function () {
  const table = document.querySelector('#adminOrdersTable tbody') || document.querySelector('#basic-1 tbody');
  if (!table || !window.AdminApp) return;

  const searchInput = document.getElementById('orderSearchInput');
  const refreshBtn = document.querySelector('[data-refresh-orders]');
  let orders = [];

  const renderStatusBadge = (status) => {
    const normalized = (status || '').toLowerCase();
    const map = {
      awaiting_payment: 'badge-warning',
      pending: 'badge-secondary',
      payment_confirmed: 'badge-success',
      completed: 'badge-primary',
      cancelled: 'badge-danger',
    };
    const label = status ? status.replace(/_/g, ' ') : 'unknown';
    const badge = map[normalized] || 'badge-light';
    return `<span class="badge ${badge} text-capitalize">${label}</span>`;
  };

  const renderOrders = (list) => {
    if (!list.length) {
      table.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4">No orders yet.</td>
        </tr>
      `;
      return;
    }

    table.innerHTML = '';

    list.forEach((order) => {
      const buyer = `${order.user?.name || ''} ${order.user?.surname || ''}`.trim() || 'Customer';
      const itemsText = (order.orderItems || [])
        .slice(0, 2)
        .map((item) => item.nameSnapshot || item.product?.name || 'Item')
        .join(', ');
      const invoiceNumber = order.invoiceNumber || '—';
      const createdAt = AdminApp.formatDate(order.createdAt);
      const amount = AdminApp.formatCurrency(order.totalAmount);
      const paymentMethod = order.paymentMethod || 'bank-transfer';

      table.insertAdjacentHTML(
        'beforeend',
        `<tr>
          <td>
            <div class="d-flex flex-column">
              <strong>${invoiceNumber}</strong>
              <small class="text-muted">${order._id}</small>
            </div>
          </td>
          <td>
            <div class="d-flex flex-column">
              <span>${buyer}</span>
              <small class="text-muted">${itemsText || '—'}</small>
            </div>
          </td>
          <td>${renderStatusBadge(order.orderStatus)}</td>
          <td>${paymentMethod}</td>
          <td>${createdAt}</td>
          <td>${amount}</td>
          <td>
            <div class="btn-group btn-group-sm flex-wrap" role="group">
              <a href="order-detail.html?orderId=${order._id}" class="btn btn-outline-primary">View</a>
              ${
                order.whatsappMessageUrl
                  ? `<a href="${order.whatsappMessageUrl}" target="_blank" class="btn btn-outline-success">WhatsApp</a>`
                  : ''
              }
              ${
                order.orderStatus === 'awaiting_payment'
                  ? `<button class="btn btn-outline-secondary" data-confirm-order="${order._id}" data-order-amount="${order.totalAmount}" data-order-invoice="${invoiceNumber}">Confirm Payment</button>`
                  : ''
              }
              ${
                order.invoiceNumber
                  ? `<button class="btn btn-outline-info" data-download-invoice="${order._id}">Invoice</button>`
                  : ''
              }
            </div>
          </td>
        </tr>`
      );
    });
  };

  const filterOrders = () => {
    const query = searchInput?.value?.toLowerCase().trim();
    if (!query) {
      renderOrders(orders);
      return;
    }
    const filtered = orders.filter((order) => {
      return (
        order.invoiceNumber?.toLowerCase().includes(query) ||
        order._id?.toLowerCase().includes(query) ||
        order.user?.email?.toLowerCase().includes(query) ||
        `${order.user?.name || ''} ${order.user?.surname || ''}`.toLowerCase().includes(query)
      );
    });
    renderOrders(filtered);
  };

  const fetchOrders = async () => {
    table.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-4">
          <div class="spinner-border text-primary" role="status"></div>
        </td>
      </tr>
    `;
    try {
      const response = await AdminApp.request('/admin/orders');
      orders = response?.data?.orders || [];
      renderOrders(orders);
    } catch (error) {
      table.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">${error.message}</td></tr>`;
    }
  };

  const confirmPayment = async (orderId, amount, invoice) => {
    if (!confirm(`Confirm payment for invoice ${invoice}?`)) return;
    try {
      await AdminApp.request('/admin/orders/confirm-payment', {
        method: 'POST',
        body: {
          orderId,
          amount,
        },
      });
      AdminApp.showToast('Payment confirmed successfully.', 'success');
      fetchOrders();
    } catch (error) {
      AdminApp.showToast(error.message || 'Unable to confirm payment.', 'danger');
    }
  };

  const downloadInvoice = async (orderId) => {
    try {
      const apiBaseUrl = AdminApp.getApiBaseUrl();
      
      const session = AdminApp.getSession && AdminApp.getSession();
      const token = session?.accessToken;
      
      if (!token) {
        AdminApp.showToast('Please login to download invoices.', 'warning');
        return;
      }
      
      const url = `${apiBaseUrl}/orders/invoices/${orderId}`;
      
      // Fetch the PDF with authentication
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `Failed to download invoice: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData?.message || errorData?.error || errorMessage;
        } catch (e) {
          // Response is not JSON, use status text
        }
        throw new Error(errorMessage);
      }
      
      // Check if response is actually a PDF
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        // Might be an error response, try to parse as JSON
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.message || errorData?.error || 'Invalid response format');
      }
      
      // Get the blob
      const blob = await response.blob();
      
      // Verify blob is not empty
      if (blob.size === 0) {
        throw new Error('Downloaded PDF is empty. Please try again.');
      }
      
      // Create a download link
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Invoice-${orderId}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
      
      AdminApp.showToast('Invoice downloaded successfully!', 'success');
    } catch (error) {
      console.error('Invoice download error:', error);
      AdminApp.showToast(error.message || 'Unable to retrieve invoice.', 'danger');
    }
  };

  document.addEventListener('click', (event) => {
    const confirmBtn = event.target.closest('[data-confirm-order]');
    if (confirmBtn) {
      confirmPayment(
        confirmBtn.getAttribute('data-confirm-order'),
        Number(confirmBtn.getAttribute('data-order-amount')) || 0,
        confirmBtn.getAttribute('data-order-invoice') || ''
      );
      return;
    }

    const downloadBtn = event.target.closest('[data-download-invoice]');
    if (downloadBtn) {
      downloadInvoice(downloadBtn.getAttribute('data-download-invoice'));
    }
  });

  searchInput?.addEventListener('input', () => filterOrders());
  refreshBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    fetchOrders();
  });

  fetchOrders();
})();

