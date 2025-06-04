// ==== CABINET_MODULES и динамический импорт ====
const CABINET_MODULES = {
  payments: "./payments.js",
  stats: "./stats.js",
  documents: "./documents.js",
  rates: "./rates.js",
  templates: "./templates.js",
  adminPanel: "./adminPanel.js",
  userCabinet: "./First.js",
  userChat: "./userChat.js",
};

async function importCabinetPage(pageKey) {
  const path = CABINET_MODULES[pageKey];
  if (!path) return null;
  try {
    return await import(path);
  } catch (err) {
    console.warn(`Не удалось загрузить модуль ${pageKey}:`, err);
    return null;
  }
}

async function tryRenderRealPage(pageKey) {
  const mod = await importCabinetPage(pageKey);
  if (!mod) return false;
  console.log('🔁 Загружаем модуль:', pageKey, mod);
  const fnName = pageKey === 'adminPanel'
  ? 'renderAdminPanel'
  : 'render' + pageKey[0].toUpperCase() + pageKey.slice(1) + 'Page';
  if (typeof mod[fnName] === 'function') {
    await mod[fnName]();
    return true;
  }
  return false;
}

// === ДОБАВЬ В loadPage такую логику ===
window.loadPage = async function (pageKey) {
  let ok = false;
  // 1. Попытаться загрузить через import (если используешь динамический импорт)
  if (typeof importCabinetPage === 'function') {
    const mod = await importCabinetPage(pageKey);
    const fnName = pageKey === 'adminPanel'
      ? 'renderAdminPanel'
      : 'render' + pageKey[0].toUpperCase() + pageKey.slice(1) + 'Page';
    if (mod && typeof mod[fnName] === 'function') {
      await mod[fnName]();
      ok = true;
    }
    // FALLBACK на window, если не сработало
    if (!ok && typeof window[fnName] === 'function') {
      await window[fnName]();
      ok = true;
    }
  } else {
    // Если динамического импорта нет — всегда ищи на window
    const fnName = pageKey === 'adminPanel'
      ? 'renderAdminPanel'
      : 'render' + pageKey[0].toUpperCase() + pageKey.slice(1) + 'Page';
    if (typeof window[fnName] === 'function') {
      await window[fnName]();
      ok = true;
    }
  }

  if (!ok) {
    console.warn(`⚠️ Модуль ${pageKey} не отрендерился`);
  }
};

console.log('🔥 main1.js ЗАПУЩЕН');

// === АВТОВХОД ДЛЯ РАЗРАБОТКИ ===
if (!localStorage.getItem('isLoggedIn') && !localStorage.getItem('logoutOnce')) {
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('currentUser', JSON.stringify({email: 'test@mail.com', role: 'user'}));
}

// ===== renderErrorPage =====
function renderErrorPage(err) {
  document.body.innerHTML = `
    <div class="error-container" style="min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:1rem;font-family:Inter,sans-serif;">
      <h1 style="font-size:2rem;color:#EF4444;">Произошла ошибка</h1>
      <p>${err.message}</p>
      <button style="padding:.75rem 1.5rem;border:none;border-radius:6px;background:#2563EB;color:#fff;font-weight:600;cursor:pointer;" onclick="location.reload()">Перезагрузить страницу</button>
    </div>`;
}

// ===== Курсы валют =====
// Ключ для выбранной админом даты
const RATES_DATE_KEY = 'ratesSelectedDate';
function getRatesSelectedDate() {
  let date = localStorage.getItem(RATES_DATE_KEY);
  if (!date) {
    date = new Date().toISOString().slice(0, 10);
    localStorage.setItem(RATES_DATE_KEY, date);
  }
  return date;
}
function setRatesSelectedDate(date) {
  localStorage.setItem(RATES_DATE_KEY, date);
}

// Храним курсы валют для каждой даты: {"2024-06-03":{"USD":90.5,"EUR":98.7,"CNY":12.4,"GBP":111.2}}
const RATES_VALUES_KEY = 'ratesByDate';
function getRatesByDate(date) {
  const all = JSON.parse(localStorage.getItem(RATES_VALUES_KEY) || '{}');
  return all[date] || {};
}
function setRatesByDate(date, ratesObj) {
  const all = JSON.parse(localStorage.getItem(RATES_VALUES_KEY) || '{}');
  all[date] = ratesObj;
  localStorage.setItem(RATES_VALUES_KEY, JSON.stringify(all));
}

