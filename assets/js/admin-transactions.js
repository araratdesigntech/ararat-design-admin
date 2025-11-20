(function () {
  if (!window.AdminApp) return;
  const tableElement = document.getElementById('adminTransactionsTable');
  if (!tableElement) return;

  tableElement.innerHTML = `
    <thead>
      <tr>
        <th>Order Id</th>
        <th>Transaction Id</th>
        <th>Date</th>
        <th>Payment Method</th>
        <th>Status</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody id="transactionsTableBody">
      <tr>
        <td colspan="6" class="text-center py-4">
          <div class="spinner-border text-primary" role="status"></div>
        </td>
      </tr>
    </tbody>
  `;

  const table = tableElement.querySelector('#transactionsTableBody');

  const searchInput = document.getElementById('transactionSearchInput');
  let transactions = [];

  const renderTransactions = (list) => {
    if (!list.length) {
      table.innerHTML = `<tr><td colspan="6" class="text-center py-4">No transactions yet.</td></tr>`;
      return;
    }

    table.innerHTML = '';
    list.forEach((tx) => {
      table.insertAdjacentHTML(
        'beforeend',
        `<tr>
          <td>${tx.order || '—'}</td>
          <td>${tx.invoiceNumber || '—'}</td>
          <td>${AdminApp.formatDate(tx.confirmedAt || tx.createdAt)}</td>
          <td class="text-capitalize">${tx.status || 'pending'}</td>
          <td>${tx.reference || 'Manual Confirmation'}</td>
          <td>${AdminApp.formatCurrency(tx.amount)}</td>
        </tr>`
      );
    });
  };

  const filterTransactions = () => {
    const query = searchInput?.value?.toLowerCase().trim();
    if (!query) {
      renderTransactions(transactions);
      return;
    }
    const filtered = transactions.filter((tx) => {
      return (
        tx.invoiceNumber?.toLowerCase().includes(query) ||
        tx.reference?.toLowerCase().includes(query) ||
        tx.order?.toLowerCase().includes(query)
      );
    });
    renderTransactions(filtered);
  };

  const fetchTransactions = async () => {
    table.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4">
          <div class="spinner-border text-primary" role="status"></div>
        </td>
      </tr>
    `;
    try {
      const response = await AdminApp.request('/transactions/admin');
      transactions = response?.data?.transactions || [];
      renderTransactions(transactions);
    } catch (error) {
      table.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">${error.message}</td></tr>`;
    }
  };

  searchInput?.addEventListener('input', filterTransactions);
  fetchTransactions();
})();

