import { createSVGIcon } from '../utils/icons';

export class SettingsComponent {
  private container: HTMLElement | null = null;

  create(): HTMLElement {
    this.container = document.createElement('div');
    this.container.id = 'settingsScreen';
    this.container.className = 'settings-screen';
    
    this.container.innerHTML = `
      <div class="settings-header">
        <h2>Настройки</h2>
      </div>
      <div class="bottom-navigation">
        <div class="bottom-nav-items">
          <div class="bottom-nav-item" data-screen="messenger">
            ${createSVGIcon('chat', 24, 24)}
            <span>Чаты</span>
          </div>
          <div class="bottom-nav-item" data-screen="profile">
            ${createSVGIcon('user', 24, 24)}
            <span>Профиль</span>
          </div>
          <div class="bottom-nav-item active" data-screen="settings">
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
