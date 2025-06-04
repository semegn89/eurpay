// templates.js
import { showToast, showPreview } from './utils.js';

export async function renderTemplatesPage(){
    const details=document.querySelector('.details');
    const currentUser=JSON.parse(localStorage.getItem('currentUser'))||{};
    const isAdmin=(currentUser.role==='admin');

    details.innerHTML=`
      <h1>Шаблоны документов</h1>

      <p>Ниже — список компаний/организаций (карточки). Нажмите, чтобы просмотреть/скачать их шаблоны.</p>
      ${
        isAdmin ? `<button id="addCompanyBtn" class="button" style="margin-bottom:10px;">Добавить новую «карточку»</button>` : ``
      }
      <div id="companiesContainer"></div>
    `;
    const addCompanyBtn=details.querySelector('#addCompanyBtn');
    const companiesContainer=details.querySelector('#companiesContainer');

    // Список компаний (карточек) без ID 
    let companies=JSON.parse(localStorage.getItem('templatesCompanies'))||[
      {id:'romashka', name:'ООО Ромашка'},
      {id:'vasilek', name:'ООО Василёк'}
    ];

    if(isAdmin && addCompanyBtn){
      addCompanyBtn.addEventListener('click',()=>{
      const name=prompt('Введите название новой компании (карточки), напр. ООО ЛЮТИК');
      if(!name)return;
      const cid = 'comp-'+Date.now();
      companies.push({id:cid, name});
      localStorage.setItem('templatesCompanies', JSON.stringify(companies));
      showToast(`Компания «${name}» добавлена!`,'success');
      renderCompanyCards();
      });
    }
    // функция для отображения шалонов карточек компаний в шаблонах и их изменения для админа
    function showAdminChatDetail(email){
      details.innerHTML=`
        <h1>Чат с ${email}</h1>
        <div id="chatCardsContainer" style="margin-top:20px; display: flex; flex-wrap: wrap; gap: 20px;"></div>
        <button id="backToChatsBtn" class="button button-outline" style="margin-top:10px;">Назад к чатам</button>
        <button id="addChatBtn" class="button" style="margin-top:10px;">Добавить новый чат</button>
        <div id="chatForm" style="display:none; margin-top:20px;">
          <form id="newChatForm">
            <div class="form-row">
              <label>Название чата:</label>
              <input type="text" name="name" required>
            </div>
            <div class="form-row">
              <label>Файл чата:</label>
              <input type="file" name="file" required>
            </div>
            <button type="submit" class="button">Сохранить</button>
            <button type="button" id="cancelChat" class="button button-outline" style="margin-left:10px;">Отмена</button>
          </form>
        </div>
        <div id="chatList" style="margin-top:20px; display: flex; flex-wrap: wrap; gap: 20px;"></div>
      `;
      const chatCardsContainer=details.querySelector('#chatCardsContainer');
      const backToChatsBtn=details.querySelector('#backToChatsBtn');
      const addChatBtn=details.querySelector('#addChatBtn');
      const chatForm=details.querySelector('#chatForm');
      const newChatForm=details.querySelector('#newChatForm');
      const cancelChat=details.querySelector('#cancelChat');
      const chatList=details.querySelector('#chatList');
      const allChats=JSON.parse(localStorage.getItem('allChats'))||{};
      const userEmails=Object.keys(allChats);
      if(!userEmails.length){
        chatCardsContainer.innerHTML='<p>Нет чатов с администратором.</p>';
        return;
      }
    }  

    function renderChatCards(searchTerm = '') {
      chatCardsContainer.innerHTML = '';
      let filtered = userEmails;
      if (searchTerm) {
        filtered = userEmails.filter(em => em.toLowerCase().includes(searchTerm));
      }
      if (!filtered.length) {
        chatCardsContainer.innerHTML = '<p>Нет чатов с таким запросом.</p>';
        return;
      }
    
      filtered.forEach(email => {
        const chatArr = allChats[email] || [];
        const hasUnread = chatArr.some(m => m.from === 'user' && !m.readByAdmin);
    
        const card = document.createElement('div');
        card.style.width = '100%'; // Устанавливаем ширину карточки
        card.style.border = '1px solid #ccc';
        card.style.borderRadius = '8px';
        card.style.padding = '10px';
        card.style.display = 'flex';
        card.style.flexDirection = 'column'; // Делаем карточку вертикальной
        card.style.justifyContent = 'space-between';
        card.style.marginBottom = '20px'; // Добавляем отступ между карточками
    
        card.innerHTML = `
          <div>
            <h4 style="margin-bottom:5px;">${email}</h4>
            ${
              hasUnread
                ? `<p style="color:red;">Непрочитанные сообщения</p>`
                : `<p style="color:green;">Все прочитано</p>`
            }
          </div>
          <button class="openChatBtn button button-sm">Открыть чат</button>
        `;
        card.querySelector('.openChatBtn').addEventListener('click', () => {
          showAdminChatDetail(email);
        });
        chatCardsContainer.appendChild(card);
      });
    
      if(isAdmin){
        companiesContainer.querySelectorAll('.delCompanyBtn').forEach(btn=>{
          btn.addEventListener('click', function(){
            const cid = this.getAttribute('data-id');
            const idx = companies.findIndex(x => x.id===cid);
            if(idx!==-1){
              if(confirm('Удалить эту карточку компании?')){
                companies.splice(idx,1);
                localStorage.setItem('templatesCompanies', JSON.stringify(companies));
                renderCompanyCards();
              }
            }
          });
        });
      }
    }
    renderCompanyCards();
    // Функция для отображения карточек компаний
    function renderCompanyCards(searchTerm = '') {
      companiesContainer.innerHTML = '';
      let filtered = companies;
      if (searchTerm) {
        filtered = companies.filter(comp => comp.name.toLowerCase().includes(searchTerm));
      }
      if (!filtered.length) {
        companiesContainer.innerHTML = '<p>Нет компаний с таким запросом.</p>';
        return;
      }
      const grid = document.createElement('div');
      grid.className = 'templates-grid';
    
      filtered.forEach(comp => {
        const card = document.createElement('div');
        card.className = 'template-card';
        card.innerHTML = `
          <div class="template-card-title">${comp.name}</div>
          <div class="template-card-btns">
            <button class="viewTmplBtn button button-sm" data-id="${comp.id}">Просмотреть шаблоны</button>
            ${
              isAdmin
                ? `<button class="delCompanyBtn button button-sm button-outline" data-id="${comp.id}">Удалить</button>`
                : ''
            }
          </div>
        `;
        card.querySelector('.viewTmplBtn').addEventListener('click', function () {
          const cid = this.getAttribute('data-id');
          const found = companies.find(x => x.id === cid);
          if (!found) return;
          showCompanyTemplates(found.id, found.name);
        });
        if(isAdmin){
          card.querySelector('.delCompanyBtn')?.addEventListener('click', function(){
            const cid = this.getAttribute('data-id');
            const idx = companies.findIndex(x => x.id===cid);
            if(idx!==-1){
              if(confirm('Удалить эту карточку компании?')){
                companies.splice(idx,1);
                localStorage.setItem('templatesCompanies', JSON.stringify(companies));
                renderCompanyCards();
              }
            }
          });
        }
        grid.appendChild(card);
      });
      companiesContainer.appendChild(grid);
    }
    // Функция для отображения шаблонов компании 

    function showCompanyTemplates(companyId, companyName){
      // Рисуем внутреннюю страницу шаблонов для выбранной компании
      details.innerHTML = `
        <div class="tmpls-inner-header">
          <span class="tmpls-title">Шаблоны для ${companyName}</span>
          ${
            isAdmin
              ? `<button id="tmplAddBtn" class="tmpls-add-btn">+ Добавить шаблон</button>`
              : ''
          }
          <button id="tmplBackBtn" class="button button-outline" style="margin-left:auto;">Назад</button>
        </div>
        <div id="tmplList" class="tmpls-list"></div>
      `;
      const tmplList = details.querySelector('#tmplList');
      const tmplAddBtn = details.querySelector('#tmplAddBtn');
      const tmplBackBtn = details.querySelector('#tmplBackBtn');
    
      let allTemplates = JSON.parse(localStorage.getItem('templates')) || {};
      if(!allTemplates[companyId]) allTemplates[companyId] = [];
    
      function getFileIcon(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        if (ext === 'pdf') return `<span class="tmpls-icon">📄</span>`;
        if (['doc','docx'].includes(ext)) return `<span class="tmpls-icon">📝</span>`;
        if (['xls','xlsx'].includes(ext)) return `<span class="tmpls-icon">📊</span>`;
        if (['png','jpg','jpeg'].includes(ext)) return `<span class="tmpls-icon">🖼️</span>`;
        return `<span class="tmpls-icon">📁</span>`;
      }
    
      function renderTmplList(){
        const arr = allTemplates[companyId];
        tmplList.innerHTML = '';
        if(!arr.length){
          tmplList.innerHTML = '<div class="tmpls-empty">Нет шаблонов для данной компании.</div>';
          return;
        }
        arr.forEach(tmpl => {
          const card = document.createElement('div');
          card.className = 'tmpls-card';
          card.innerHTML = `
            ${getFileIcon(tmpl.fileName)}
            <div class="tmpl-name">${tmpl.name}</div>
            <div class="tmpl-filename">${tmpl.fileName}</div>
            <div class="tmpl-actions">
              <button class="prevTmplBtn button button-sm" data-id="${tmpl.id}">Просмотр</button>
              <a href="${tmpl.data}" download="${tmpl.fileName}" class="button button-sm">Скачать</a>
              ${isAdmin? `<button class="delTmplBtn button button-sm button-outline" data-id="${tmpl.id}">Удалить</button>` : ''}
            </div>
          `;
          card.querySelector('.prevTmplBtn').onclick = () => {
            if(tmpl.fileName.toLowerCase().endsWith('.pdf')){
              showPreview(`<iframe src="${tmpl.data}" width="100%" height="600px"></iframe>`);
            } else if(/\.(png|jpe?g)$/i.test(tmpl.fileName)){
              showPreview(`<img src="${tmpl.data}" style="max-width:100%;height:auto;" />`);
            } else {
              showPreview(`<p>Невозможно отобразить "${tmpl.fileName}". Попробуйте скачать.</p>`);
            }
          };
          card.querySelector('.delTmplBtn')?.addEventListener('click',()=>{
            if(confirm('Удалить этот шаблон?')){
              const arr = allTemplates[companyId];
              const i = arr.findIndex(x=>x.id===tmpl.id);
              if(i!==-1){
                arr.splice(i,1);
                allTemplates[companyId]=arr;
                localStorage.setItem('templates', JSON.stringify(allTemplates));
                showToast('Шаблон удалён!','info');
                renderTmplList();
              }
            }
          });
          tmplList.appendChild(card);
        });
      }
    
      // Модалка добавления шаблона
      function showAddModal(){
        const bg = document.createElement('div');
        bg.className = 'tmpls-modal-bg';
        bg.innerHTML = `
          <div class="tmpls-modal">
            <form id="tmplModalForm" autocomplete="off">
              <label>Название шаблона:</label>
              <input type="text" name="name" required maxlength="80" autocomplete="off">
              <label>Файл шаблона:</label>
              <input type="file" name="file" required>
              <div class="btns">
                <button type="submit" class="button">Сохранить</button>
                <button type="button" id="tmplCancelBtn" class="button button-outline">Отмена</button>
              </div>
            </form>
          </div>
        `;
        document.body.appendChild(bg);
        const modalForm = bg.querySelector('#tmplModalForm');
        const cancelBtn = bg.querySelector('#tmplCancelBtn');
        cancelBtn.onclick = () => document.body.removeChild(bg);
    
        modalForm.onsubmit = (e) => {
          e.preventDefault();
          const fd = new FormData(modalForm);
          const name = fd.get('name');
          const file = fd.get('file');
          if(!file){
            showToast('Не выбран файл','error');
            return;
          }
          const reader = new FileReader();
          reader.onload = function(ev){
            const dataURL = ev.target.result;
            const newTmpl = {
              id: Date.now(),
              name,
              fileName: file.name,
              data: dataURL
            };
            allTemplates[companyId].push(newTmpl);
            localStorage.setItem('templates', JSON.stringify(allTemplates));
            showToast('Шаблон добавлен!','success');
            document.body.removeChild(bg);
            renderTmplList();
          };
          reader.readAsDataURL(file);
        };
      }
    
      if(isAdmin && tmplAddBtn){
        tmplAddBtn.onclick = showAddModal;
      }
      tmplBackBtn.onclick = () => renderTemplatesPage();
    
      renderTmplList();
      // Обработчики для кнопок добавления и отмены шаблона
      

      if(addTmplBtn){
        addTmplBtn.addEventListener('click',()=>{
          if(!isAdmin){
            showToast('Только админ может добавлять','error');
            return;
          }
          tmplForm.style.display='block';
        });
      }
      if(cancelTmpl){
        cancelTmpl.addEventListener('click',()=>{
          tmplForm.style.display='none';
          newTemplateForm.reset();
        });
      }
      if(newTemplateForm){
        newTemplateForm.addEventListener('submit',(e)=>{
          e.preventDefault();
          if(!isAdmin){
            showToast('Только админ может добавлять','error');
            return;
          }
          const fd=new FormData(newTemplateForm);
          const name=fd.get('name');
          const file=fd.get('file');
          if(!file){
            showToast('Не выбран файл','error');
            return;
          }
          const reader=new FileReader();
          reader.onload=function(ev){
            const dataURL=ev.target.result;
            const newTmpl={
              id:Date.now(),
              name,
              fileName:file.name,
              data:dataURL
            };
            allTemplates[companyId].push(newTmpl);
            localStorage.setItem('templates', JSON.stringify(allTemplates));
            showToast('Шаблон добавлен!','success');
            tmplForm.style.display='none';
            newTemplateForm.reset();
            renderTmplList();
          };
          reader.readAsDataURL(file);
        });
      }
    }
  }