// ===== Рендер страницы курсов валют =====
window.renderRatesPage = function() {
  const details = document.querySelector('.details');
  // Новое определение роли пользователя:
  const userRaw = localStorage.getItem('currentUser');
  const user = userRaw ? JSON.parse(userRaw) : null;
  const isAdmin = user && user.role && user.role.toLowerCase() === 'admin';
  let selectedDate = getRatesSelectedDate();
  let rates = getRatesByDate(selectedDate);
  // Валюты по умолчанию
  const currencyList = ['USD', 'EUR', 'CNY', 'GBP', 'AED', 'RUB'];

  function rerender() {
    selectedDate = getRatesSelectedDate();
    rates = getRatesByDate(selectedDate);
    let dateSelector = '';
    if (isAdmin) {
      dateSelector = `<input type="date" id="ratesDateInput" value="${selectedDate}" style="font-size:1.1rem;padding:4px 8px;border-radius:6px;border:1px solid #c5dcf7;margin-left:10px;">`;
    } else {
      dateSelector = `<span style="margin-left:10px;font-size:1.1rem;color:#0057ff;">${selectedDate}</span>`;
    }
    let ratesRows = currencyList.map(cur => {
      const val = rates[cur] !== undefined ? rates[cur] : '';
      if (isAdmin) {
        return `<tr>
          <td style="padding:8px 14px;">${cur}</td>
          <td style="padding:8px 14px;">
            <input type="number" step="0.01" min="0" class="rate-input" data-cur="${cur}" value="${val}" style="width:90px;padding:5px 8px;border-radius:6px;border:1px solid #c5dcf7;">
          </td>
        </tr>`;
      } else {
        return `<tr>
          <td style="padding:8px 14px;">${cur}</td>
          <td style="padding:8px 14px;">
            <span>${val !== '' ? val : '-'}</span>
          </td>
        </tr>`;
      }
    }).join('');
    let saveBtn = isAdmin
      ? `<button id="saveRatesBtn" class="button" style="margin-top:14px;">Сохранить курсы</button>`
      : '';
    details.innerHTML = `
      <div style="margin-bottom:18px;text-align:center;">
        <h2 style="font-size:1.5rem;font-weight:700;">Курсы валют на ${selectedDate}</h2>
        <div style="margin-bottom:18px;">
          ${isAdmin ? 'Выберите дату:' : 'Дата установлена администратором:'}
          ${dateSelector}
        </div>
      </div>
      <div style="display:flex;justify-content:center;">
        <table style="border-collapse:separate;border-spacing:0 7px;background:#f6faff;padding:18px 28px;border-radius:15px;">
          <thead>
            <tr style="font-weight:700;">
              <th style="padding:8px 14px;">Валюта</th>
              <th style="padding:8px 14px;">Курс</th>
            </tr>
          </thead>
          <tbody>
            ${ratesRows}
          </tbody>
        </table>
      </div>
      <div style="text-align:center;">
        ${saveBtn}
      </div>
      <div style="text-align:center;color:#aaa;font-size:0.96rem;margin-top:18px;">
        Курсы валют устанавливаются администратором и доступны всем пользователям.
      </div>
    `;
    // Слушатели (только для админа)
    if (isAdmin) {
      details.querySelector('#ratesDateInput').addEventListener('change', e => {
        setRatesSelectedDate(e.target.value);
        rerender();
      });
      details.querySelector('#saveRatesBtn').onclick = () => {
        const newRates = {};
        details.querySelectorAll('.rate-input').forEach(inp => {
          const cur = inp.dataset.cur;
          const val = inp.value;
          if (val !== '') newRates[cur] = parseFloat(val);
        });
        setRatesByDate(selectedDate, newRates);
        showToast('Курсы валют сохранены!', 'success');
        rerender();
      };
    }
  }
  rerender();
};

// ===== hidePreloader =====
function hidePreloader() {
  const preloader = document.querySelector('.preloader');
  if (!preloader) return;

  preloader.classList.add('fade-out');

  preloader.addEventListener('transitionend', () => preloader.remove(), { once: true });

  setTimeout(() => {
    if (document.body.contains(preloader)) preloader.remove();
  }, 1000);
}
// ===== initCounters =====
function initCounters() {
  const counters = document.querySelectorAll(".counter");
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          animateCounter(e.target);
          observer.unobserve(e.target);
        }
      }),
    { threshold: 0.5 }
  );

  counters.forEach((el) => observer.observe(el));
}

function animateCounter(el) {
  const target = +el.getAttribute("data-count");
  const duration = 2000;
  const step = target / (duration / 16);
  let current = 0;
  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      clearInterval(timer);
      current = target;
    }
    el.textContent = Math.floor(current).toString();
  }, 16);
}
// ===== initThemeSwitcher =====
function initThemeSwitcher() {
  const btn = document.getElementById("toggleDarkMode");
  if (!btn) return;

  const icon = btn.querySelector("i");

  const updateIcon = () => {
    if (icon) icon.className = document.body.classList.contains('dark-mode')
      ? "fas fa-sun" : "fas fa-moon";
  };

  btn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    updateIcon();
    localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
  });

  // При загрузке страницы — инициализируем тему
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
  }

  updateIcon();
}

