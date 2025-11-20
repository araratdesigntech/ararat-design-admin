(function () {
  if (!window.AdminApp) return;

  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId');
  if (!orderId) return;

  const elements = {
    number: document.querySelector('[data-order-number]'),
    id: document.querySelector('[data-order-id]'),
    status: document.querySelector('[data-order-status]'),
    customer: document.querySelector('[data-order-customer]'),
    phone: document.querySelector('[data-order-phone]'),
    email: document.querySelector('[data-order-email]'),
    address: document.querySelector('[data-order-address]'),
    subtotal: document.getElementById('orderSubtotal'),
    shipping: document.getElementById('orderShipping'),
    tax: document.getElementById('orderTax'),
    total: document.getElementById('orderTotal'),
    createdAt: document.querySelector('[data-order-date]'),
    paymentMethod: document.querySelector('[data-order-payment]'),
    itemsBody: document.getElementById('orderItemsBody'),
    whatsappLink: document.querySelector('[data-order-whatsapp]'),
    invoiceBtn: document.querySelector('[data-order-invoice]'),
    confirmBtn: document.querySelector('[data-order-confirm]'),
  };

  const renderItems = (items = []) => {
    if (!elements.itemsBody) return;
    if (!items.length) {
      elements.itemsBody.innerHTML = `<tr><td colspan="4" class="text-center py-3">No items found.</td></tr>`;
      return;
    }

    elements.itemsBody.innerHTML = '';
    items.forEach((item) => {
      elements.itemsBody.insertAdjacentHTML(
        'beforeend',
        `<tr class="table-order">
          <td>
            <strong>${item.nameSnapshot || item.product?.name || 'Item'}</strong>
            <div class="text-muted small">${item.product?.category?.name || ''}</div>
          </td>
          <td>${item.quantity}</td>
          <td>${AdminApp.formatCurrency(item.unitPrice)}</td>
          <td>${AdminApp.formatCurrency(item.unitPrice * (item.quantity || 0))}</td>
        </tr>`
      );
    });
  };

  const downloadInvoice = async () => {
    try {
      const apiBaseUrl = AdminApp.getApiBaseUrl();
      
      // Use the invoice endpoint which streams the PDF directly
      // We need to fetch with authentication and create a blob URL
      const session = AdminApp.getSession && AdminApp.getSession();
      const token = session?.accessToken;
      
      if (!token) {
        AdminApp.showToast('Please login to download invoices.', 'warning');
        return;
      }
      
      // Construct URL
      const url = `${apiBaseUrl}/orders/invoices/${orderId}`;
      
      // Fetch the PDF with authentication
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoice PDF');
      }
      
      // Create blob from response and open it
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      
      // Clean up blob URL after a delay
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error('Invoice download error:', error);
      AdminApp.showToast(error.message || 'Unable to fetch invoice.', 'danger');
    }
  };

  const confirmPayment = async (order) => {
    if (order.orderStatus !== 'awaiting_payment') return;
    if (!confirm(`Confirm payment for invoice ${order.invoiceNumber || ''}?`)) return;

    try {
      await AdminApp.request('/admin/orders/confirm-payment', {
        method: 'POST',
        body: {
          orderId: order._id,
          amount: order.totalAmount,
        },
      });
      AdminApp.showToast('Payment confirmed successfully.', 'success');
      window.location.reload();
    } catch (error) {
      AdminApp.showToast(error.message || 'Unable to confirm payment.', 'danger');
    }
  };

  const renderOrder = (order) => {
    elements.number && (elements.number.textContent = order.invoiceNumber || '—');
    elements.id && (elements.id.textContent = order._id);
    elements.status && (elements.status.textContent = order.orderStatus?.replace(/_/g, ' ') || 'pending');
    elements.customer && (elements.customer.textContent = `${order.user?.name || ''} ${order.user?.surname || ''}`.trim());
    elements.phone && (elements.phone.textContent = order.user?.phone || order.shippingInfo?.phoneNo || '—');
    elements.email && (elements.email.textContent = order.user?.email || '—');
    elements.address &&
      (elements.address.textContent =
        `${order.shippingInfo?.address || ''}, ${order.shippingInfo?.city || ''}, ${order.shippingInfo?.country || ''}`.replace(
          /,\s*,/g,
          ','
        ));
    elements.subtotal && (elements.subtotal.textContent = AdminApp.formatCurrency(order.subTotal));
    elements.shipping && (elements.shipping.textContent = AdminApp.formatCurrency(order.shippingAmount));
    elements.tax && (elements.tax.textContent = AdminApp.formatCurrency(order.textAmount));
    elements.total && (elements.total.textContent = AdminApp.formatCurrency(order.totalAmount));
    elements.createdAt && (elements.createdAt.textContent = AdminApp.formatDate(order.createdAt));
    elements.paymentMethod && (elements.paymentMethod.textContent = order.paymentMethod || 'bank-transfer');

    if (elements.whatsappLink && order.whatsappMessageUrl) {
      elements.whatsappLink.href = order.whatsappMessageUrl;
      elements.whatsappLink.classList.remove('d-none');
    }

    if (elements.invoiceBtn) {
      elements.invoiceBtn.addEventListener('click', (e) => {
        e.preventDefault();
        downloadInvoice();
      });
    }

    if (elements.confirmBtn) {
      if (order.orderStatus === 'awaiting_payment') {
        elements.confirmBtn.classList.remove('d-none');
        elements.confirmBtn.addEventListener('click', () => confirmPayment(order));
      } else {
        elements.confirmBtn.classList.add('d-none');
      }
    }

    renderItems(order.orderItems);
  };

  const init = async () => {
    const placeholder = document.querySelector('[data-order-loader]');
    try {
      const response = await AdminApp.request(`/admin/orders/${orderId}`);
      renderOrder(response?.data?.order || {});
      placeholder && placeholder.classList.add('d-none');
    } catch (error) {
      placeholder && (placeholder.innerHTML = `<p class="text-danger">${error.message}</p>`);
    }
  };

  init();
})();

