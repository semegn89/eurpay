import { showToast } from './utils.js';

// Объект с флагами для валют
const flagsMap = {
  RUB: './images/flags/ru.png',
  USD: './images/flags/us.png',
  EUR: './images/flags/eu.png',
  AED: './images/flags/ae.png',
  CNY: './images/flags/cn.png',
  GBP: './images/flags/gb.png'
};

// Ключ для выбранной даты
const RATES_DATE_KEY = 'adminRatesDate';

function getRatesDate() {
  let date = localStorage.getItem(RATES_DATE_KEY);
  if (!date) {
    date = new Date().toISOString().slice(0,10);
    localStorage.setItem(RATES_DATE_KEY, date);
  }
  return date;
}
function setRatesDate(date) {
  localStorage.setItem(RATES_DATE_KEY, date);
}

export function renderRatesPage() {
  const defaultRates = {
    RUB: { cb: 1, agent: 1 },
    USD: { cb: 76, agent: 88 },
    EUR: { cb: 80, agent: 94 },
    AED: { cb: 20, agent: 22 },
    CNY: { cb: 12, agent: 14 },
    GBP: { cb: 115, agent: 122 }
  };

  // Загружаем курсы из localStorage
  const rates = JSON.parse(localStorage.getItem('adminRates2') || 'null') || defaultRates;

  // Загружаем архив курсов (если есть)
  let ratesHistory = JSON.parse(localStorage.getItem('adminRatesHistory') || '[]');

  // Загружаем выбранную дату
  let selectedDate = getRatesDate();

  // Загружаем архив для выбранной даты (если есть)
  let archiveByDate = {};
  ratesHistory.forEach(item => {
    if (item.date) archiveByDate[item.date] = item.rates;
  });

  // Если архив пуст, добавляем текущие курсы в архив
  if (ratesHistory.length === 0) {
    ratesHistory.push({
      date: selectedDate,
      rates: { ...rates }
    });
    localStorage.setItem('adminRatesHistory', JSON.stringify(ratesHistory));
  }

  // Если курсы не загружены, используем дефолтные
  // (rates всегда определён выше)

  // Определяем роль пользователя только через localStorage (надёжно!)
  const userRaw = localStorage.getItem('currentUser');
  const user = userRaw ? JSON.parse(userRaw) : null;
  const isAdmin = user && user.role && user.role.toLowerCase() === 'admin';

  const details = document.querySelector('.details');
  details.style.background = 'rgba(255,255,255,1)';

  let html = `<h1>Курсы валют</h1>`;

  // ---- Выбор и отображение даты ----
  let dateSelector = '';
  if (isAdmin) {
    dateSelector = `<input type="date" id="ratesDateInput" value="${selectedDate}" style="font-size:1.1rem;padding:4px 8px;border-radius:6px;border:1px solid #c5dcf7;margin-left:10px;">`;
  } else {
    dateSelector = `<span style="margin-left:10px;font-size:1.1rem;color:#0057ff;">${selectedDate}</span>`;
  }
  html += `<div style="margin-bottom:12px;"><b>Курсы валют на ${selectedDate}</b> ${isAdmin ? ' (выберите дату):' : ''} ${dateSelector}</div>`;

  // ---- Отрисовка таблицы ----
  if (!isAdmin) {
    html += `
      <table class="rates-table">
        <thead>
          <tr>
            <th>Валюта</th>
            <th style="padding: 0 30px;">Курс ЦБ</th>
            <th style="padding: 0 30px;">Курс Агента</th>
          </tr>
        </thead>
        <tbody>
    `;
    for (let cur in rates) {
      const cbRate = rates[cur].cb;
      const agentRate = rates[cur].agent;
      const flagSrc = flagsMap[cur] || 'src/images/flags/default.png';
      html += `
        <tr>
          <td>
            <img src="${flagSrc}" alt="${cur}" class="flag-icon">
            <span>${cur}</span>
          </td>
          <td style="padding: 0 30px;">${cbRate}</td>
          <td style="padding: 0 30px;">${agentRate}</td>
        </tr>
      `;
    }
    html += `
        </tbody>
      </table>
    `;
  }

  // ---- Для админа: форма редактирования ----
  if (isAdmin) {
    html += `
      <h3>Редактировать курсы (1 Валюта = X RUB)</h3>
      <form id="ratesEditForm" style="margin-bottom:20px;">
        <table class="rates-edit-table">
          <thead>
            <tr>
              <th>Валюта</th>
              <th style="padding: 0 30px;">Курс ЦБ</th>
              <th style="padding: 0 30px;">Курс Агента</th>
            </tr>
          </thead>
          <tbody>
    `;
    for (let cur in rates) {
      const flagSrc = flagsMap[cur] || 'src/images/flags/default.png';
      html += `
        <tr>
          <td>
            <img src="${flagSrc}" alt="${cur}" class="flag-icon">
            <span>${cur}</span>
          </td>
          <td style="padding: 0 30px;">
            <input type="number" step="0.01" name="cb_${cur}" value="${rates[cur].cb}" style="width:80px;">
          </td>
          <td style="padding: 0 30px;">
            <input type="number" step="0.01" name="agent_${cur}" value="${rates[cur].agent}" style="width:80px;">
          </td>
        </tr>
      `;
    }
    html += `
          </tbody>
        </table>
        <button type="submit" class="button" style="margin-top:10px;">Сохранить</button>
      </form>
      <h3>Архив курсов</h3>
    `;
    if (ratesHistory.length === 0) {
      html += `<p>Архив пуст.</p>`;
    } else {
      html += `<ul>`;
      ratesHistory.forEach(item => {
        html += `<li><strong>${item.date}</strong>: `;
        for (let c in item.rates) {
          html += `${c} => ЦБ=${item.rates[c].cb}, Агента=${item.rates[c].agent}; `;
        }
        html += `</li>`;
      });
      html += `</ul>`;
    }
    html += `<button id="downloadArchiveBtn" class="button" style="margin-top:10px;">Скачать архив</button>`;
  }

  details.innerHTML = html;

  // ---- Обработчик выбора даты (только для админа) ----
  if (isAdmin) {
    const dateInput = document.getElementById('ratesDateInput');
    if (dateInput) {
      dateInput.addEventListener('change', (e) => {
        setRatesDate(e.target.value);
        renderRatesPage();
      });
    }
  }

  // ---- Обработчик формы редактирования (только для админа) ----
  if (isAdmin) {
    const ratesEditForm = document.getElementById('ratesEditForm');
    ratesEditForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Архивируем текущие курсы
      let ratesHistory = JSON.parse(localStorage.getItem('adminRatesHistory') || '[]');
      ratesHistory.push({
        date: getRatesDate(),
        rates: { ...rates }
      });
      localStorage.setItem('adminRatesHistory', JSON.stringify(ratesHistory));

      // Собираем новые значения из формы
      const fd = new FormData(ratesEditForm);
      for (let cur in rates) {
        const cbName = `cb_${cur}`;
        const agentName = `agent_${cur}`;
        const newCb = parseFloat(fd.get(cbName)) || 1;
        const newAgent = parseFloat(fd.get(agentName)) || 1;
        rates[cur].cb = newCb;
        rates[cur].agent = newAgent;
      }

      // Сохраняем обновлённые курсы
      localStorage.setItem('adminRates2', JSON.stringify(rates));
      showToast('Курсы валют обновлены!', 'success');
      renderRatesPage();
    });

    const downloadBtn = document.getElementById('downloadArchiveBtn');
    downloadBtn.addEventListener('click', () => {
      let ratesHistory = JSON.parse(localStorage.getItem('adminRatesHistory') || '[]');
      const archiveStr = JSON.stringify(ratesHistory, null, 2);
      const blob = new Blob([archiveStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rates_archive.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}

const style = document.createElement('style');
style.textContent = `
  .flag-icon {
    width: 24px;
    height: 14px;
    object-fit: contain;
    border-radius: 2px;
    margin-right: 6px;
    vertical-align: middle;
  }
`;
document.head.appendChild(style);