// ===== initMobileMenu =====
function initMobileMenu() {
  const btn = document.getElementById("hamburgerBtn");
  const nav = document.getElementById("mobileNav");
  if (!btn || !nav) return;

  btn.addEventListener("click", () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    btn.classList.toggle("active");
    nav.classList.toggle("active");
    const isOpen = nav.classList.contains("active");
    if (isOpen) {
      nav.removeAttribute("hidden");
      document.body.classList.add("no-scroll");
    } else {
      nav.setAttribute("hidden", "");
      document.body.classList.remove("no-scroll");
    }
  });
}

// ===== toggleLoggedInUI =====
function toggleLoggedInUI(loggedIn) {
  document.querySelectorAll('.auth-link').forEach(link => {
    const isLogout = link.id?.toLowerCase().includes('logout');
    link.style.display = loggedIn ? (isLogout ? 'block' : 'none') : (!isLogout ? 'block' : 'none');
  });
}

// ===== showToast =====
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.getElementById('toastContainer')?.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ====== ЛОГИН (и сброс маркера logoutOnce) ======
window.handleLoginForm = async function (e) {
  e.preventDefault();
  const email = document.getElementById('modalEmail')?.value.trim();
  localStorage.setItem('currentUser', JSON.stringify({
    email,
    role: email === 'admin@mail.com' ? 'admin' : 'user'
  }));
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.removeItem('logoutOnce');
  document.body.classList.add('logged-in');
  closeModal(document.getElementById('loginModal'));
  showToast('🎉 Вход выполнен (dev)', 'success');
  window.dispatchEvent(new CustomEvent('authChanged'));
};

// ===== updateAuthUI =====
function updateAuthUI() {
  const userRaw = localStorage.getItem('currentUser');
  const user = userRaw ? JSON.parse(userRaw) : null;

  toggleLoggedInUI(!!user);

  if (user?.role === 'admin') {
    document.querySelector('[data-page="adminPanel"]')?.classList.remove('hidden');
    window.loadPage?.('adminPanel');
  } else {
    document.querySelector('[data-page="adminPanel"]')?.classList.add('hidden');
  }
}

window.addEventListener('authChanged', () => {
  updateAuthUI?.();
});
  

window.debugLoginFlow = async () => {
  console.log('🧪 Тест: старт');

  const user = {
    email: 'admin@mail.ru',
    role: 'admin',
    password: '123456',
    feePercent: 0,
    currentBalance: 0,
    directorName: '',
    agreementNo: '',
    agreementDate: ''
  };

  try {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.removeItem('logoutOnce');
    console.log('📍 [4] добавляем logged-in и рендерим');
    document.body.classList.add('logged-in');
    renderMainSiteContent();

    console.log('📍 [5] загружаем adminPanel');
    window.loadPage?.('adminPanel');
  } catch (err) {
    console.error('❌ Ошибка в debugLoginFlow:', err);
  }
};


// Показывает основной кабинет (отлаженная версия)
function renderMainSiteContent() {
  console.log('🧩 renderMainSiteContent ВЫЗВАН (внутри)');
  try {
    const content = document.getElementById('content');
    if (content) {
      content.style.display = '';
      console.log('✅ content включен');
    }

    const cabinetCss = document.getElementById('cabinetCss');
    if (cabinetCss) {
      cabinetCss.removeAttribute('disabled');
      console.log('✅ cabinetCss включен');
    }

    document.querySelector('footer.footer')?.style.setProperty('display', 'none');
    hidePreloader();

    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user?.role === 'admin') {
      window.loadPage?.('adminPanel');
    } else {
      window.loadPage?.('userCabinet'); // ✅ для обычных пользователей
    }
  } catch (err) {
    console.error('❌ Ошибка в renderMainSiteContent:', err);
  }
}

// Показывает лендинг (заменяет renderLandingPageContent)
function renderLandingPageContent() {
  document.querySelectorAll(".landing-section, .hero, header.header, footer.footer")
          .forEach((el) => (el.style.display = "block"));
  document.body.classList.remove("logged-in");
  document.getElementById("content")?.style.setProperty("display", "none");
  document.body.style.overflow = "";
  // Показать футер, как в старой версии
  document.querySelector('footer.footer')?.style.setProperty('display', 'block');
}

