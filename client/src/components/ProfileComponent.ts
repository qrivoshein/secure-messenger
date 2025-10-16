import { createSVGIcon } from '../utils/icons';

export class ProfileComponent {
  private container: HTMLElement | null = null;

  create(): HTMLElement {
    this.container = document.createElement('div');
    this.container.id = 'profileScreen';
    this.container.className = 'profile-screen';
    
    this.container.innerHTML = `
      <div class="profile-header">
        <div class="profile-avatar-large" id="profileAvatar">A</div>
        <div class="profile-username" id="profileUsername">Пользователь</div>
        <div class="profile-status">
          ${createSVGIcon('online', 14, 14, 'icon-svg')}
          В сети
        </div>
      </div>
      <div class="bottom-navigation">
        <div class="bottom-nav-items">
          <div class="bottom-nav-item" data-screen="messenger">
            ${createSVGIcon('chat', 24, 24)}
            <span>Чаты</span>
          </div>
          <div class="bottom-nav-item active" data-screen="profile">
            ${createSVGIcon('user', 24, 24)}
            <span>Профиль</span>
          </div>
          <div class="bottom-nav-item" data-screen="settings">
            ${createSVGIcon('settings', 24, 24)}
            <span>Настройки</span>
          </div>
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
