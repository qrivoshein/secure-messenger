import { createSVGIcon } from '../utils/icons';
import { createElement, createText } from '../utils/dom-helpers';

export class AuthComponent {
  private container: HTMLElement | null = null;

  create(): HTMLElement {
    this.container = createElement('div', {
      id: 'authScreen',
      className: 'auth-screen'
    });

    const authBox = createElement('div', { className: 'auth-box' });

    // Logo
    const authLogo = createElement('div', {
      className: 'auth-logo',
      children: [createSVGIcon('lockAuth', 64, 64)]
    });

    // Title
    const title = createElement('h1', { text: 'ЭГИДА' });
    const subtitle = createElement('div', {
      className: 'auth-subtitle',
      text: 'Защищенный мессенджер'
    });

    // Login Form
    const loginForm = this.createLoginForm();

    // Register Form
    const registerForm = this.createRegisterForm();

    authBox.appendChild(authLogo);
    authBox.appendChild(title);
    authBox.appendChild(subtitle);
    authBox.appendChild(loginForm);
    authBox.appendChild(registerForm);

    this.container.appendChild(authBox);

    return this.container;
  }

  private createLoginForm(): HTMLElement {
    const form = createElement('div', { id: 'loginForm' });

    const usernameInput = createElement('input', {
      id: 'loginUsername',
      attributes: {
        type: 'text',
        placeholder: 'Логин'
      }
    });

    const passwordInput = createElement('input', {
      id: 'loginPassword',
      attributes: {
        type: 'password',
        placeholder: 'Пароль'
      }
    });

    const loginButton = createElement('button', {
      id: 'loginBtn',
      text: 'Войти'
    });

    const messageDiv = createElement('div', { id: 'loginMessage' });

    const switchDiv = createElement('div', { className: 'auth-switch' });
    switchDiv.appendChild(createText('Нет аккаунта? '));
    const registerLink = createElement('a', {
      id: 'showRegisterLink',
      text: 'Зарегистрироваться',
      attributes: { href: '#' }
    });
    switchDiv.appendChild(registerLink);

    form.appendChild(usernameInput);
    form.appendChild(passwordInput);
    form.appendChild(loginButton);
    form.appendChild(messageDiv);
    form.appendChild(switchDiv);

    return form;
  }

  private createRegisterForm(): HTMLElement {
    const form = createElement('div', {
      id: 'registerForm',
      styles: { display: 'none' }
    });

    const usernameInput = createElement('input', {
      id: 'registerUsername',
      attributes: {
        type: 'text',
        placeholder: 'Логин'
      }
    });

    const passwordInput = createElement('input', {
      id: 'registerPassword',
      attributes: {
        type: 'password',
        placeholder: 'Пароль'
      }
    });

    const passwordConfirmInput = createElement('input', {
      id: 'registerPasswordConfirm',
      attributes: {
        type: 'password',
        placeholder: 'Подтвердите пароль'
      }
    });

    const registerButton = createElement('button', {
      id: 'registerBtn',
      text: 'Зарегистрироваться'
    });

    const messageDiv = createElement('div', { id: 'registerMessage' });

    const switchDiv = createElement('div', { className: 'auth-switch' });
    switchDiv.appendChild(createText('Уже есть аккаунт? '));
    const loginLink = createElement('a', {
      id: 'showLoginLink',
      text: 'Войти',
      attributes: { href: '#' }
    });
    switchDiv.appendChild(loginLink);

    form.appendChild(usernameInput);
    form.appendChild(passwordInput);
    form.appendChild(passwordConfirmInput);
    form.appendChild(registerButton);
    form.appendChild(messageDiv);
    form.appendChild(switchDiv);

    return form;
  }

  show(): void {
    if (this.container) {
      this.container.style.display = 'flex';
    }
  }

  hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }
}
