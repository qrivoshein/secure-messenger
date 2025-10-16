import { createSVGIcon } from '../utils/icons';

export class MessengerComponent {
  private container: HTMLElement | null = null;

  create(): HTMLElement {
    this.container = document.createElement('div');
    this.container.id = 'messengerContainer';
    this.container.className = 'messenger-container';
    
    this.container.innerHTML = `
      <div class="sidebar">
        <div class="sidebar-header">
          <h2>Чаты</h2>
          <button class="new-chat-btn" id="newChatBtn">
            ${createSVGIcon('plus', 18, 18)}
            Новый чат
          </button>
          <button class="logout-btn" id="logoutBtn">Выйти</button>
        </div>
        <div class="connection-status" id="connectionStatus">
          <div class="connection-indicator"></div>
          <span id="connectionText">Подключение...</span>
        </div>
        <div class="user-info">
          <div class="user-avatar" id="userAvatar">A</div>
          <div class="user-details">
            <div class="user-name" id="userName">Пользователь</div>
            <div class="user-status">
              ${createSVGIcon('online', 12, 12, 'icon-svg')}
              В сети
            </div>
          </div>
        </div>
        <div class="search-box">
          <input type="text" id="searchChatsInput" placeholder="Поиск чатов..." />
        </div>
        <div class="chats-list" id="chatsList">
          <div class="empty-state" style="padding: 40px 20px;">
            <p style="text-align: center; color: #718096;">Пользователи загружаются...</p>
          </div>
        </div>
      </div>

      <div class="chat-area" id="chatArea">
        <div class="empty-state">
          <div class="empty-state-icon">
            ${createSVGIcon('chat', 80, 80, 'icon-svg')}
          </div>
          <h3>Выберите чат</h3>
          <p>Выберите пользователя из списка слева, чтобы начать общение</p>
        </div>
      </div>
    `;
    
    return this.container;
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
