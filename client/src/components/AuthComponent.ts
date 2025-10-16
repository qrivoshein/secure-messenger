import { createSVGIcon } from '../utils/icons';

export class AuthComponent {
  private container: HTMLElement | null = null;

  create(): HTMLElement {
    this.container = document.createElement('div');
    this.container.id = 'authScreen';
    this.container.className = 'auth-screen';
    
    this.container.innerHTML = `
      <div class="auth-box">
        <div class="auth-logo">
          ${createSVGIcon('lockAuth', 64, 64)}
        </div>
        <h1>ЭГИДА</h1>
        <div class="auth-subtitle">Защищенный мессенджер</div>
        
        <div id="loginForm">
          <input type="text" id="loginUsername" placeholder="Логин" />
          <input type="password" id="loginPassword" placeholder="Пароль" />
          <button id="loginBtn">Войти</button>
          <div id="loginMessage"></div>
          <div class="auth-switch">
            Нет аккаунта? <a href="#" id="showRegisterLink">Зарегистрироваться</a>
          </div>
        </div>

        <div id="registerForm" style="display: none;">
          <input type="text" id="registerUsername" placeholder="Логин" />
          <input type="password" id="registerPassword" placeholder="Пароль" />
          <input type="password" id="registerPasswordConfirm" placeholder="Подтвердите пароль" />
          <button id="registerBtn">Зарегистрироваться</button>
          <div id="registerMessage"></div>
          <div class="auth-switch">
            Уже есть аккаунт? <a href="#" id="showLoginLink">Войти</a>
          </div>
        </div>
      </div>
    `;
    
    return this.container;
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
