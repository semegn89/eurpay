// === Авторизация ===
window.handleLoginForm = async (e) => {
  const form = e.target;
  const email = form.modalEmail.value;
  const password = form.modalPassword.value;

  localStorage.setItem('token', 'devtoken');
  localStorage.setItem('currentUser', JSON.stringify({email, role: email === 'admin@mail.com' ? 'admin' : 'user'}));
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.removeItem('logoutOnce');
  document.body.classList.add('logged-in');
  closeModal(document.getElementById('loginModal'));
  if (typeof renderMainSiteContent === 'function') renderMainSiteContent();
  if (window.loadPage) window.loadPage('payments');
  showToast('🎉 Вход выполнен (dev)', 'success');
};

// === Регистрация (можно оставить, если нужна) ===
window.handleRegisterForm = async (e) => {
  const form = e.target;
  // Тут можно добавить валидацию, если нужно
  const email = form.rEmail.value;
  const pass1 = form.rPassword.value;
  const pass2 = form.rPassword2.value;

  if (pass1 !== pass2) {
    alert('❌ Пароли не совпадают');
    return;
  }
  if (!email || pass1.length < 6) {
    alert('❌ Заполните email и пароль не короче 6 символов');
    return;
  }

  // DEV-режим: просто имитируем регистрацию
  alert('✅ Регистрация успешна. Теперь войдите.');
  form.reset();

  document.getElementById('registerModal').style.display = 'none';
  document.getElementById('registerModal').setAttribute('hidden', '');
  document.getElementById('loginModal').style.display = 'flex';
  document.getElementById('loginModal').removeAttribute('hidden');
};

document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const loginModal = document.getElementById('loginModal');
  const registerModal = document.getElementById('registerModal');
  const switchToLoginBtn = document.getElementById('switchToLogin');
  const switchToRegisterBtn = document.getElementById('switchToRegister');
  const closeBtns = document.querySelectorAll('.modal-close');

  if (!loginBtn || !registerBtn || !loginModal || !registerModal) {
    console.warn('❗ Modal elements not found in DOM');
    return;
  }

  // Открытие модалок
  loginBtn.addEventListener('click', () => {
    loginModal.classList.add('active');
    loginModal.removeAttribute('hidden');
    loginModal.style.display = 'flex';
  });

  registerBtn.addEventListener('click', () => {
    registerModal.classList.add('active');
    registerModal.removeAttribute('hidden');
    registerModal.style.display = 'flex';
  });

  // Переключение между модалками
  if (switchToLoginBtn) {
    switchToLoginBtn.addEventListener('click', () => {
      registerModal.classList.remove('active');
      registerModal.setAttribute('hidden', '');
      registerModal.style.display = 'none';

      loginModal.classList.add('active');
      loginModal.removeAttribute('hidden');
      loginModal.style.display = 'flex';
    });
  }

  if (switchToRegisterBtn) {
    switchToRegisterBtn.addEventListener('click', () => {
      loginModal.classList.remove('active');
      loginModal.setAttribute('hidden', '');
      loginModal.style.display = 'none';

      registerModal.classList.add('active');
      registerModal.removeAttribute('hidden');
      registerModal.style.display = 'flex';
    });
  }

  // Закрытие модалок
  closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('hidden', '');
        modal.style.display = 'none';
      }
    });
  });

  // Обработка login
  const loginForm = loginModal.querySelector('#loginForm');
  if (loginForm && !loginForm.dataset.listenerAttached) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await window.handleLoginForm(e);
    });
    loginForm.dataset.listenerAttached = 'true';
  }

  // Обработка register
  const registerForm = document.getElementById('registerForm');
  if (registerForm && !registerForm.dataset.listenerAttached) {
    registerForm.addEventListener('submit', async e => {
      e.preventDefault();
      await window.handleRegisterForm(e);
    });
    registerForm.dataset.listenerAttached = 'true';
  }
});