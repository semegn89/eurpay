/* payments.js */
// Вместо import … (удалено)
// Глобальные переменные/функции должны быть доступны через window.*
// jsPDF используется только как window.jspdf.jsPDF

// Определяем стили для статуса
function getStatusBackground(status) {
  switch (status) {
    case 'Создан':                return '#f0f0f0';
    case 'Принят':                return '#d0eaff';
    case 'В обработке':           return '#ffe4b5';
    case 'Запрос документов':     return '#e6e6fa';
    case 'Исполнен':              return '#d0f0c0';
    case 'Возвращен отправителю': return '#f4cccc';
    default:                      return '#fff';
  }
}
function getStatusColor(status){
  switch (status) {
    case 'Создан':                return '#333';
    case 'Принят':                return '#0066cc';
    case 'В обработке':           return '#cc6600';
    case 'Запрос документов':     return '#9933cc';
    case 'Исполнен':              return '#009933';
    case 'Возвращен отправителю': return '#cc0000';
    default:                      return '#000';
  }
}
async function tryRenderRealPage(pageKey) {
  const mod = await importCabinetPage(pageKey);
  const fnName = pageKey === 'adminPanel'
    ? 'renderAdminPanel'
    : 'render' + pageKey[0].toUpperCase() + pageKey.slice(1) + 'Page';

  // Сначала пробуем модульную функцию (ES6 импорт)
  if (mod && typeof mod[fnName] === 'function') {
    await mod[fnName]();
    return true;
  }
  // Потом ищем глобальную функцию на window (обычный <script>)
  if (typeof window[fnName] === 'function') {
    await window[fnName]();
    return true;
  }
  return false;
}
async function renderPaymentsPage() {
    const details = document.querySelector('.details');

  // Текущий пользователь
  const userRaw = localStorage.getItem('currentUser');
  const curUser = userRaw ? JSON.parse(userRaw) : {};
  const isAdmin = curUser.role && curUser.role.toLowerCase() === 'admin';

  // Пользователь всегда может создавать новые платежи
  const payments = JSON.parse(localStorage.getItem('payments') || '[]');
  const userCanCreate = !isAdmin;

  // Кнопка "Создать платёж" и форма доступны для admin или userCanCreate
  const payFormHtml = `
  <div id="payFormDiv" style="display:none; margin-top:20px;">
    <h3 id="payFormTitle">Новый платёж</h3>
    <form id="payForm" class="payment-form">
      <div class="form-group">
        <label for="purpose">Назначение:</label>
        <input id="purpose" type="text" name="purpose" required placeholder="Оплата по контракту №...">
      </div>
      <div class="form-group">
        <label for="contractInvoice">Контр/инвойс:</label>
        <input id="contractInvoice" type="text" name="contractInvoice">
      </div>
      <div class="form-group">
        <label for="orderNumber">Номер поручения:</label>
        <input id="orderNumber" type="text" name="orderNumber">
      </div>
      <div class="form-group">
        <label for="swift">SWIFT:</label>
        <input id="swift" type="text" name="swift" required>
      </div>
      <div class="form-group">
        <label for="account">Счёт получателя:</label>
        <input id="account" type="text" name="account" required>
      </div>
      <div class="form-group">
        <label for="receiverName">Получатель:</label>
        <input id="receiverName" type="text" name="receiverName" required>
      </div>
      <div class="form-group">
        <label for="receiverAddress">Адрес получателя:</label>
        <input id="receiverAddress" type="text" name="receiverAddress" required>
      </div>
      <div class="form-group">
        <label for="receiverCountry">Страна получателя:</label>
        <input id="receiverCountry" type="text" name="receiverCountry" required>
      </div>
      <div class="form-group">
        <label for="amount">Сумма:</label>
        <input id="amount" type="number" step="0.01" name="amount" required>
      </div>
      <div class="form-group">
        <label for="currency">Валюта:</label>
        <select id="currency" name="currency">
          <option value="RUB">RUB</option>
          <option value="AED">AED</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="CNY">CNY</option>
          <option value="GBP">GBP</option>
        </select>
      </div>
      <div class="form-group">
        <label for="paymentType">Тип платежа:</label>
        <select id="paymentType" name="paymentType">
          <option value="Товар">Товар</option>
          <option value="Услуга">Услуга</option>
          <option value="Долг">Долг</option>
          <option value="Другое">Другое</option>
        </select>
      </div>
      <div class="form-group">
        <label for="paymentDocs">Документы:</label>
        <input id="paymentDocs" type="file" name="paymentDocs" multiple>
      </div>
      ${isAdmin ? `
        <div class="form-group">
          <label for="status">Статус:</label>
          <select id="status" name="status">
            <option value="Создан">Создан</option>
            <option value="Принят">Принят</option>
            <option value="В обработке">В обработке</option>
            <option value="Запрос документов">Запрос документов</option>
            <option value="Исполнен">Исполнен</option>
            <option value="Возвращен отправителю">Возвращен отправителю</option>
          </select>
        </div>
        <div class="form-group">
          <label for="purchaseRate">Фактический курс покупки:</label>
          <input id="purchaseRate" type="number" step="0.0001" name="purchaseRate" placeholder="76.50">
        </div>
        <div class="form-group">
          <label for="dateRubArrive">Дата прихода рублей:</label>
          <input id="dateRubArrive" type="date" name="dateRubArrive">
        </div>
        <div class="form-group">
          <label for="feePercent">Процент вознаграждения:</label>
          <input id="feePercent" type="number" step="0.01" name="feePercent" placeholder="5">
        </div>
      ` : ''}
      <div class="form-actions">
        <button type="submit" class="button">Сохранить</button>
        <button type="button" id="cancelEditBtn" class="button button-outline">Отмена</button>
      </div>
    </form>
  </div>
`;

  details.innerHTML = `
  <h1>Платежи</h1>
  <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px;">
    ${(isAdmin || userCanCreate) ? `<button id="createPayBtn" class="button">Создать платёж</button>` : ''}
    ${isAdmin ? `<button id="exportCsvBtn" class="button">Экспорт CSV</button>` : ''}

    <select id="statusFilter" class="button">
      <option value="">Все статусы</option>
      <option value="Создан">Создан</option>
      <option value="Принят">Принят</option>
      <option value="В обработке">В обработке</option>
      <option value="Запрос документов">Запрос документов</option>
      <option value="Исполнен">Исполнен</option>
      <option value="Возвращен отправителю">Возвращен отправителю</option>
    </select>

    <input
      type="text"
      id="searchInput"
      class="button"
      style="width:220px;"
      placeholder="Поиск (получатель / поручение)"
    >

    <select id="sortSelect" class="button">
      <option value="">Без сортировки</option>
      <option value="date_desc">Дата (новее→старее)</option>
      <option value="date_asc">Дата (старее→новее)</option>
      <option value="amount_desc">Сумма (убывание)</option>
      <option value="amount_asc">Сумма (возрастание)</option>
    </select>
  </div>

  ${(isAdmin || userCanCreate) ? payFormHtml : ''}

  <div id="paysList" style="margin-top:20px;"></div>
`;
  // Получаем ссылки на элементы
  const createPayBtn   = details.querySelector('#createPayBtn');
  const exportCsvBtn   = details.querySelector('#exportCsvBtn');
  const statusFilterEl = details.querySelector('#statusFilter');
  const searchInputEl  = details.querySelector('#searchInput');
  const sortSelectEl   = details.querySelector('#sortSelect');
  const payFormDiv     = details.querySelector('#payFormDiv');
  const payFormTitle   = details.querySelector('#payFormTitle');
  const payForm        = details.querySelector('#payForm');
  const cancelEditBtn  = details.querySelector('#cancelEditBtn');
  const paysList       = details.querySelector('#paysList');

  let editingIndex = null;

  // Кнопка "Создать платёж" и форма доступны для admin или userCanCreate
  if ((isAdmin || userCanCreate) && createPayBtn && payForm && payFormDiv && cancelEditBtn) {
    createPayBtn.addEventListener('click', () => {
      editingIndex = null;
      payForm.reset();
      payFormTitle.textContent = 'Новый платёж';
      cancelEditBtn.style.display = 'none';
      payFormDiv.style.display = 'block';
    });
    cancelEditBtn.addEventListener('click', () => {
      payForm.reset();
      payFormDiv.style.display = 'none';
      editingIndex = null;
    });
    // Сабмит формы (создание/редактирование)
payForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  // Новый способ получения пользователя
  const userRaw = localStorage.getItem('currentUser');
  const curUser = userRaw ? JSON.parse(userRaw) : {};
  const isAdminUser = curUser.role && curUser.role.toLowerCase() === 'admin';

  const fd = new FormData(payForm);

  // Грузим payments из localStorage
  let payments = JSON.parse(localStorage.getItem('payments') || '[]');

  // Документы только через localStorage!
  let docs = JSON.parse(localStorage.getItem('documents') || '[]');

  // feePercent
  let feePercent = 0;
  if (!isAdminUser) {
    // Берём из userObj
    const usersArr = JSON.parse(localStorage.getItem('users') || '[]');
    const foundUser = usersArr.find(u => (u.email || '').trim().toLowerCase() === (curUser.email || '').trim().toLowerCase());
    feePercent = foundUser ? (foundUser.feePercent||0) : 0;
  } else {
    feePercent = parseFloat(fd.get('feePercent')) || 0;
  }
      // Создаём объект платежа
      // Всегда ownerEmail: curUser.email
      const payObj = {
        id: generatePaymentId(),
        purpose:         fd.get('purpose')         || '',
        contractInvoice: fd.get('contractInvoice') || '',
        orderNumber:     fd.get('orderNumber')     || '',
        swift:           fd.get('swift')           || '',
        account:         fd.get('account')         || '',
        receiverName:    fd.get('receiverName')    || '',
        receiverAddress: fd.get('receiverAddress') || '',
        receiverCountry: fd.get('receiverCountry') || '',
        amount:          parseFloat(fd.get('amount')) || 0,
        currency:        fd.get('currency') || 'RUB',
        paymentType:     fd.get('paymentType') || 'Другое',

        date: new Date().toISOString(),
        status: 'Создан',
        docs: [],
        feePercent,
        ownerEmail: curUser.email,

        purchaseRate: 0,
        dateRubArrive: ''
      };
      if (isAdminUser) {
        payObj.status       = fd.get('status')       || 'Создан';
        payObj.purchaseRate = parseFloat(fd.get('purchaseRate')) || 0;
        payObj.dateRubArrive= fd.get('dateRubArrive')|| '';
      }

      // Прикрепление файлов
      const fileList = fd.getAll('paymentDocs');
      async function handleFile(i){
        if(i>=fileList.length) {
          finalize();
          return;
        }
        const file = fileList[i];
        if(!(file instanceof File)){
          await handleFile(i+1);
          return;
        }
        const reader = new FileReader();
        reader.onload = async (ev)=>{
          const dataURL = ev.target.result;
          const docId   = Date.now() + '-'+ i;
          const docName = `${payObj.id} от ${payObj.date} — ${file.name}`;
          docs.push({
            id: docId,
            name: docName,
            data: dataURL,
            linkedPaymentId: payObj.id
          });
          payObj.docs.push(docId);
          localStorage.setItem('documents', JSON.stringify(docs));
          await handleFile(i+1);
        };
        reader.readAsDataURL(file);
      }
      await handleFile(0);

      async function finalize(){
        if(editingIndex===null){
          payments.push(payObj);
          showToast(`Платёж ${payObj.id} создан`,'success');
        } else {
          // При редактировании обязательно сохраняем ownerEmail: curUser.email
          payments[editingIndex] = { ...payments[editingIndex], ...payObj, ownerEmail: curUser.email };
          showToast(`Платёж ${payObj.id} обновлён`,'success');
        }
        localStorage.setItem('payments', JSON.stringify(payments));
        payForm.reset();
        payFormDiv.style.display='none';
        editingIndex = null;
        // После успешного создания платежа обычным user — при следующем рендере кнопка и форма исчезают
        await renderPaymentsPage();
      }
    });
  }

  // Экспорт CSV только для админа
  if (isAdmin && exportCsvBtn) {
    exportCsvBtn.addEventListener('click', async ()=>{
      let paysArr = JSON.parse(localStorage.getItem('payments') || '[]');
      if(!paysArr.length){
        showToast('Нет данных для экспорта!','info');
        return;
      }
      let csv = "data:text/csv;charset=utf-8," +
        "ID,Purpose,Contract,OrderNo,SWIFT,Account,Receiver,Amount,Currency,Status,feePercent,Date,paymentType,purchaseRate,dateRubArrive\n";
      paysArr.forEach(p=>{
        csv += [
          p.id,
          p.purpose,
          p.contractInvoice,
          p.orderNumber,
          p.swift,
          p.account,
          p.receiverName,
          p.amount,
          p.currency,
          p.status,
          p.feePercent,
          p.date,
          p.paymentType||'',
          p.purchaseRate||0,
          p.dateRubArrive||''
        ].join(',') + "\n";
      });
      const uri = encodeURI(csv);
      const link = document.createElement('a');
      link.setAttribute('href', uri);
      link.setAttribute('download','payments.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  // Фильтры доступны всем (statusFilterEl, searchInputEl, sortSelectEl)
  if (statusFilterEl) statusFilterEl.addEventListener('change', renderPaymentsList);
  if (searchInputEl) searchInputEl.addEventListener('input', renderPaymentsList);
  if (sortSelectEl) sortSelectEl.addEventListener('change', renderPaymentsList);

  async function renderPaymentsList(){
    let paysArr = JSON.parse(localStorage.getItem('payments') || '[]');
    console.log('Все платежи:', paysArr);
    console.log('curUser.email:', curUser.email, typeof curUser.email);
    console.log('ownerEmail первого платежа:', paysArr[0] && paysArr[0].ownerEmail, typeof paysArr[0] && paysArr[0].ownerEmail);
    // Временный debug: выводим все платежи и текущий email
    console.log('DEBUG payments:', paysArr, 'curUser.email:', curUser.email);

    // Пользователь видит только свои платежи
    if (!isAdmin) {
      const normEmail = (curUser.email || '').trim().toLowerCase();
      paysArr = paysArr.filter(x =>
        (x.ownerEmail || '').trim().toLowerCase() === normEmail
      );
    }
    // Фильтр по статусу
    const stVal = statusFilterEl.value;
    if(stVal){
      paysArr = paysArr.filter(x=> x.status===stVal);
    }
    // Поиск
    const sVal = (searchInputEl.value||'').toLowerCase();
    if(sVal){
      paysArr = paysArr.filter(p=>{
        const rName = (p.receiverName||'').toLowerCase();
        const oNum  = (p.orderNumber||'').toLowerCase();
        return (rName.includes(sVal) || oNum.includes(sVal));
      });
    }
    // Сортировка
    const srt = sortSelectEl.value;
    if(srt==='date_desc'){
      paysArr.sort((a,b)=> new Date(b.date)-new Date(a.date));
    } else if(srt==='date_asc'){
      paysArr.sort((a,b)=> new Date(a.date)-new Date(b.date));
    } else if(srt==='amount_desc'){
      paysArr.sort((a,b)=> b.amount-a.amount);
    } else if(srt==='amount_asc'){
      paysArr.sort((a,b)=> a.amount-b.amount);
    } else {
      paysArr.sort((a,b)=> new Date(b.date)-new Date(a.date));
    }
    if(!paysArr.length){
      paysList.innerHTML='<p>Нет платежей.</p>';
      return;
    }

    let html='';
    paysArr.forEach((p,index)=>{
      const bg = getStatusBackground(p.status);
      const dateStr = new Date(p.date).toLocaleString();
      html +=`
        <div class="payment-bubble" style="background:${bg}; margin-bottom:15px; padding:10px;">
          <strong>${p.id}</strong> | <em>${dateStr}</em><br>
          Назначение: ${p.purpose} (${p.amount} ${p.currency})<br>
          Контракт/Инвойс: ${p.contractInvoice}<br>
          Номер поручения: ${p.orderNumber||'—'}<br>
          Получатель: ${p.receiverName}, ${p.receiverAddress}, ${p.receiverCountry}<br>
          SWIFT: ${p.swift}, Счёт: ${p.account}<br>
          Процент вознаграждения: ${p.feePercent}%<br>
          Тип платежа: ${p.paymentType||'Другое'}<br>
          <span style="color:${getStatusColor(p.status)};">Статус: ${p.status}</span><br>
          ${
            isAdmin
              ? `Курс покупки: ${p.purchaseRate||0}, Дата прихода: ${p.dateRubArrive||''}<br>`
              : ''
          }
          <div style="margin-top:5px;">
            ${
              isAdmin
                ? `<button class="payEditBtn button button-sm" data-idx="${index}">Редактировать</button>
                    <button class="payDelBtn button button-sm button-outline" data-idx="${index}">Удалить</button>`
                : ''
            }
            <button class="payDocBtn button button-sm button-outline" data-idx="${index}">
              Поручение/Отчёт
            </button>
          </div>
        </div>
      `;
    });
    paysList.innerHTML=html;
    // добавляем пояснения ко всем полям в форме полупрозрачным текстом
    const placeholders = {
      purpose: "Оплата по контракту №... (например, Payment to contract #12345 for services)",
      contractInvoice: "Контракт/Инвойс №12345" + " (Номер вашего контракта или инвойса полученног от постащика)",
      orderNumber: "Номер поручения 67890" + " (порядковый номер поручения от вас агенту)",
      swift: "SWIFT-код банка, например, ABCDUS33" + " (SWIFT-код банка получателя)",
      account: "Номер счёта, например, 123456789012",
      receiverName: "Имя получателя, например, John Doe",
      receiverAddress: "Адрес получателя, например, 123 Main St, City",
      receiverCountry: "Страна получателя, например, USA",
      amount: "Сумма платежа, например, 1000.00",
      currency: "Выберите валюту",
      paymentType: "Выберите тип платежа",
      status: "Выберите статус",
      purchaseRate: "Фактический курс, например, 76.50",
      dateRubArrive: "Дата прихода рублей, например, 2023-01-01",
      feePercent: "Процент вознаграждения, например, 5"
    };

    Object.keys(placeholders).forEach(fieldName => {
      const field = payForm.elements[fieldName];
      if (field) {
      const placeholder = placeholders[fieldName];
      field.setAttribute('placeholder', placeholder);
      field.addEventListener('focus', () => {
        field.setAttribute('placeholder', '');
      });
      field.addEventListener('blur', () => {
        field.setAttribute('placeholder', placeholder);
      });
      }
    });

    // добавляем пояснения к полям формы
    const formFields = payForm.querySelectorAll('input, select');
    formFields.forEach(field => {
      const placeholder = field.getAttribute('placeholder');
      if (placeholder) {
        field.addEventListener('focus', () => {
          field.setAttribute('placeholder', '');
        });
        field.addEventListener('blur', () => {
          field.setAttribute('placeholder', placeholder);
        });
        field.setAttribute('placeholder', placeholder);
      }
    }); 
    // Убираем пояснения при фокусе    
    // Удаление
    if (isAdmin) {
      paysList.querySelectorAll('.payDelBtn').forEach(btn=>{
        btn.addEventListener('click', async function(){
          let arr2 = JSON.parse(localStorage.getItem('payments') || '[]');
          arr2.sort((a,b)=> new Date(b.date)-new Date(a.date));
          const i= +this.getAttribute('data-idx');
          arr2.splice(i,1);
          localStorage.setItem('payments', JSON.stringify(arr2));
          showToast('Платёж удалён','info');
          await renderPaymentsList();
        });
      });
    }
    // Редактирование
    if (isAdmin && payForm && payFormDiv && cancelEditBtn) {
      paysList.querySelectorAll('.payEditBtn').forEach(btn=>{
        btn.addEventListener('click', async function(){
          let arr2 = JSON.parse(localStorage.getItem('payments') || '[]');
          arr2.sort((a,b)=> new Date(b.date)-new Date(a.date));
          editingIndex= +this.getAttribute('data-idx');
          const payObj = arr2[editingIndex];

          payForm.reset();
          payFormTitle.textContent=`Редактировать ${payObj.id}`;
          cancelEditBtn.style.display='inline-block';
          payFormDiv.style.display='block';

          payForm.elements['purpose'].value         = payObj.purpose;
          payForm.elements['contractInvoice'].value = payObj.contractInvoice;
          payForm.elements['orderNumber'].value     = payObj.orderNumber;
          payForm.elements['swift'].value           = payObj.swift;
          payForm.elements['account'].value         = payObj.account;
          payForm.elements['receiverName'].value    = payObj.receiverName;
          payForm.elements['receiverAddress'].value = payObj.receiverAddress;
          payForm.elements['receiverCountry'].value = payObj.receiverCountry;
          payForm.elements['amount'].value          = payObj.amount;
          payForm.elements['currency'].value        = payObj.currency;
          payForm.elements['paymentType'].value     = payObj.paymentType||'Другое';

          payForm.elements['status'].value        = payObj.status;
          payForm.elements['purchaseRate'].value  = payObj.purchaseRate||0;
          payForm.elements['dateRubArrive'].value = payObj.dateRubArrive||'';
          if(payForm.elements['feePercent']){
            payForm.elements['feePercent'].value  = payObj.feePercent||0;
          }
        });
      });
    }
    // Поручение/Отчёт
    paysList.querySelectorAll('.payDocBtn').forEach(btn=>{
      btn.addEventListener('click', async function(){
        let arr2 = JSON.parse(localStorage.getItem('payments') || '[]');
        arr2.sort((a,b)=> new Date(b.date)-new Date(a.date));
        const i= +this.getAttribute('data-idx');
        const payObj = arr2[i];

        if(payObj.status==='Исполнен'){
          showPdfAgentReport(payObj);
        } else if(payObj.status==='Возвращен отправителю'){
          showPdfReturnRequest(payObj);
        } else {
          showPdfOrderFull(payObj);
        }
      });
    });
  }

  await renderPaymentsList();

  // Генерация УНП-номера
  function generatePaymentId(){
    const num = Math.floor(Math.random()*1000000);
    return `УНП-${String(num).padStart(6,'0')}`;
  }
}

// === showPdfAgentReport ===
async function showPdfAgentReport(payObj) {
  const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const marginX = 72;
  let y = 70;
  const maxWidth = 460;
  const lineHeight = 1.35;

  // Шрифты
  if (typeof NotoSansRoboto !== 'undefined') {
    doc.addFileToVFS('NotoSansRoboto.ttf', NotoSansRoboto);
    doc.addFont('NotoSansRoboto.ttf', 'NotoSansRoboto', 'normal');
    doc.setFont('NotoSansRoboto', 'normal');
  } else {
    doc.setFont('helvetica', 'normal');
  }

  // Получение данных для подстановки
  const usersArr = JSON.parse(localStorage.getItem('users') || '[]');
  const userObj = usersArr.find(u => u.email === payObj.ownerEmail) || {};
  const principal = userObj.companyName || "ООО «Пример»";
  const principalDirector = userObj.directorName || "ФИО директора";
  const agentCompany = "ОсОО ФРС ГРУПП";
  const agentCity = "Бишкек";
  const agentDirector = "Semerenco Grigori";
  const agreementNo = userObj.agreementNo || payObj.contractInvoice || "6А";
  const agreementDate = userObj.agreementDate || (payObj.date ? new Date(payObj.date).toLocaleDateString('ru-RU') : "—");
  const orderNumber = payObj.orderNumber || "—";
  const orderDate = (payObj.date ? new Date(payObj.date).toLocaleDateString('ru-RU') : "—");
  const reportDate = (new Date()).toLocaleDateString('ru-RU');

  // ======= Вспомогательная функция для авто-отступа =======
  function drawTextBlock(text, x, y, fontSize = 12, color = [0,0,0]) {
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + lines.length * fontSize * lineHeight;
  }

  // ——— Заголовок ———
  y = drawTextBlock("ОТЧЕТ АГЕНТА", marginX, y, 15);
  y = drawTextBlock(`ОБ ИСПОЛНЕНИИ ПОРУЧЕНИЯ № ${orderNumber} от ${reportDate}`, marginX, y, 12);
  y = drawTextBlock(`${agentCity}, ${reportDate}`, marginX, y, 10, [110,110,110]);
  y += 10;

  // ——— Основной текст ———
  y = drawTextBlock(
    `${agentCompany} (Агент) направляет Отчет об исполнении Поручения № ${orderNumber} по ДОГОВОРУ №${agreementNo} от ${agreementDate} (Договор) для ${principal} (Принципал), в лице генерального директора ${principalDirector}.`,
    marginX, y, 12
  );
  y += 5;

  y = drawTextBlock("В соответствии с п. 1.1 Договора Агент осуществил следующие действия:", marginX, y, 11.2);

  // ——— Пункты ———
  let rubSum = Number(payObj.amountRub || 3079558.51).toLocaleString('ru-RU', {minimumFractionDigits: 2});
  y = drawTextBlock(`1. Получил от «Принципала» денежные средства в сумме: ${rubSum} руб.`, marginX, y, 11.2);

  let usdSum = Number(payObj.amount || 4135).toLocaleString('en-US', {minimumFractionDigits: 2});
  let rubPaid = Number(payObj.amountRubPaid || 2947227.50).toLocaleString('ru-RU', {minimumFractionDigits: 2});
  y = drawTextBlock(
    `2. «Агент», произвел оплату в пользу «Продавца» указанного в поручении «Принципала».\n   Сумма, согласованная сторонами, составила: ${usdSum} USD (${rubPaid} руб.). Денежные средства были зачислены на реквизиты получателя согласно Поручения.`,
    marginX, y, 11.2
  );

  let feePercent = Number(payObj.feePercent || 4.49);
  let feeUsd = Number(payObj.feeUsd || (payObj.amount * feePercent / 100)).toLocaleString('en-US', {minimumFractionDigits: 2});
  let agentRate = Number(payObj.purchaseRate || 84.2065);
  let feeRub = Number(payObj.feeRub || (feeUsd * agentRate)).toLocaleString('ru-RU', {minimumFractionDigits: 2});
  y = drawTextBlock(
    `3. Фактическая сумма агентского вознаграждения — ${feePercent}% от ${usdSum} USD, что составляет ${feeUsd} USD, а в рублях по курсу агента на дату подписания «Поручения» 1 USD = ${agentRate} руб. = ${feeRub} руб.`,
    marginX, y, 11.2
  );

  y = drawTextBlock(
    `4. «Принципал» оплатил агентское вознаграждение, согласно пункту 3 настоящего отчета агента в срок, предусмотренный агентским договором.`,
    marginX, y, 11.2
  );

  y += 30;

  // ——— Подписи ———
  y = drawTextBlock('Агент', marginX, y, 11.2);
  y = drawTextBlock(`${agentCompany}   Киргизия`, marginX, y, 11.2);
  y = drawTextBlock('Директор', marginX, y, 11.2);
  y = drawTextBlock(agentDirector, marginX + 60, y, 11.2);

  y += 32;
  y = drawTextBlock('Принципал', marginX, y, 11.2);
  y = drawTextBlock('Претензий не имею, услуга оказана полностью.', marginX, y, 11.2);
  y = drawTextBlock('Генеральный директор', marginX, y, 11.2);
  y = drawTextBlock(principal, marginX + 170, y, 11.2);
  y = drawTextBlock(principalDirector, marginX + 170, y, 11.2);

  doc.save(`Отчет_${payObj.id}.pdf`);
}

// === showPdfReturnRequest ===
// === showPdfReturnRequest ===
async function showPdfReturnRequest(payObj) {
  const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const marginX = 56;
  let y = 58;

  // Подключение кириллицы
  if (typeof NotoSansRoboto !== 'undefined') {
    doc.addFileToVFS('NotoSansRoboto.ttf', NotoSansRoboto);
    doc.addFont('NotoSansRoboto.ttf', 'NotoSansRoboto', 'normal');
    doc.setFont('NotoSansRoboto', 'normal');
  } else {
    doc.setFont('helvetica', 'normal');
  }

  // Данные компании-заявителя (user)
  const usersArr = JSON.parse(localStorage.getItem('users') || '[]');
  const userObj = usersArr.find(u => u.email === payObj.ownerEmail) || {};

  const principalName    = userObj.companyName   || "ООО «Скиф»";
  const principalAddress = userObj.address       || "630105, РФ, область Новосибирская, город Новосибирск, улица Деповская, дом 36, квартира 42.";
  const principalInn     = userObj.inn           || "5402062662";
  const principalEmail   = userObj.email         || "skif.gda@mail.ru";
  const principalPhone   = userObj.contactPhone  || "+7 913 703 4873";
  const principalBank    = userObj.bankName      || "АО 'АЛЬФА-БАНК'";
  const principalBik     = userObj.bik           || "044525593";
  const principalAcc     = userObj.accountNumber || "40702810417090000080";
  const principalCorrAcc = userObj.corrAccount   || "30101810200000000593";
  const principalDir     = userObj.directorName  || "Галахов Д.А.";

  // Данные агента (фиксированные)
  const agentCompany   = "ОсОО «ФРС ГРУПП»";
  const agentDirector  = "Semerenco Grigori";
  const agentAddress   = "720045, г. Бишкек, Первомайский район, ул. Фатьянова, д.43 (Интер А)";
  const agentInn       = "2022022301323";
  const agentEmail     = "kontora.corp@bk.ru";

  // Сумма возврата — всегда в рублях
  let rubSum = 0;
  if (payObj.amountRub && payObj.amountRub > 0) {
    rubSum = payObj.amountRub;
  } else if (payObj.returnSumRub && payObj.returnSumRub > 0) {
    rubSum = payObj.returnSumRub;
  } else if (payObj.amount && payObj.purchaseRate) {
    rubSum = payObj.amount * payObj.purchaseRate;
  } else {
    rubSum = 0;
  }
  const rubSumText = rubSum.toLocaleString('ru-RU', {minimumFractionDigits: 2});
  // Прописью (можно заменить на реальную функцию если нужно)
  const rubSumTextWords = numberToTextRu(rubSum);

  const orderNumber  = payObj.orderNumber || "—";
  const orderDate    = (payObj.date ? new Date(payObj.date).toLocaleDateString('ru-RU') : "—");
  const contractNo   = userObj.agreementNo || payObj.contractInvoice || "—";
  const contractDate = userObj.agreementDate || orderDate || "—";
  const reason       = payObj.returnReason || "Китайский банк не принял от вас платеж";
  const today        = new Date().toLocaleDateString('ru-RU');

  // === Шапка
  doc.setFontSize(11.5);
  doc.text(`Директору ${agentCompany}`, marginX, y); y += 18;
  doc.text(agentDirector, marginX, y); y += 16;
  doc.text(agentAddress, marginX, y); y += 16;
  doc.text(`ИНН: ${agentInn}`, marginX, y); y += 16;
  doc.text(`Почта: ${agentEmail}`, marginX, y); y += 20;

  // Реквизиты заявителя
  doc.setFontSize(10.8);
  doc.text(`Юридический адрес: ${principalAddress}`, marginX, y); y += 16;
  doc.text(`ИНН: ${principalInn}`, marginX, y); y += 16;
  doc.text(`Почта: ${principalEmail}`, marginX, y); y += 16;
  doc.text(`Тел.: ${principalPhone}`, marginX, y); y += 20;

  // Заявление
  doc.setFontSize(14);
  doc.setFont(undefined, 'normal');
  doc.text("Заявление", marginX, y);
  doc.setFont(undefined, 'normal');
  y += 26;

  doc.setFontSize(11.7);
  doc.text(
    `Прошу Вас осуществить возврат денежных средств в размере: ${rubSumText} руб.\n(${rubSumTextWords})`,
    marginX, y, {maxWidth: 460}
  );
  y += 30;
  doc.text(
    `Агентскому договору № ${contractNo} от ${contractDate} (Поручение № ${orderNumber} от ${orderDate})\nпо причине:`,
    marginX, y, {maxWidth: 460}
  );
  y += 32;
  doc.text(`(${reason})`, marginX, y); y += 24;

  doc.text(`Возврат денежных средств прошу осуществить по следующим реквизитам:`, marginX, y);
  y += 20;

  // Блок реквизитов получателя
  doc.setFontSize(11.3);
  doc.text([
    `Получатель: ${principalName}`,
    `Счет получателя: ${principalAcc}`,
    `Банк получателя: ${principalBank}`,
    `БИК: ${principalBik}`,
    principalCorrAcc ? `Кор. счет: ${principalCorrAcc}` : ""
  ].filter(Boolean), marginX, y);
  y += (principalCorrAcc ? 68 : 54);

  // Приложения
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text("Приложения:", marginX, y); doc.setFont(undefined, 'normal'); y += 18;
  doc.setFontSize(10.3);
  doc.text("- Копия агентского договора на 1 л. в 1 экз.;", marginX, y); y += 14;
  doc.text("- Копия платежного поручения на 1 л. в 1 экз.;", marginX, y);

  y += 34;
  doc.setFontSize(11.7);
  doc.text(`Генеральный директор  ${principalName}`, marginX, y); y += 18;
  doc.text(principalDir, marginX, y);

  doc.save(`Заявление_на_возврат_${payObj.id || ''}.pdf`);

  // Заглушка для суммы прописью
  function numberToTextRu(number) {
    return `${number.toLocaleString('ru-RU', {minimumFractionDigits: 2})} рублей`;
  }
}

// === showPdfOrderFull ===
async function showPdfOrderFull(payObj) {
  const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const marginX = 48;
  let y = 54;

  // Подключение кириллического шрифта
  if (typeof NotoSansRoboto !== 'undefined') {
    doc.addFileToVFS('NotoSansRoboto.ttf', NotoSansRoboto);
    doc.addFont('NotoSansRoboto.ttf', 'NotoSansRoboto', 'normal');
    doc.setFont('NotoSansRoboto', 'normal');
  } else {
    doc.setFont('helvetica', 'normal');
  }

  // Получение данных компании и платежа
  const usersArr = JSON.parse(localStorage.getItem('users') || '[]');
  const userObj = usersArr.find(u => u.email === payObj.ownerEmail) || {};
  const companyName   = userObj.companyName   || "ООО «Пример»";
  const inn           = userObj.inn           || "0000000000";
  const address       = userObj.address       || "г. Пример, ул. Примерная, 1";
  const bankName      = userObj.bankName      || "ПАО Банк";
  const bik           = userObj.bik           || "123456789";
  const accPrincipal  = userObj.accountNumber || "40802810XXXXXX";
  const directorName  = userObj.directorName  || "Директор не указан";
  const agreementNo   = userObj.agreementNo   || "12";
  const agreementDate = userObj.agreementDate || "12";

  let payDate = new Date(payObj.date);
  if (isNaN(payDate)) payDate = new Date();
  const formattedPayDate = payDate.toLocaleDateString('ru-RU');

  // Верхняя часть
  doc.setFontSize(18);
  doc.setFont(undefined, 'normal');
  doc.text(`Поручение № ${payObj.orderNumber || '—'} от ${formattedPayDate}`, marginX, y);
  y += 30;

  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(`к ДОГОВОРУ № ${agreementNo} от ${agreementDate}`, marginX, y);
  y += 28;

  doc.setFontSize(11);
  doc.text(
    `«${companyName}», именуемое «Принципал», в лице Генерального директора ${directorName}, на основании Устава, поручает Zorg International FZCO ...`,
    marginX,
    y,
    {maxWidth: 500}
  );
  y += 60;

  // Таблица
  const tableHead = [[
    "№",
    "Контракт/Инвойс",
    "Сумма",
    "Валюта",
    "Получатель и реквизиты",
    "Вознагражд. (%)",
    "Общая сумма (руб.)"
  ]];
  const contractInfo = `${payObj.contractInvoice || '—'} (${formattedPayDate})`;
  const sumOriginal  = payObj.amount?.toFixed(2) || '0.00';
  const paymentDetails = `Получатель: ${payObj.receiverName}
Адрес: ${payObj.receiverAddress}
SWIFT: ${payObj.swift}
Счёт: ${payObj.account}`;
  const defaultRates = { RUB:{cb:1,agent:1}, USD:{cb:76,agent:88}, EUR:{cb:80,agent:94}, AED:{cb:22,agent:22}, CNY:{cb:12,agent:14}, GBP:{cb:115,agent:122} };
  const adminRates = JSON.parse(localStorage.getItem('adminRates2') || '[]') || defaultRates;
  const cur = payObj.currency || 'RUB';
  const rateObj = adminRates[cur] || defaultRates[cur];
  const cbRate = rateObj.cb, agentRate = rateObj.agent;
  const overallComm = parseFloat(payObj.feePercent) + ((agentRate - cbRate)/cbRate)*100;
  const totalRub = payObj.amount * cbRate * (1 + overallComm/100);

  const tableBody = [[
    "1",
    contractInfo,
    sumOriginal,
    cur,
    paymentDetails,
    `${overallComm.toFixed(2)}%`,
    `${totalRub.toFixed(2)}`
  ]];

  doc.autoTable({
    startY: y,
    head: tableHead,
    body: tableBody,
    styles: {
      font: (typeof NotoSansRoboto !== 'undefined') ? 'NotoSansRoboto' : 'helvetica',
      fontSize: 11,
      cellPadding: {top:6, right:6, bottom:6, left:6},
      valign: 'middle',
      overflow: 'linebreak',
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [33, 102, 217],
      textColor: [255,255,255],
      fontStyle: 'Normal',
      halign: 'center'
    },
    columnStyles: {
      0: {cellWidth: 30, halign: 'center'},
      1: {cellWidth: 94},
      2: {cellWidth: 52, halign: 'right'},
      3: {cellWidth: 44, halign: 'center'},
      4: {cellWidth: 155},
      5: {cellWidth: 62, halign: 'center'},
      6: {cellWidth: 90, halign: 'right'},
    },
    margin: { left: marginX, right: marginX }
  });
  y = doc.autoTable.previous.finalY + 22;

  // Итоги и подписи
  doc.setFontSize(11);
  doc.setTextColor(33, 102, 217);
  doc.text(`Курс ЦБ РФ на ${formattedPayDate}: ${cbRate?.toFixed(4) || '-'}`, marginX, y);
  y += 18;

  doc.setTextColor(0,0,0);
  doc.text(`Назначение платежа: ${payObj.purpose || ''}`, marginX, y);
  y += 28;

  doc.setFontSize(10);
  doc.setTextColor(55, 66, 66);
  doc.text(`«Принципал»: ${companyName}, Ген. директор: ${directorName}`, marginX, y);
  y += 18;
  doc.text(`«Агент»: Zorg International FZCO, Директор: Semerenco Grigori`, marginX, y);
  y += 28;

  doc.setFontSize(11);
  doc.setTextColor(0,0,0);
  doc.text(`Подпись принципала: ____________________`, marginX, y);
  y += 18;
  doc.text(`Подпись агента: ____________________`, marginX, y);

  doc.save(`Поручение_${payObj.id}.pdf`);
}

window.renderPaymentsPage = renderPaymentsPage;
window.showPdfOrderFull = showPdfOrderFull;
window.showPdfAgentReport = showPdfAgentReport;
window.showPdfReturnRequest = showPdfReturnRequest;
