// Wait for AdminApp to be available
(function() {
  'use strict';

  // Wait for AdminApp to be loaded
  const waitForAdminApp = (callback) => {
    if (window.AdminApp) {
      callback();
    } else {
      setTimeout(() => waitForAdminApp(callback), 100);
    }
  };

  waitForAdminApp(() => {
    const form = document.getElementById('createUserForm');
    const saveBtn = document.getElementById('saveUserBtn');
    const cancelBtn = document.getElementById('cancelUserBtn');

    if (!form || !saveBtn) {
      console.error('Create user form or save button not found');
      return;
    }

    // Handle form submission
    saveBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      // Validate form
      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        AdminApp.showAlert('error', 'Please fill in all required fields correctly.');
        return;
      }

      // Get form values
      const formData = new FormData();
      
      // Required fields
      const name = document.getElementById('userName').value.trim();
      const surname = document.getElementById('userSurname').value.trim();
      const email = document.getElementById('userEmail').value.trim();
      const password = document.getElementById('userPassword').value;
      const confirmPassword = document.getElementById('userConfirmPassword').value;
      const role = document.getElementById('userRole').value;

      // Validate passwords match
      if (password !== confirmPassword) {
        AdminApp.showAlert('error', 'Passwords do not match.');
        return;
      }

      // Validate password length
      if (password.length < 6) {
        AdminApp.showAlert('error', 'Password must be at least 6 characters long.');
        return;
      }

      // Validate role is selected
      if (!role) {
        AdminApp.showAlert('error', 'Please select a role.');
        return;
      }

      // Add required fields to FormData
      formData.append('name', name);
      formData.append('surname', surname);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('confirmPassword', confirmPassword);
      formData.append('role', role);

      // Add profile image if selected
      const profileImageInput = document.getElementById('userProfileImage');
      if (profileImageInput && profileImageInput.files && profileImageInput.files.length > 0) {
        formData.append('profileImage', profileImageInput.files[0]);
      }

      // Disable button and show loading
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...';

      try {
        // Make API request
        const response = await AdminApp.request('/admin/users/add', {
          method: 'POST',
          body: formData,
          // Don't set Content-Type header - browser will set it with boundary for FormData
        });

        if (response.success) {
          AdminApp.showAlert('success', response.message || 'User created successfully!');
          
          // Reset form
          form.reset();
          form.classList.remove('was-validated');
          
          // Redirect to user list after 1.5 seconds
          setTimeout(() => {
            window.location.href = 'user-list.html';
          }, 1500);
        } else {
          AdminApp.showAlert('error', response.message || 'Failed to create user.');
          saveBtn.disabled = false;
          saveBtn.innerHTML = 'Save';
        }
      } catch (error) {
        console.error('Error creating user:', error);
        AdminApp.showAlert('error', error.message || 'An error occurred while creating the user.');
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Save';
      }
    });

    // Handle cancel button
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
          window.location.href = 'user-list.html';
        }
      });
    }

    // Real-time password validation
    const passwordInput = document.getElementById('userPassword');
    const confirmPasswordInput = document.getElementById('userConfirmPassword');

    if (confirmPasswordInput) {
      confirmPasswordInput.addEventListener('input', () => {
        if (confirmPasswordInput.value && passwordInput.value !== confirmPasswordInput.value) {
          confirmPasswordInput.setCustomValidity('Passwords do not match');
        } else {
          confirmPasswordInput.setCustomValidity('');
        }
      });
    }

    if (passwordInput) {
      passwordInput.addEventListener('input', () => {
        if (confirmPasswordInput && confirmPasswordInput.value) {
          if (passwordInput.value !== confirmPasswordInput.value) {
            confirmPasswordInput.setCustomValidity('Passwords do not match');
          } else {
            confirmPasswordInput.setCustomValidity('');
          }
        }
      });
    }
  });
})();