// Простейшие версии open/close модалок для совместимости
window.openModal = function(modal) {
  if (!modal) return;
  modal.style.display = 'flex';
  modal.classList.add('active');
  modal.removeAttribute('hidden');
  document.body.classList.add('no-scroll');
};

window.closeModal = function(modal) {
  if (!modal) return;
  modal.style.display = 'none';
  modal.classList.remove('active');
  document.body.classList.remove('no-scroll');
  modal.setAttribute('hidden', '');
};

window.closeAllModals = function() {
  document.querySelectorAll(".modal.active").forEach((m) => closeModal(m));
};

console.log('🧪 main1.js готов. handleLoginForm зарегистрирован');

// ====== Важно: обработчики всех кнопок "Выход" ======
document.getElementById('logoutBtn')?.addEventListener('click', function() {
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('currentUser');
  localStorage.setItem('logoutOnce', 'true');
  location.reload();
});
document.getElementById('logoutBtnMobile')?.addEventListener('click', function() {
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('currentUser');
  localStorage.setItem('logoutOnce', 'true');
  location.reload();
});
document.getElementById('logoutSidebar')?.addEventListener('click', function() {
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('currentUser');
  localStorage.setItem('logoutOnce', 'true');
  location.reload();
});

// ===== initNavigation =====
function initNavigation() {
  // Smooth scroll
  document
    .querySelectorAll('header .nav-item[href^="#"]')
    .forEach((a) => {
      a.addEventListener("click", (e) => {
        const href = a.getAttribute("href");
        if (href && href !== "#") {
          e.preventDefault();
          const tgt = document.querySelector(href);
          if (tgt) {
            tgt.scrollIntoView({ behavior: "smooth" });
            const nav = document.getElementById("mobileNav");
            if (nav?.classList.contains("active"))
              document.getElementById("hamburgerBtn")?.click();
          }
        }
      });
    });
  }
  // Icons в кабинете

// Привязка кнопок выхода и инициализация навигации
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initThemeSwitcher();
  initMobileMenu();
  initCounters();
});

// ======= Автоматический запуск сессии для dev =======
if (localStorage.getItem('isLoggedIn') === 'true') {
  document.body.classList.add('logged-in');
  renderMainSiteContent();

  try {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user?.role === 'admin') {
      window.loadPage?.('adminPanel');
    } else {
      window.loadPage?.('userCabinet'); // 👉 теперь обычный пользователь попадает в Личный кабинет
    }
  } catch (e) {
    console.warn('⚠️ Ошибка чтения currentUser при рендере');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const descriptions = {
    transfers: "Быстрые и безопасные международные переводы с прозрачными тарифами, отслеживанием статуса и персональной поддержкой.",
    business: "Решения для юридических лиц: экспорт, импорт, расчёты с зарубежными партнёрами. Персональный менеджер и выгодные условия.",
    payment: "Комплексное сопровождение сделок. Контроль каждого этапа перевода и уведомления о статусах.",
    currency: "Конвертация валют с фиксированным курсом. Защита от волатильности и лучшие предложения по рынку.",
    consulting: "Финансовые консультации по международным операциям, валютному контролю и налоговым вопросам.",
    mobile: "Удобные переводы с мобильного — Telegram, WhatsApp, мобильное приложение EUROPAY."
  };

  document.querySelectorAll('.service-link[data-service]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const key = btn.dataset.service;
      const modal = document.getElementById('serviceModal');
      const content = document.getElementById('serviceModalContent');
      content.textContent = descriptions[key] || "Описание услуги временно недоступно.";
      modal.style.display = 'flex';
      modal.removeAttribute('hidden');
    });
  });

  document.querySelector('#serviceModal .modal-close')?.addEventListener('click', () => {
    const modal = document.getElementById('serviceModal');
    modal.style.display = 'none';
    modal.setAttribute('hidden', '');
  });

  document.getElementById('serviceModal')?.addEventListener('click', e => {
    if (e.target.id === 'serviceModal') {
      e.currentTarget.style.display = 'none';
      e.currentTarget.setAttribute('hidden', '');
    }
  });
});
// --- Локальное хранилище истории чата по email ---
const supportChatKey = 'supportChatHistory';
function getChatHistory() {
  return JSON.parse(localStorage.getItem(supportChatKey) || '[]');
}
function saveChatHistory(arr) {
  localStorage.setItem(supportChatKey, JSON.stringify(arr));
}

// --- UI и автообновление ---
const openChatBtn = document.getElementById('openChatBtn');
const supportChatModal = document.getElementById('supportChatModal');
const closeSupportChat = document.getElementById('closeSupportChat');
const chatMessages = document.getElementById('chatMessages');
const chatInputForm = document.getElementById('chatInputForm');
const chatInput = document.getElementById('chatInput');
const emptyChatText = document.getElementById('emptyChatText');

