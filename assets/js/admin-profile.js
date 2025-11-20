(function () {
  if (!window.AdminApp) return;
  
  // Platform Settings
  const settingsForm = document.getElementById('platformSettingsForm');
  const statusTarget = document.getElementById('platformSettingsStatus');

  const renderStatus = (message, type = 'info') => {
    if (!statusTarget) return;
    statusTarget.textContent = message;
    statusTarget.className = `alert alert-${type}`;
    statusTarget.classList.remove('d-none');
  };

  const populateForm = (settings) => {
    if (!settingsForm || !settings) return;
    settingsForm.querySelector('[name="adminWhatsappNumber"]').value = settings.adminWhatsappNumber || '';
    settingsForm.querySelector('[name="orderNotificationEmail"]').value = settings.orderNotificationEmail || '';
    settingsForm.querySelector('[name="whatsappMessageTemplate"]').value =
      settings.whatsappMessageTemplate ||
      'Hello, I just placed an order with invoice {invoiceNumber}. Can you confirm payment instructions?';
  };

  const fetchSettings = async () => {
    if (!settingsForm) return;
    renderStatus('Loading settings...', 'info');
    try {
      const response = await AdminApp.request('/settings');
      populateForm(response?.data?.settings);
      statusTarget?.classList.add('d-none');
    } catch (error) {
      renderStatus(error.message || 'Unable to load settings.', 'danger');
    }
  };

  settingsForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(settingsForm);
    const payload = {
      adminWhatsappNumber: formData.get('adminWhatsappNumber'),
      orderNotificationEmail: formData.get('orderNotificationEmail'),
      whatsappMessageTemplate: formData.get('whatsappMessageTemplate'),
    };
    renderStatus('Saving changes...', 'info');
    const submitBtn = settingsForm.querySelector('button[type="submit"]');
    submitBtn && (submitBtn.disabled = true);

    try {
      const response = await AdminApp.request('/settings', { method: 'PATCH', body: payload });
      populateForm(response?.data?.settings);
      renderStatus('Settings updated successfully.', 'success');
    } catch (error) {
      renderStatus(error.message || 'Unable to save settings.', 'danger');
    } finally {
      submitBtn && (submitBtn.disabled = false);
    }
  });

  // User Profile
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (error) {
      return dateString;
    }
  };

  const formatRole = (role) => {
    if (!role) return '-';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const populateProfile = (user) => {
    if (!user) return;

    // Profile card (left side)
    const profileImage = document.getElementById('profile-image');
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');

    if (profileImage) {
      profileImage.src = user.profileImage || 'assets/images/dashboard/designer.jpg';
      profileImage.alt = `${user.name || ''} ${user.surname || ''}`.trim() || 'Profile Image';
    }

    if (profileName) {
      profileName.textContent = `${user.name || ''} ${user.surname || ''}`.trim() || 'User';
    }

    if (profileEmail) {
      profileEmail.textContent = user.email || '-';
    }

    // Account Information
    const profileRole = document.getElementById('profile-role');
    const profileStatus = document.getElementById('profile-status');
    const profileCreated = document.getElementById('profile-created');

    if (profileRole) {
      profileRole.textContent = formatRole(user.role) || '-';
    }

    if (profileStatus) {
      const status = user.isVerified ? 'Verified' : 'Unverified';
      profileStatus.textContent = status;
    }

    if (profileCreated) {
      profileCreated.textContent = formatDate(user.createdAt) || '-';
    }

    // Profile table (right side)
    const profileFirstName = document.getElementById('profile-first-name');
    const profileLastName = document.getElementById('profile-last-name');
    const profileTableEmail = document.getElementById('profile-table-email');
    const profileGender = document.getElementById('profile-gender');
    const profileMobile = document.getElementById('profile-mobile');
    const profileDob = document.getElementById('profile-dob');
    const profileAddress = document.getElementById('profile-address');

    if (profileFirstName) {
      profileFirstName.textContent = user.name || '-';
    }

    if (profileLastName) {
      profileLastName.textContent = user.surname || '-';
    }

    if (profileTableEmail) {
      profileTableEmail.textContent = user.email || '-';
    }

    if (profileGender) {
      profileGender.textContent = user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : '-';
    }

    if (profileMobile) {
      profileMobile.textContent = user.mobileNumber || '-';
    }

    if (profileDob) {
      profileDob.textContent = formatDate(user.dateOfBirth) || '-';
    }

    if (profileAddress) {
      profileAddress.textContent = user.address || '-';
    }

    // Header dropdown image
    const headerProfileImage = document.getElementById('header-profile-image');
    if (headerProfileImage) {
      headerProfileImage.src = user.profileImage || 'assets/images/dashboard/user3.jpg';
      headerProfileImage.alt = `${user.name || ''} ${user.surname || ''}`.trim() || 'Profile Image';
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await AdminApp.request('/auth/me');
      const user = response?.data?.user;
      if (user) {
        populateProfile(user);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      AdminApp.showToast && AdminApp.showToast(error.message || 'Unable to load profile.', 'danger');
    }
  };

  // Initialize
  fetchSettings();
  fetchUserProfile();
})();

