(function () {
  const table = document.querySelector('table.all-package tbody');
  if (!table || !window.AdminApp) return;

  const searchInput = document.getElementById('userSearchInput') || 
                       document.querySelector('.search-form input[type="search"]');
  const refreshBtn = document.querySelector('[data-refresh-users]');
  let users = [];
  let currentPage = 1;
  let totalPages = 1;
  let isLoading = false;

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
      }
      if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} ${months === 1 ? 'month' : 'months'} ago`;
      }
      const years = Math.floor(diffDays / 365);
      return `${years} ${years === 1 ? 'year' : 'years'} ago`;
    } catch (e) {
      return '—';
    }
  };

  const formatRole = (role) => {
    if (!role) return 'Customer';
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  };

  const renderRoleBadge = (role) => {
    const normalized = (role || 'customer').toLowerCase();
    const map = {
      admin: 'badge-danger',
      customer: 'badge-primary',
      client: 'badge-success',
    };
    const badge = map[normalized] || 'badge-secondary';
    const label = formatRole(role);
    return `<span class="badge ${badge}">${label}</span>`;
  };

  const getAvatarUrl = (user) => {
    if (user.avatar) {
      // If avatar is a full URL, return it
      if (user.avatar.startsWith('http')) return user.avatar;
      // If avatar is a path, construct full URL
      return user.avatar.startsWith('/') ? `${window.location.origin}${user.avatar}` : `${window.location.origin}/${user.avatar}`;
    }
    // Default avatar
    return 'assets/images/dashboard/user.jpg';
  };

  const renderUsers = (list) => {
    if (!list.length) {
      table.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4">
            <div class="d-flex flex-column align-items-center">
              <i data-feather="users" class="mb-2" style="width: 48px; height: 48px; opacity: 0.3;"></i>
              <p class="mb-0 text-muted">No users found.</p>
            </div>
          </td>
        </tr>
      `;
      if (window.feather) window.feather.replace();
      return;
    }

    table.innerHTML = '';

    list.forEach((user, index) => {
      const firstName = user.name || 'N/A';
      const lastName = user.surname || '';
      const email = user.email || '—';
      const lastLogin = formatDate(user.lastLogin || user.updatedAt);
      const role = renderRoleBadge(user.role);
      const avatarUrl = getAvatarUrl(user);
      const userId = user._id || index + 1;

      table.insertAdjacentHTML(
        'beforeend',
        `<tr data-row-id="${userId}">
          <td>
            <input
              class="checkbox_animated check-it"
              type="checkbox"
              value=""
              id="flexCheckDefault${index}"
              data-id="${userId}"
            />
          </td>
          <td>
            <img src="${avatarUrl}" alt="${firstName} ${lastName}" 
                 onerror="this.src='assets/images/dashboard/user.jpg'" 
                 style="width: 40px; height: 40px; object-fit: cover; border-radius: 50%;" />
          </td>
          <td>${firstName}</td>
          <td>${lastName}</td>
          <td>${email}</td>
          <td>${lastLogin}</td>
          <td>${role}</td>
        </tr>`
      );
    });

    if (window.feather) window.feather.replace();
  };

  const filterUsers = () => {
    const query = searchInput?.value?.toLowerCase().trim();
    if (!query) {
      renderUsers(users);
      return;
    }
    const filtered = users.filter((user) => {
      const firstName = (user.name || '').toLowerCase();
      const lastName = (user.surname || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const role = (user.role || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();
      
      return (
        firstName.includes(query) ||
        lastName.includes(query) ||
        email.includes(query) ||
        role.includes(query) ||
        fullName.includes(query)
      );
    });
    renderUsers(filtered);
  };

  const loadUsers = async (page = 1) => {
    if (isLoading) return;
    
    try {
      isLoading = true;
      const tbody = table;
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center py-4">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <p class="mt-2 mb-0 text-muted">Loading users...</p>
            </td>
          </tr>
        `;
      }

      const response = await AdminApp.request(`/admin/users?page=${page}&limit=20&sort=-createdAt`);
      
      if (response.success && response.data) {
        users = response.data.users || [];
        currentPage = response.data.currentPage || 1;
        totalPages = response.data.totalPages || 1;
        
        renderUsers(users);
        updatePagination();
      } else {
        throw new Error(response.message || 'Failed to load users');
      }
    } catch (error) {
      console.error('[User List] Error loading users:', error);
      table.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4">
            <div class="d-flex flex-column align-items-center">
              <i data-feather="alert-circle" class="mb-2 text-danger" style="width: 48px; height: 48px;"></i>
              <p class="mb-0 text-danger">${error.message || 'Failed to load users'}</p>
              <button class="btn btn-sm btn-primary mt-2" onclick="location.reload()">Retry</button>
            </div>
          </td>
        </tr>
      `;
      if (window.feather) window.feather.replace();
      if (window.AdminApp && window.AdminApp.showAlert) {
        AdminApp.showAlert('error', error.message || 'Failed to load users');
      }
    } finally {
      isLoading = false;
    }
  };

  const updatePagination = () => {
    // TODO: Add pagination controls if needed
    console.log(`[User List] Page ${currentPage} of ${totalPages}, ${users.length} users`);
  };

  // Search input handler
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        filterUsers();
      }, 300);
    });
  }

  // Refresh button handler
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadUsers(currentPage);
    });
  }

  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => loadUsers(1), 500);
    });
  } else {
    setTimeout(() => loadUsers(1), 500);
  }
})();