function renderChatMessages() {
  const arr = getChatHistory();
  chatMessages.innerHTML = '';
  if (!arr.length) {
    emptyChatText.style.display = '';
    return;
  }
  emptyChatText.style.display = 'none';
  arr.forEach(msg => {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'support-msg ' + (msg.from === 'user' ? 'user' : '');
    msgDiv.innerHTML = `
      <div class="support-bubble">${msg.text}</div>
      <div class="support-msg-meta">${msg.from === 'user' ? 'Вы' : 'Админ'} · ${new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
    `;
    chatMessages.appendChild(msgDiv);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Открытие/закрытие чата
openChatBtn.onclick = () => {
  supportChatModal.style.display = 'flex';
  supportChatModal.removeAttribute('hidden');
  setTimeout(renderChatMessages, 40);
};
closeSupportChat.onclick = () => {
  supportChatModal.style.display = 'none';
  supportChatModal.setAttribute('hidden', '');
};

// Автообновление чата (каждые 2 секунды)
setInterval(() => {
  if (!supportChatModal || supportChatModal.style.display !== 'flex') return;
  renderChatMessages();
}, 2000);

// Отправка сообщения
chatInputForm.onsubmit = (e) => {
  e.preventDefault();
  const val = chatInput.value.trim();
  if (!val) return;
  const arr = getChatHistory();
  arr.push({ from: 'user', text: val, timestamp: Date.now() });
  saveChatHistory(arr);
  chatInput.value = '';
  renderChatMessages();
  // Для демонстрации — можно сымитировать автоответ:
  setTimeout(() => {
    const arr2 = getChatHistory();
    arr2.push({ from: 'admin', text: 'Спасибо за обращение! Мы скоро ответим.', timestamp: Date.now() });
    saveChatHistory(arr2);
    renderChatMessages();
  }, 1200);
};

// Автоматически скроллит чат вниз после открытия
supportChatModal.addEventListener('transitionend', () => {
  if (supportChatModal.style.display === 'flex') renderChatMessages();
});
window.renderAdminChats = function () {
  const details = document.querySelector('.details');
  const allChats = JSON.parse(localStorage.getItem('adminChats') || '{}');
  const users = Object.keys(allChats);

  // Левая колонка — список чатов, справа — чат
  details.innerHTML = `
    <div style="display: flex; gap: 24px;">
      <div style="min-width: 260px; max-width: 340px;">
        <h2 style="font-size:1.18rem;margin-bottom:12px;">Пользователи</h2>
        <input id="adminChatSearch" type="text" placeholder="Поиск по email..." style="width:100%;padding:8px 9px;margin-bottom:9px;border-radius:8px;border:1px solid #c5dcf7;">
        <button id="adminBroadcastBtn" class="button" style="width:100%;margin-bottom:13px;">Отправить всем</button>
        <div id="adminChatsList"></div>
      </div>
      <div style="flex:1;min-width:320px;">
        <div id="adminChatDialog" style="display:none;"></div>
      </div>
    </div>
  `;
  const chatsList = details.querySelector('#adminChatsList');
  const chatDialog = details.querySelector('#adminChatDialog');
  const searchInput = details.querySelector('#adminChatSearch');
  const broadcastBtn = details.querySelector('#adminBroadcastBtn');

  let currentUser = null;

  function filterUsers(searchTerm) {
    if (!searchTerm) return users;
    const q = searchTerm.trim().toLowerCase();
    return users.filter(email => email.toLowerCase().includes(q));
  }

  function renderUserList(searchTerm = '') {
    const filtered = filterUsers(searchTerm);
    if (!filtered.length) {
      chatsList.innerHTML = '<p style="margin-top:18px;color:#888">Нет чатов с пользователями.</p>';
      return;
    }
    chatsList.innerHTML = filtered.map(email => `
      <div class="admin-chat-card" style="cursor:pointer;margin-bottom:9px;">
        <div class="chat-card-title">${email}</div>
        <div class="chat-card-lastmsg">${allChats[email].length ? allChats[email][allChats[email].length-1].text : ''}</div>
      </div>
    `).join('');
    chatsList.querySelectorAll('.admin-chat-card').forEach((el, idx) => {
      el.onclick = () => {
        currentUser = filtered[idx];
        renderAdminChatDialog(currentUser);
      };
    });
  }

  function renderAdminChatDialog(email) {
    // Отрисовывает чат в едином стиле
    chatDialog.style.display = '';
    chatDialog.innerHTML = `
      <div class="chat-container">
        <div style="margin-bottom:10px;"><button id="backToListBtn" class="button button-outline">Назад</button> <b>${email}</b></div>
        <div class="chat-messages"></div>
        <form class="chat-input-row">
          <button type="button" class="attach-btn" title="Прикрепить файл">📎</button>
          <input type="file" class="hidden-file" style="display:none;">
          <input type="text" placeholder="Введите сообщение...">
          <button type="submit">Отправить</button>
        </form>
        <div class="selected-file-name" style="font-size:0.96em;color:#555;margin-top:2px;min-height:20px;"></div>
      </div>
    `;
    const chatMessages = chatDialog.querySelector('.chat-messages');
    const chatForm = chatDialog.querySelector('.chat-input-row');
    const chatInput = chatForm.querySelector('input[type="text"]');
    const fileInput = chatForm.querySelector('input[type="file"]');
    const attachBtn = chatForm.querySelector('.attach-btn');
    const fileNameDiv = chatDialog.querySelector('.selected-file-name');
    const backBtn = chatDialog.querySelector('#backToListBtn');
    let chatArr = allChats[email] || [];
    function renderMessages(arr) {
      // Проверка, был ли скролл внизу
      const isAtBottom = Math.abs(chatMessages.scrollTop + chatMessages.clientHeight - chatMessages.scrollHeight) < 5;
      chatMessages.innerHTML = '';
      arr.forEach(msg => {
        const who = msg.from === 'admin' ? 'admin' : 'user';
        const name = who === 'admin' ? "Вы" : email;
        const text = msg.fileName
          ? `<a href="${msg.fileData}" class="file-link" download="${msg.fileName}">${msg.fileName}</a>`
          : msg.text;
        const div = document.createElement('div');
        div.className = `chat-bubble ${who}`;
        div.innerHTML = `
          <div class="text">${text}</div>
          <div class="meta"><span class="author">${name}</span> ${msg.date || ''}</div>
        `;
        chatMessages.appendChild(div);
      });
      // Только если был внизу — скроллим вниз, иначе не трогаем (можно читать историю)
      if (isAtBottom) chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) {
        fileNameDiv.textContent = `Выбрано: ${fileInput.files[0].name}`;
      } else {
        fileNameDiv.textContent = '';
      }
    });
    attachBtn.addEventListener('click', () => fileInput.click());
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const txt = chatInput.value.trim();
      const file = fileInput.files[0];
      if (!txt && !file) return;
      let msgObj = {
        userEmail: email,
        from: 'admin',
        text: txt,
        fileName: '',
        fileData: '',
        date: new Date().toLocaleString(),
        timestamp: Date.now(),
        readByAdmin: true,
        readByUser: false
      };
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          msgObj.fileName = file.name;
          msgObj.fileData = ev.target.result;
          chatArr.push(msgObj);
          allChats[email] = chatArr;
          localStorage.setItem('adminChats', JSON.stringify(allChats));
          fileInput.value = '';
          fileNameDiv.textContent = '';
          chatInput.value = '';
          renderMessages(chatArr);
        };
        reader.readAsDataURL(file);
      } else {
        chatArr.push(msgObj);
        allChats[email] = chatArr;
        localStorage.setItem('adminChats', JSON.stringify(allChats));
        chatInput.value = '';
        renderMessages(chatArr);
      }
    });
    function markUserMessagesRead() {
      let wasUnread = false;
      chatArr.forEach(msg => {
        if (msg.from === 'user' && !msg.readByAdmin) {
          msg.readByAdmin = true;
          wasUnread = true;
        }
      });
      if (wasUnread) {
        allChats[email] = chatArr;
        localStorage.setItem('adminChats', JSON.stringify(allChats));
      }
    }
    markUserMessagesRead();
    // Автообновление (каждые 2.5 сек)
    let chatInterval = setInterval(() => {
      const newChats = JSON.parse(localStorage.getItem('adminChats') || '{}');
      chatArr = newChats[email] || [];
      renderMessages(chatArr);
      markUserMessagesRead();
    }, 2500);
    // Остановка при возврате назад
    backBtn.onclick = () => {
      clearInterval(chatInterval);
      chatDialog.innerHTML = '';
      chatDialog.style.display = 'none';
      chatsList.style.display = '';
    };
    renderMessages(chatArr);
    chatsList.style.display = 'none';
    chatDialog.style.display = '';
  }

  // --- Поиск ---
  searchInput.addEventListener('input', (e) => {
    renderUserList(e.target.value);
  });

  // Массовая рассылка
  broadcastBtn.onclick = () => {
    const msg = prompt('Введите текст сообщения, которое отправить всем пользователям:');
    if (!msg) return;
    users.forEach(email => {
      if (!allChats[email]) allChats[email] = [];
      allChats[email].push({
        from: 'admin',
        text: msg,
        fileName: '',
        fileData: '',
        date: new Date().toLocaleString(),
        timestamp: Date.now(),
        readByAdmin: true,
        readByUser: false
      });
    });
    localStorage.setItem('adminChats', JSON.stringify(allChats));
    renderUserList(searchInput.value);
    alert('Сообщение отправлено всем пользователям!');
  };

  renderUserList();
};
window.renderTutorialsPage = function() {
  const details = document.querySelector('.details');
  details.innerHTML = `
    <h1 style="margin-bottom:22px;">Обучающие материалы</h1>
    <div style="display: flex; flex-wrap: wrap; gap: 20px;">
      <div style="background:#f6faff;border-radius:13px;padding:18px;flex:1 1 260px;min-width:260px;">
        <b>Видео: Как заполнить платёж</b><br>
        <iframe width="100%" height="180" src="https://www.youtube.com/embed/ВидеоID1" frameborder="0" allowfullscreen style="border-radius:10px;margin-top:7px;"></iframe>
      </div>
      <div style="background:#f6faff;border-radius:13px;padding:18px;flex:1 1 260px;min-width:260px;">
        <b>Видео: Проверка и экспорт документов</b><br>
        <iframe width="100%" height="180" src="https://www.youtube.com/embed/ВидеоID2" frameborder="0" allowfullscreen style="border-radius:10px;margin-top:7px;"></iframe>
      </div>
      <div style="background:#f6faff;border-radius:13px;padding:18px;flex:1 1 260px;min-width:260px;">
        <b>PDF: Пошаговая инструкция по регистрации</b><br>
        <a href="/pdfs/registration-guide.pdf" class="button button-sm" target="_blank" style="margin-top:12px;">Скачать PDF</a>
      </div>
    </div>
    <div style="margin-top:34px;">
      <h3>FAQ (Часто задаваемые вопросы)</h3>
      <ul style="margin-top:13px;">
        <li><b>Как быстро проходят переводы?</b> — Обычно в течение 1–3 рабочих дней.</li>
        <li><b>Какие документы нужны для регистрации?</b> — Паспорт или учредительные документы компании.</li>
        <li><b>Куда обратиться, если возникли вопросы?</b> — Через чат поддержки или форму обратной связи.</li>
      </ul>
    </div>
  `;
};

