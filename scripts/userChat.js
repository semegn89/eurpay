// Универсальный рендер сообщений (локально для userChat.js)
function renderMessages(arr, container, currentUserRole = 'user') {
  // Проверяем, был ли пользователь внизу до обновления
  const wasAtBottom = (container.scrollTop + container.clientHeight >= container.scrollHeight - 10);
  container.innerHTML = '';
  arr.forEach(msg => {
    const who = msg.from === 'user' ? 'user' : 'admin';
    const name = who === 'user'
      ? (currentUserRole === 'admin' ? (msg.userEmail || "Пользователь") : "Вы")
      : "Менеджер";
    const text = msg.fileName
      ? `<a href="${msg.fileData}" class="file-link" download="${msg.fileName}">${msg.fileName}</a>`
      : msg.text;
    const div = document.createElement('div');
    div.className = `chat-bubble ${who}`;
    div.innerHTML = `
      <div class="text">${text}</div>
      <div class="meta">
        <span class="author">${name}</span> ${msg.date || ''}
      </div>
    `;
    container.appendChild(div);
  });
  // Скроллим вниз только если пользователь был внизу
  if (wasAtBottom) {
    container.scrollTop = container.scrollHeight;
  }
}

window.renderUserChatPage = function () {
    const details = document.querySelector('.details');
    const userRaw = localStorage.getItem('currentUser');
    const curUser = userRaw ? JSON.parse(userRaw) : {};
  
    if (!curUser || curUser.role !== 'user') {
      details.innerHTML = '<h1>Доступно только для пользователей.</h1>';
      return;
    }
  
    // Получаем историю диалога пользователя с менеджером
    const userEmail = curUser.email;
    let allChats = JSON.parse(localStorage.getItem('adminChats') || '{}');
    if (!allChats[userEmail]) allChats[userEmail] = [];
    let chatArr = allChats[userEmail];
  
    // Количество непрочитанных (для юзера — все сообщения от admin, у которых нет "readByUser": true)
    const unreadCount = chatArr.filter(msg => msg.from === 'admin' && !msg.readByUser).length;
  
    // Главный HTML — стиль Telegram/WhatsApp, полная поддержка всех классов!
    details.innerHTML = `
      <div class="chat-container">
        <div class="chat-messages"></div>
        <form class="chat-input-row">
          <button type="button" class="attach-btn" title="Прикрепить файл">📎</button>
          <input type="file" class="hidden-file" style="display:none;">
          <input type="text" placeholder="Введите сообщение...">
          <button type="submit">Отправить</button>
        </form>
        <div class="selected-file-name" style="font-size:0.96em;color:#555;margin-top:2px;min-height:20px;"></div>
        <div id="userChatUnreadNotice" style="text-align:center;color:#0057ff;display:${unreadCount > 0 ? 'block' : 'none'};">
          Новое сообщение от менеджера
        </div>
      </div>
    `;
  
    // Получаем элементы
    const chatMessages = details.querySelector('.chat-messages');
    const chatForm = details.querySelector('.chat-input-row');
    const chatInput = chatForm.querySelector('input[type="text"]');
    const fileInput = chatForm.querySelector('input[type="file"]');
    const attachBtn = chatForm.querySelector('.attach-btn');
    const fileNameDiv = details.querySelector('.selected-file-name');
    const unreadNotice = details.querySelector('#userChatUnreadNotice');
  
    // Рендер сообщений
    function renderMessages(arr) {
      chatMessages.innerHTML = '';
      arr.forEach(msg => {
        const who = msg.from === 'user' ? 'user' : 'admin';
        const name = who === 'user' ? "Вы" : "Менеджер";
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
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  
    // Показываем имя выбранного файла
    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) {
        fileNameDiv.textContent = `Выбрано: ${fileInput.files[0].name}`;
      } else {
        fileNameDiv.textContent = '';
      }
    });
    attachBtn.addEventListener('click', () => fileInput.click());
  
    // Отправка сообщения
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const txt = chatInput.value.trim();
      const file = fileInput.files[0];
      if (!txt && !file) return;
      let msgObj = {
        userEmail,
        from: 'user',
        text: txt,
        fileName: '',
        fileData: '',
        date: new Date().toLocaleString(),
        timestamp: Date.now(),
        readByUser: true,
        readByAdmin: false
      };
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          msgObj.fileName = file.name;
          msgObj.fileData = ev.target.result;
          chatArr.push(msgObj);
          allChats[userEmail] = chatArr;
          localStorage.setItem('adminChats', JSON.stringify(allChats));
          fileInput.value = '';
          fileNameDiv.textContent = '';
          chatInput.value = '';
          renderMessages(chatArr);
        };
        reader.readAsDataURL(file);
      } else {
        chatArr.push(msgObj);
        allChats[userEmail] = chatArr;
        localStorage.setItem('adminChats', JSON.stringify(allChats));
        chatInput.value = '';
        renderMessages(chatArr);
      }
    });
  
    // Прочтение всех новых сообщений админа
    function markAdminMessagesRead() {
      let wasUnread = false;
      chatArr.forEach(msg => {
        if (msg.from === 'admin' && !msg.readByUser) {
          msg.readByUser = true;
          wasUnread = true;
        }
      });
      if (wasUnread) {
        allChats[userEmail] = chatArr;
        localStorage.setItem('adminChats', JSON.stringify(allChats));
        // Убрать индикатор
        if (unreadNotice) unreadNotice.style.display = 'none';
        const badge = document.getElementById('userChatUnread');
        if (badge) badge.style.display = 'none';
      }
    }
    markAdminMessagesRead();
  
    // Счётчик новых сообщений (иконка в сайдбаре)
    function updateSidebarChatBadge() {
      const badge = document.getElementById('userChatUnread');
      const unread = chatArr.filter(m => m.from === 'admin' && !m.readByUser).length;
      if (badge) {
        badge.textContent = unread > 0 ? unread : '';
        badge.style.display = unread > 0 ? '' : 'none';
      }
    }
    updateSidebarChatBadge();
  
    // Периодическая проверка новых сообщений
    setInterval(() => {
      allChats = JSON.parse(localStorage.getItem('adminChats') || '{}');
      chatArr = allChats[userEmail] || [];
      renderMessages(chatArr);
      updateSidebarChatBadge();
      markAdminMessagesRead();
    }, 3000);
  
    renderMessages(chatArr);
  };
    
  
    // Элементы
    const chatBox = document.getElementById('userChatBox');
    const chatForm = document.getElementById('userChatForm');
    const chatInput = document.getElementById('userChatInput');
    const chatFile = document.getElementById('userChatFile');
    const attachBtn = document.getElementById('userAttachFileBtn');
    const fileNameDiv = document.getElementById('userSelectedFileName');
    const unreadNotice = document.getElementById('userChatUnreadNotice');
  
    // Рендер чата
    function renderChat() {
      renderMessages(chatArr, chatBox, 'user');
    }
  
    // Показываем имя выбранного файла
    chatFile.addEventListener('change', () => {
      if (chatFile.files[0]) {
        fileNameDiv.textContent = `Выбрано: ${chatFile.files[0].name}`;
      } else {
        fileNameDiv.textContent = '';
      }
    });
    attachBtn.addEventListener('click', () => chatFile.click());
  
    // Отправка сообщения
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const txt = chatInput.value.trim();
      const file = chatFile.files[0];
      if (!txt && !file) return;
      let msgObj = {
        userEmail,
        from: 'user',
        text: txt,
        fileName: '',
        fileData: '',
        date: new Date().toLocaleString(),
        timestamp: Date.now(),
        readByUser: true,
        readByAdmin: false
      };
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          msgObj.fileName = file.name;
          msgObj.fileData = ev.target.result;
          chatArr.push(msgObj);
          allChats[userEmail] = chatArr;
          localStorage.setItem('adminChats', JSON.stringify(allChats));
          chatFile.value = '';
          fileNameDiv.textContent = '';
          chatInput.value = '';
          renderChat();
        };
        reader.readAsDataURL(file);
      } else {
        chatArr.push(msgObj);
        allChats[userEmail] = chatArr;
        localStorage.setItem('adminChats', JSON.stringify(allChats));
        chatInput.value = '';
        renderChat();
      }
    });
  
    // Прочтение всех новых сообщений админа
    function markAdminMessagesRead() {
      let wasUnread = false;
      chatArr.forEach(msg => {
        if (msg.from === 'admin' && !msg.readByUser) {
          msg.readByUser = true;
          wasUnread = true;
        }
      });
      if (wasUnread) {
        allChats[userEmail] = chatArr;
        localStorage.setItem('adminChats', JSON.stringify(allChats));
        // Убрать индикатор
        if (unreadNotice) unreadNotice.style.display = 'none';
        const badge = document.getElementById('userChatUnread');
        if (badge) badge.style.display = 'none';
      }
    }
  
    // При открытии чата сразу отмечаем все новые сообщения как прочитанные
    markAdminMessagesRead();
  
    // Счётчик новых сообщений (иконка в сайдбаре)
    function updateSidebarChatBadge() {
      const badge = document.getElementById('userChatUnread');
      const unread = chatArr.filter(m => m.from === 'admin' && !m.readByUser).length;
      if (badge) {
        badge.textContent = unread > 0 ? unread : '';
        badge.style.display = unread > 0 ? '' : 'none';
      }
    }
    updateSidebarChatBadge();
  
    // Периодическая проверка новых сообщений
    setInterval(() => {
      allChats = JSON.parse(localStorage.getItem('adminChats') || '{}');
      chatArr = allChats[userEmail] || [];
      renderChat();
      updateSidebarChatBadge();
      markAdminMessagesRead();
    }, 3000);
  
    renderChat();
export const renderUserChatPage = window.renderUserChatPage;
// Конец userChat.js