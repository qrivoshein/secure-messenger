import { createSVGIcon } from '../utils/icons';
import { createElement, createText } from '../utils/dom-helpers';

export class MessengerComponent {
  private container: HTMLElement | null = null;

  create(): HTMLElement {
    this.container = createElement('div', {
      id: 'messengerContainer',
      className: 'messenger-container'
    });

    const sidebar = this.createSidebar();
    const chatArea = this.createChatArea();

    this.container.appendChild(sidebar);
    this.container.appendChild(chatArea);

    return this.container;
  }

  private createSidebar(): HTMLElement {
    const sidebar = createElement('div', { className: 'sidebar' });

    // Header
    const header = createElement('div', { className: 'sidebar-header' });
    const title = createElement('h2', { text: 'Чаты' });
    
    const newChatBtn = createElement('button', {
      id: 'newChatBtn',
      className: 'new-chat-btn'
    });
    newChatBtn.appendChild(createSVGIcon('plus', 18, 18));
    newChatBtn.appendChild(createText(' Новый чат'));

    const logoutBtn = createElement('button', {
      id: 'logoutBtn',
      className: 'logout-btn',
      text: 'Выйти'
    });

    header.appendChild(title);
    header.appendChild(newChatBtn);
    header.appendChild(logoutBtn);

    // Connection status
    const connectionStatus = createElement('div', {
      id: 'connectionStatus',
      className: 'connection-status'
    });
    const connectionIndicator = createElement('div', { className: 'connection-indicator' });
    const connectionText = createElement('span', {
      id: 'connectionText',
      text: 'Подключение...'
    });
    connectionStatus.appendChild(connectionIndicator);
    connectionStatus.appendChild(connectionText);

    // User info
    const userInfo = createElement('div', { className: 'user-info' });
    const userAvatar = createElement('div', {
      id: 'userAvatar',
      className: 'user-avatar',
      text: 'A'
    });
    const userDetails = createElement('div', { className: 'user-details' });
    const userName = createElement('div', {
      id: 'userName',
      className: 'user-name',
      text: 'Пользователь'
    });
    const userStatus = createElement('div', { className: 'user-status' });
    // Don't show online indicator icon here, just text
    userStatus.appendChild(createText('В сети'));
    
    userDetails.appendChild(userName);
    userDetails.appendChild(userStatus);
    userInfo.appendChild(userAvatar);
    userInfo.appendChild(userDetails);

    // Search box
    const searchBox = createElement('div', { className: 'search-box' });
    const searchInput = createElement('input', {
      id: 'searchChatsInput',
      attributes: {
        type: 'text',
        placeholder: 'Поиск чатов...'
      }
    });
    searchBox.appendChild(searchInput);

    // Chats list
    const chatsList = createElement('div', {
      id: 'chatsList',
      className: 'chats-list'
    });
    const emptyState = createElement('div', {
      className: 'empty-state',
      styles: { padding: '40px 20px' }
    });
    const emptyText = createElement('p', {
      text: 'Пользователи загружаются...',
      styles: { textAlign: 'center', color: '#718096' }
    });
    emptyState.appendChild(emptyText);
    chatsList.appendChild(emptyState);

    // Append all to sidebar
    sidebar.appendChild(header);
    sidebar.appendChild(connectionStatus);
    sidebar.appendChild(userInfo);
    sidebar.appendChild(searchBox);
    sidebar.appendChild(chatsList);

    return sidebar;
  }

  private createChatArea(): HTMLElement {
    const chatArea = createElement('div', {
      id: 'chatArea',
      className: 'chat-area'
    });

    const emptyState = createElement('div', { className: 'empty-state' });
    const emptyIcon = createElement('div', { className: 'empty-state-icon' });
    emptyIcon.appendChild(createSVGIcon('chat', 80, 80, 'icon-svg'));
    
    const emptyTitle = createElement('h3', { text: 'Выберите чат' });
    const emptyText = createElement('p', {
      text: 'Выберите пользователя из списка слева, чтобы начать общение'
    });

    emptyState.appendChild(emptyIcon);
    emptyState.appendChild(emptyTitle);
    emptyState.appendChild(emptyText);
    chatArea.appendChild(emptyState);

    return chatArea;
  }

  show(): void {
    if (this.container) {
      this.container.classList.add('active');
    }
  }

  hide(): void {
    if (this.container) {
      this.container.classList.remove('active');
    }
  }
}