window.renderHomePage = function() {
  console.log('renderHomePage вызвана!');
  const details = document.querySelector('.details');
  const userRaw = localStorage.getItem('currentUser');
  const user = userRaw ? JSON.parse(userRaw) : {};
  const isAdmin = user.role && user.role.toLowerCase() === 'admin';
  
  document.querySelectorAll('.icon[data-page="adminPanel"]').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });
  document.querySelectorAll('.icon[data-page="userCabinet"]').forEach(el => {
    el.style.display = !isAdmin ? '' : 'none';
  });

  // Получаем локальные данные для статистики
  const payments = JSON.parse(localStorage.getItem('payments') || '[]');
  const docs = JSON.parse(localStorage.getItem('documents') || '[]');
  const myPayments = user ? payments.filter(p => isAdmin || p.ownerEmail === user.email) : [];
  const myDocs = user ? docs.filter(d => isAdmin || d.ownerEmail === user.email) : [];

  // (Опционально) новые сообщения
  const allChats = JSON.parse(localStorage.getItem('adminChats') || '{}');
  const unreadChats = isAdmin
    ? Object.keys(allChats).filter(u => (allChats[u]||[]).some(msg => msg.from === 'user'))
    : [];

  details.innerHTML = `
    <div style="margin-bottom:18px;text-align:center;">
      <h1 style="font-size:2.1rem;font-weight:700;">EUROPAY — Финансовый кабинет</h1>
      <div style="font-size:1.15rem;color:#0057ff;font-weight:500;margin-bottom:8px;">
        Добро пожаловать${user?.email ? ', ' + user.email : ''}!
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px;margin-bottom:32px;">
      <div class="home-card" style="background:#f6faff;border-radius:16px;padding:20px;text-align:center;">
        <div style="font-size:2.3rem;margin-bottom:7px;"><i class="fas fa-wallet"></i></div>
        <div style="font-weight:600;">Платежи</div>
        <div style="margin:7px 0;color:#0057ff;font-size:1.25rem;">${myPayments.length}</div>
        <button class="button button-sm homeNavBtn" data-go="payments">Перейти</button>
      </div>
      <div class="home-card" style="background:#f6faff;border-radius:16px;padding:20px;text-align:center;">
        <div style="font-size:2.3rem;margin-bottom:7px;"><i class="fas fa-file-alt"></i></div>
        <div style="font-weight:600;">Документы</div>
        <div style="margin:7px 0;color:#0057ff;font-size:1.25rem;">${myDocs.length}</div>
        <button class="button button-sm homeNavBtn" data-go="documents">Перейти</button>
      </div>
      <div class="home-card" style="background:#f6faff;border-radius:16px;padding:20px;text-align:center;">
        <div style="font-size:2.3rem;margin-bottom:7px;"><i class="fas fa-chart-bar"></i></div>
        <div style="font-weight:600;">Статистика</div>
        <button class="button button-sm homeNavBtn" data-go="stats">Открыть</button>
      </div>
      <div class="home-card" style="background:#f6faff;border-radius:16px;padding:20px;text-align:center;">
        <div style="font-size:2.3rem;margin-bottom:7px;"><i class="fas fa-list"></i></div>
        <div style="font-weight:600;">Шаблоны</div>
        <button class="button button-sm homeNavBtn" data-go="templates">Посмотреть</button>
      </div>
      <div class="home-card" style="background:#f6faff;border-radius:16px;padding:20px;text-align:center;">
        <div style="font-size:2.3rem;margin-bottom:7px;"><i class="fas fa-coins"></i></div>
        <div style="font-weight:600;">Курсы валют</div>
        <button class="button button-sm homeNavBtn" data-go="rates">Посмотреть</button>
      </div>
      <div class="home-card" style="background:#eaf9f6;border-radius:16px;padding:20px;text-align:center;">
        <div style="font-size:2.3rem;margin-bottom:7px;"><i class="fas fa-graduation-cap"></i></div>
        <div style="font-weight:600;">Обучающие материалы</div>
        <button class="button button-sm homeNavBtn" data-go="tutorials">Смотреть</button>
      </div>
      <div class="home-card" style="background:#f6faff;border-radius:16px;padding:20px;text-align:center;">
        <div style="font-size:2.3rem;margin-bottom:7px;"><i class="fas fa-comments"></i></div>
        <div style="font-weight:600;">Чат поддержки</div>
        <button class="button button-sm homeNavBtn" data-go="adminChats">Открыть</button>
        ${isAdmin && unreadChats.length ? `<div style="color:#f44;margin-top:7px;">${unreadChats.length} новых обращений</div>` : ''}
      </div>
      ${isAdmin ? `
        <div class="home-card" style="background:#fff7e6;border-radius:16px;padding:20px;text-align:center;">
          <div style="font-size:2.3rem;margin-bottom:7px;"><i class="fas fa-tools"></i></div>
          <div style="font-weight:600;">Админ-панель</div>
          <button class="button button-sm homeNavBtn" data-go="adminPanel">Открыть</button>
        </div>
      ` : ''}
    </div>
    <div style="text-align:center;color:#aaa;font-size:0.98rem;margin-top:20px;">
      Ваш личный кабинет &copy; 2025 — EUROPAY
    </div>
  `;

  // Навигация по кнопкам дашборда
  details.querySelectorAll('.homeNavBtn').forEach(btn => {
    btn.onclick = () => {
      const go = btn.dataset.go;
      if (go === 'adminChats') {
        window.renderAdminChats();
      } else if (go === 'tutorials') {
        window.renderTutorialsPage();
      } else if (window.loadPage) {
        window.loadPage(go);
      }
    };
  });
}

// Контроль видимости админ- и пользовательских иконок
const userRaw = localStorage.getItem('currentUser');
const user = userRaw ? JSON.parse(userRaw) : {};
const isAdmin = user.role && user.role.toLowerCase() === 'admin';

document.querySelectorAll('.icon.admin-only').forEach(el => {
  el.style.display = isAdmin ? '' : 'none';
});
document.querySelectorAll('.icon.user-only').forEach(el => {
  el.style.display = !isAdmin ? '' : 'none';
});

// Icons в кабинете (sidebar)
document.querySelectorAll(".sidebar .icon").forEach((icon) => {
  icon.addEventListener("click", () => {
    if (icon.dataset.page === 'adminChats' && isAdmin) {
      window.renderAdminChats();
    } else if (icon.dataset.page === 'userChat' && !isAdmin) {
      window.loadPage?.('userChat');
    } else if (icon.dataset.page === 'home') {
      window.renderHomePage();
    } else {
      window.loadPage?.(icon.dataset.page);
    }
  });
});
// --- Экспорт renderUserChatPage, если определён ---
