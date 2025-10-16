import { createSVGIcon } from '../utils/icons';
import { createElement, createText } from '../utils/dom-helpers';

export class ProfileComponent {
  private container: HTMLElement | null = null;

  create(): HTMLElement {
    this.container = createElement('div', {
      id: 'profileScreen',
      className: 'profile-screen'
    });

    // Profile header
    const header = createElement('div', { className: 'profile-header' });
    
    const avatar = createElement('div', {
      id: 'profileAvatar',
      className: 'profile-avatar-large',
      text: 'A'
    });

    const username = createElement('div', {
      id: 'profileUsername',
      className: 'profile-username',
      text: 'Пользователь'
    });

    const status = createElement('div', { className: 'profile-status' });
    status.appendChild(createSVGIcon('online', 14, 14, 'icon-svg'));
    status.appendChild(createText(' В сети'));

    header.appendChild(avatar);
    header.appendChild(username);
    header.appendChild(status);

    // Bottom navigation
    const bottomNav = this.createBottomNav('profile');

    this.container.appendChild(header);
    this.container.appendChild(bottomNav);
    
    return this.container;
  }

  private createBottomNav(active: string): HTMLElement {
    const nav = createElement('div', { className: 'bottom-navigation' });
    const items = createElement('div', { className: 'bottom-nav-items' });

    // Messenger
    const messengerItem = createElement('div', {
      className: active === 'messenger' ? 'bottom-nav-item active' : 'bottom-nav-item',
      attributes: { 'data-screen': 'messenger' }
    });
    messengerItem.appendChild(createSVGIcon('chat', 24, 24));
    const messengerSpan = createElement('span', { text: 'Чаты' });
    messengerItem.appendChild(messengerSpan);

    // Profile
    const profileItem = createElement('div', {
      className: active === 'profile' ? 'bottom-nav-item active' : 'bottom-nav-item',
      attributes: { 'data-screen': 'profile' }
    });
    profileItem.appendChild(createSVGIcon('user', 24, 24));
    const profileSpan = createElement('span', { text: 'Профиль' });
    profileItem.appendChild(profileSpan);

    // Settings
    const settingsItem = createElement('div', {
      className: active === 'settings' ? 'bottom-nav-item active' : 'bottom-nav-item',
      attributes: { 'data-screen': 'settings' }
    });
    settingsItem.appendChild(createSVGIcon('settings', 24, 24));
    const settingsSpan = createElement('span', { text: 'Настройки' });
    settingsItem.appendChild(settingsSpan);

    items.appendChild(messengerItem);
    items.appendChild(profileItem);
    items.appendChild(settingsItem);
    nav.appendChild(items);

    return nav;
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
