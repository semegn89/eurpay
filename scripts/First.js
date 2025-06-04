// First.js — Личный кабинет пользователя без чата

export function renderUserCabinet() {
  const details = document.querySelector('.details');
  const userRaw = localStorage.getItem('currentUser');
  const curUser = userRaw ? JSON.parse(userRaw) : {};

  // Только для role: 'user'
  if (!curUser || curUser.role !== 'user') {
    details.innerHTML = '<h1>Доступно только для пользователей.</h1>';
    return;
  }

  // Берём данные пользователя
  const {
    email, companyName, inn, address, bankName, bik, accountNumber,
    feePercent, agreementNo, agreementDate, notifications = [], currentBalance = 0
  } = curUser;

  // Генерируем блок уведомлений
  let notificationsHtml = '';
  if (!notifications.length) {
    notificationsHtml = '<p>Нет уведомлений.</p>';
  } else {
    notificationsHtml = '<ul>';
    notifications.forEach(ntf => {
      notificationsHtml += `<li><strong>${ntf.date || ''}</strong> — ${ntf.text}</li>`;
    });
    notificationsHtml += '</ul>';
  }

  // Разметка Личного кабинета без чата
  details.innerHTML = `
    <h1>Мой баланс: ${Number(currentBalance).toFixed(2)} руб.</h1>
    <hr>
    <div class="user-info-card" style="margin-bottom:20px;">
      <h3>Мои данные</h3>
      <div class="info-row"><label>Email:</label> <span>${email}</span></div>
      <div class="info-row"><label>Компания:</label> <span>${companyName || ''}</span></div>
      <div class="info-row"><label>ИНН:</label> <span>${inn || ''}</span></div>
      <div class="info-row"><label>Адрес:</label> <span>${address || ''}</span></div>
      <div class="info-row"><label>Банк:</label> <span>${bankName || ''}</span></div>
      <div class="info-row"><label>БИК:</label> <span>${bik || ''}</span></div>
      <div class="info-row"><label>Счёт:</label> <span>${accountNumber || ''}</span></div>
      <div class="info-row"><label>Ставка %:</label> <span>${feePercent || 0}%</span></div>
      <div class="info-row"><label>Договор №:</label> <span>${agreementNo || ''}</span></div>
      <div class="info-row"><label>Дата дог.:</label> <span>${agreementDate || ''}</span></div>
    </div>

    <div class="user-notifications" style="margin-bottom:20px;">
      <h3>Мои уведомления</h3>
      ${notificationsHtml}
    </div>
  `;
}

// Для динамического импорта
export const renderUserCabinetPage = renderUserCabinet;