// documents.js
import { showToast, showPreview } from './utils.js';
import { getItem, setItem } from './dbStorage.js';

export async function renderDocumentsPage() {
  const details = document.querySelector('.details');
  const currentUserData = await getItem('currentUser');
  const currentUser = currentUserData ? JSON.parse(currentUserData) : {};
  const isAdmin = (currentUser.role === 'admin');

  details.style.background = 'rgba(255,255,255,1)';

  details.innerHTML = `
    <h1>Документы</h1>
    <div style="margin-bottom:10px;">
      <label>Выберите УНП для загрузки:</label>
      <select id="paymentSelect" style="margin-left:5px;"></select>

      <!-- Выбор категории документа -->
      <select id="docCategory" class="button button-sm" style="margin-left:5px;">
        <option value="Другое">-- Категория --</option>
        <option value="Инвойс">Инвойс</option>
        <option value="Договор">Договор</option>
        <option value="Разрешение">Разрешение</option>
        <option value="Счёт">Счёт</option>
      </select>

      <input type="file" id="docFileInput" style="display:none;">
      <button id="chooseFileBtn" class="button button-sm" style="margin-left:5px;">Выбрать файл</button>
      <button id="uploadFileBtn" class="button button-sm" style="margin-left:5px;">Загрузить</button>
    </div>

    <div id="uploadStatus" style="color:blue;margin-bottom:10px;"></div>

    <div id="mainView">
      <div style="margin-bottom:10px;">
        <input type="text" id="searchInput" placeholder="Поиск по УНП или назначению..." style="width: 100%; padding: 5px; font-size: 14px;">
      </div>
      <div id="paymentsList" style="display:flex; flex-direction: column; gap:10px; max-height: 600px; overflow-y: auto;"></div>
      <div id="documentsView" style="display:none;">
        <button id="backToPaymentsBtn" class="button button-sm" style="margin-bottom:10px;">Назад</button>
        <h2 id="paymentHeader"></h2>
        <div id="docsContainer"></div>
      </div>
    </div>
  `;

  const paymentSelect  = details.querySelector('#paymentSelect');
  const docCategory    = details.querySelector('#docCategory');
  const docFileInput   = details.querySelector('#docFileInput');
  const chooseFileBtn  = details.querySelector('#chooseFileBtn');
  const uploadFileBtn  = details.querySelector('#uploadFileBtn');
  const uploadStatus   = details.querySelector('#uploadStatus');

  const searchInput    = details.querySelector('#searchInput');
  const paymentsList   = details.querySelector('#paymentsList');
  const documentsView  = details.querySelector('#documentsView');
  const backToPaymentsBtn = details.querySelector('#backToPaymentsBtn');
  const paymentHeader  = details.querySelector('#paymentHeader');
  const docsContainer  = details.querySelector('#docsContainer');

  // Load payments and documents data
  let payments = [];
  let documents = [];

  async function loadData() {
    let paymentsData = await getItem('payments');
    payments = paymentsData ? JSON.parse(paymentsData) : [];
    if (!isAdmin) {
      payments = payments.filter(p => p.ownerEmail === currentUser.email);
    }
    payments.sort((a, b) => new Date(b.date) - new Date(a.date));

    let docsData = await getItem('documents');
    documents = docsData ? JSON.parse(docsData) : [];
  }

  // Populate the paymentSelect dropdown for upload
  function populatePaymentSelect() {
    if (!payments.length) {
      paymentSelect.innerHTML = '<option value="" disabled selected>--- Нет платежей ---</option>';
    } else {
      paymentSelect.innerHTML = '<option value="" disabled selected>--- Выберите УНП ---</option>';
      payments.forEach(p => {
        paymentSelect.innerHTML += `<option value="${p.id}">${p.id} | ${p.purpose}</option>`;
      });
    }
  }

  // Upload file handling
  chooseFileBtn.addEventListener('click', () => {
    docFileInput.click();
  });

  uploadFileBtn.addEventListener('click', async () => {
    const selectedUNP = paymentSelect.value;
    if (!selectedUNP) {
      showToast('Сначала выберите УНП!', 'error');
      return;
    }
    if (!docFileInput.files.length) {
      showToast('Сначала выберите файл!', 'error');
      return;
    }
    if (!docCategory.value) {
      showToast('Сначала выберите категорию документа!', 'error');
      return;
    }
    if (docFileInput.files.length > 1) {
      showToast('Выберите только один файл!', 'error');
      return;
    }
    const file = docFileInput.files[0];
    if (!file) {
      showToast('Не выбран файл!', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      showToast('Размер файла не должен превышать 5MB!', 'error');  
      return;
    }
    if (!/\.(pdf|png|jpg|jpeg)$/i.test(file.name)) {
      showToast('Поддерживаются только PDF и изображения (PNG, JPG, JPEG)!', 'error');
      return;
    }
    const category = docCategory.value || 'Другое';

    uploadStatus.textContent = `Загружаем файл "${file.name}"...`;

    const reader = new FileReader();
    reader.onload = async function (e) {
      await loadData(); // refresh documents array
      const docId = Date.now();
      documents.push({
        id: docId,
        name: file.name,
        data: e.target.result,
        linkedPaymentId: selectedUNP,
        category
      });
      await setItem('documents', JSON.stringify(documents));

      showToast(`Файл "${file.name}" (${category}) привязан к ${selectedUNP}`, 'success');
      uploadStatus.textContent = `Файл "${file.name}" загружен!`;
      docFileInput.value = '';
      await loadData();
      if (currentView === 'payments') {
        renderPaymentsList();
      } else if (currentView === 'documents' && currentPaymentId === selectedUNP) {
        renderDocumentsForPayment(selectedUNP);
      }
    };
    reader.readAsDataURL(file);
  });

  // State variables
  let currentView = 'payments'; // 'payments' or 'documents'
  let currentPaymentId = null;

  // Render payments list view (main page)
  function renderPaymentsList(filterText = '') {
    currentView = 'payments';
    currentPaymentId = null;
    documentsView.style.display = 'none';
    paymentsList.style.display = 'block'; // grid works with block

    // Фильтрация по поиску
    const filteredPayments = payments.filter(p => {
      const searchLower = filterText.toLowerCase();
      return p.id.toLowerCase().includes(searchLower) || p.purpose.toLowerCase().includes(searchLower);
    });

    paymentsList.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'unp-grid';

    if (filteredPayments.length === 0) {
      grid.innerHTML = '<p>Платежи не найдены.</p>';
    } else {
      filteredPayments.forEach(pay => {
        const payDocs = documents.filter(d => d.linkedPaymentId === pay.id);
        const docCount = payDocs.length;

        // Крупная вертикальная карточка в стиле iOS
        const card = document.createElement('div');
        card.className = 'unp-card';

        card.innerHTML = `
          <div class="unp-card-title">УНП-${pay.id}</div>
          <div class="unp-card-count">документов — ${docCount}</div>
        `;

        card.addEventListener('click', () => {
          currentPaymentId = pay.id;
          renderDocumentsForPayment(pay.id);
        });

        grid.appendChild(card);
      });
    }

    paymentsList.appendChild(grid);
  }

  // Render documents view for a selected payment
  function renderDocumentsForPayment(paymentId) {
    currentView = 'documents';
    paymentsList.style.display = 'none';
    documentsView.style.display = 'block';
    uploadStatus.textContent = '';

    const payment = payments.find(p => p.id === paymentId);
    if (!payment) {
      paymentHeader.textContent = 'Платеж не найден';
      docsContainer.innerHTML = '';
      return;
    }
    paymentHeader.textContent = `${payment.id} | ${payment.purpose}`;

    const payDocs = documents.filter(d => d.linkedPaymentId === paymentId);

    if (payDocs.length === 0) {
      docsContainer.innerHTML = '<p>Нет прикреплённых документов</p>';
      return;
    }

    docsContainer.innerHTML = '';

    payDocs.forEach(doc => {
      const docDiv = document.createElement('div');
      docDiv.classList.add('document-item');
      docDiv.style.border = '1px solid #ccc';
      docDiv.style.borderRadius = '6px';
      docDiv.style.padding = '10px';
      docDiv.style.marginBottom = '10px';
      docDiv.style.display = 'flex';
      docDiv.style.alignItems = 'center';
      docDiv.style.gap = '10px';
      docDiv.style.backgroundColor = '#fff';

      // Preview thumbnail or icon
      const preview = document.createElement('div');
      preview.style.width = '60px';
      preview.style.height = '60px';
      preview.style.border = '1px solid #ddd';
      preview.style.borderRadius = '4px';
      preview.style.overflow = 'hidden';
      preview.style.display = 'flex';
      preview.style.alignItems = 'center';
      preview.style.justifyContent = 'center';
      preview.style.backgroundColor = '#f9f9f9';
      preview.style.cursor = 'pointer';
      preview.title = doc.name;

      if (doc.name.toLowerCase().endsWith('.pdf')) {
        preview.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="#d9534f" viewBox="0 0 24 24" width="36" height="36"><path d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM15 3.5V9h5"/></svg>`;
      } else if (/\.(png|jpg|jpeg)$/i.test(doc.name)) {
        const img = document.createElement('img');
        img.src = doc.data;
        img.alt = doc.name;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        preview.appendChild(img);
      } else {
        preview.textContent = '—';
      }

      preview.addEventListener('click', () => openPreviewDoc(doc.id));

      // Info container
      const infoDiv = document.createElement('div');
      infoDiv.style.flexGrow = '1';
      infoDiv.style.display = 'flex';
      infoDiv.style.flexDirection = 'column';

      const nameEl = document.createElement('strong');
      nameEl.textContent = doc.name;

      const categoryEl = document.createElement('em');
      categoryEl.style.color = 'gray';
      categoryEl.style.fontSize = '13px';
      categoryEl.textContent = `[${doc.category || '—'}]`;

      infoDiv.appendChild(nameEl);
      infoDiv.appendChild(categoryEl);

      // Buttons container
      const buttonsDiv = document.createElement('div');
      buttonsDiv.style.display = 'flex';
      buttonsDiv.style.gap = '5px';

      const previewBtn = document.createElement('button');
      previewBtn.className = 'button button-sm';
      previewBtn.textContent = 'Просмотр';
      previewBtn.addEventListener('click', () => openPreviewDoc(doc.id));

      const downloadLink = document.createElement('a');
      downloadLink.href = doc.data;
      downloadLink.download = doc.name;
      downloadLink.className = 'button button-sm';
      downloadLink.textContent = 'Скачать';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'button button-sm button-outline';
      deleteBtn.textContent = 'Удалить';
      deleteBtn.addEventListener('click', async () => {
        const idx = documents.findIndex(x => x.id === doc.id);
        if (idx !== -1) {
          documents.splice(idx, 1);
          await setItem('documents', JSON.stringify(documents));
          showToast('Документ удалён!', 'info');
          await loadData();
          renderDocumentsForPayment(paymentId);
        }
      });

      buttonsDiv.appendChild(previewBtn);
      buttonsDiv.appendChild(downloadLink);
      buttonsDiv.appendChild(deleteBtn);

      docDiv.appendChild(preview);
      docDiv.appendChild(infoDiv);
      docDiv.appendChild(buttonsDiv);

      docsContainer.appendChild(docDiv);
    });
  }

  backToPaymentsBtn.addEventListener('click', () => {
    renderPaymentsList(searchInput.value.trim());
  });

  searchInput.addEventListener('input', () => {
    renderPaymentsList(searchInput.value.trim());
  });

  // Preview document modal
  function openPreviewDoc(docId) {
    (async () => {
      await loadData();
      const d = documents.find(x => x.id == docId);
      if (!d) return;
      if (d.name.toLowerCase().endsWith('.pdf')) {
        showPreview(`<iframe src="${d.data}" width="100%" height="600px" style="border:none;"></iframe>`);
      } else if (/\.(png|jpg|jpeg)$/i.test(d.name)) {
        showPreview(`<img src="${d.data}" style="max-width:100%;height:auto;" alt="${d.name}" />`);
      } else {
        showPreview(`<p>Невозможно отобразить "${d.name}". Попробуйте скачать.</p>`);
      }
    })();
  }

  // Initialization
  await loadData();
  populatePaymentSelect();
  renderPaymentsList();
}