(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function t(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(s){if(s.ep)return;s.ep=!0;const r=t(s);fetch(s.href,r)}})();class I{constructor(e=window.location.origin){this.token=null,this.baseUrl=e}setToken(e){this.token=e}async request(e,t={}){const n={"Content-Type":"application/json",...t.headers||{}};this.token&&(n.Authorization=`Bearer ${this.token}`);const s=await fetch(`${this.baseUrl}${e}`,{...t,headers:n}),r=await s.json();if(!s.ok)throw new Error(r.error||"Request failed");return r}async login(e,t){return this.request("/api/login",{method:"POST",body:JSON.stringify({username:e,password:t})})}async register(e,t){return this.request("/api/register",{method:"POST",body:JSON.stringify({username:e,password:t})})}async getUsers(){return this.request("/api/users")}async getMessages(e){return this.request(`/api/messages/${e}`)}async sendMessage(e,t){return this.request("/api/messages",{method:"POST",body:JSON.stringify({to:e,...t})})}async searchUsers(e){return this.request(`/api/users/search?q=${encodeURIComponent(e)}`)}async uploadFile(e,t){const n=new FormData;n.append("file",e),n.append("to",t);const s={};this.token&&(s.Authorization=`Bearer ${this.token}`);const r=await fetch(`${this.baseUrl}/api/upload`,{method:"POST",headers:s,body:n}),a=await r.json();if(!r.ok)throw new Error(a.error||"Upload failed");return a}}const p=new I;class L{constructor(){this.ws=null,this.token=null,this.handlers=new Map,this.reconnectAttempts=0,this.maxReconnectAttempts=5,this.reconnectDelay=3e3;const e=window.location.protocol==="https:"?"wss":"ws";this.wsUrl=`${e}://${window.location.host}`}connect(e){this.token=e,this.ws=new WebSocket(this.wsUrl),this.ws.onopen=()=>{console.log("WebSocket connected"),this.reconnectAttempts=0,this.emit("connection_status",{connected:!0}),this.send({type:"auth",token:this.token})},this.ws.onmessage=t=>{try{const n=JSON.parse(t.data);this.handleMessage(n)}catch(n){console.error("Error parsing WebSocket message:",n)}},this.ws.onerror=t=>{console.error("WebSocket error:",t),this.emit("connection_status",{connected:!1,error:t})},this.ws.onclose=()=>{console.log("WebSocket disconnected"),this.emit("connection_status",{connected:!1}),this.token&&this.reconnectAttempts<this.maxReconnectAttempts&&setTimeout(()=>{console.log("Reconnecting..."),this.reconnectAttempts++,this.connect(this.token)},this.reconnectDelay)}}disconnect(){this.ws&&(this.ws.close(),this.ws=null),this.token=null,this.reconnectAttempts=0}send(e){this.ws&&this.ws.readyState===WebSocket.OPEN?this.ws.send(JSON.stringify(e)):console.warn("WebSocket is not connected")}on(e,t){this.handlers.has(e)||this.handlers.set(e,[]),this.handlers.get(e).push(t)}off(e,t){const n=this.handlers.get(e);if(n){const s=n.indexOf(t);s>-1&&n.splice(s,1)}}handleMessage(e){const{type:t,...n}=e;this.emit(t,n)}emit(e,t){const n=this.handlers.get(e);n&&n.forEach(s=>s(t))}isConnected(){return this.ws!==null&&this.ws.readyState===WebSocket.OPEN}}const d=new L;class ${constructor(){this.key=null}isSecureContext(){return window.isSecureContext&&typeof crypto<"u"&&typeof crypto.subtle<"u"}async generateKey(){if(!this.isSecureContext())return console.warn("Encryption not available in insecure context (HTTP). Use HTTPS for encryption."),null;try{return this.key=await crypto.subtle.generateKey({name:"AES-GCM",length:256},!0,["encrypt","decrypt"]),this.key}catch(e){return console.error("Failed to generate encryption key:",e),null}}async encrypt(e,t){const n=t||this.key;if(!n||!this.isSecureContext())return null;try{const r=new TextEncoder().encode(e),a=crypto.getRandomValues(new Uint8Array(12)),m=await crypto.subtle.encrypt({name:"AES-GCM",iv:a},n,r);return{encrypted:Array.from(new Uint8Array(m)),iv:Array.from(a)}}catch(s){return console.error("Encryption failed:",s),null}}async decrypt(e,t,n){const s=n||this.key;if(!s||!this.isSecureContext())return"[Шифрование недоступно]";try{const r=await crypto.subtle.decrypt({name:"AES-GCM",iv:new Uint8Array(t)},s,new Uint8Array(e));return new TextDecoder().decode(r)}catch(r){return console.error("Decryption failed:",r),"[Ошибка расшифровки]"}}getKey(){return this.key}}const C=new $;class x{constructor(){this.currentUser=null,this.currentToken=null}async login(e,t){const n=await p.login(e,t);return this.currentUser={username:n.username,userId:n.userId},this.currentToken=n.token,localStorage.setItem("token",n.token),localStorage.setItem("username",n.username),localStorage.setItem("userId",n.userId),p.setToken(n.token),await C.generateKey(),d.connect(n.token),this.currentUser}async register(e,t){await p.register(e,t)}logout(){d.disconnect(),this.currentUser=null,this.currentToken=null,localStorage.removeItem("token"),localStorage.removeItem("username"),localStorage.removeItem("userId"),p.setToken(null)}getCurrentUser(){return this.currentUser}getCurrentToken(){return this.currentToken}isAuthenticated(){return this.currentUser!==null&&this.currentToken!==null}async tryRestoreSession(){const e=localStorage.getItem("token"),t=localStorage.getItem("username"),n=localStorage.getItem("userId");return e&&t&&n?(this.currentUser={username:t,userId:n},this.currentToken=e,p.setToken(e),await C.generateKey(),d.connect(e),this.currentUser):null}}const v=new x;class B{constructor(){this.mediaRecorder=null,this.audioChunks=[],this.stream=null,this.analyser=null,this.audioContext=null}async startRecording(){try{this.stream=await navigator.mediaDevices.getUserMedia({audio:!0}),this.audioContext=new(window.AudioContext||window.webkitAudioContext);const e=this.audioContext.createMediaStreamSource(this.stream);this.analyser=this.audioContext.createAnalyser(),this.analyser.fftSize=256,e.connect(this.analyser),this.mediaRecorder=new MediaRecorder(this.stream,{mimeType:"audio/webm;codecs=opus"}),this.audioChunks=[],this.mediaRecorder.ondataavailable=t=>{t.data.size>0&&this.audioChunks.push(t.data)},this.mediaRecorder.start()}catch(e){throw console.error("Failed to start recording:",e),new Error("Не удалось получить доступ к микрофону")}}stopRecording(){return new Promise((e,t)=>{if(!this.mediaRecorder){t(new Error("Recording not started"));return}this.mediaRecorder.onstop=()=>{const n=new Blob(this.audioChunks,{type:"audio/webm"});this.cleanup(),e(n)},this.mediaRecorder.stop()})}cancelRecording(){this.mediaRecorder&&this.mediaRecorder.state!=="inactive"&&this.mediaRecorder.stop(),this.cleanup()}cleanup(){this.stream&&(this.stream.getTracks().forEach(e=>e.stop()),this.stream=null),this.audioContext&&(this.audioContext.close(),this.audioContext=null),this.analyser=null,this.mediaRecorder=null,this.audioChunks=[]}getAnalyser(){return this.analyser}playNotificationSound(){try{const e=new(window.AudioContext||window.webkitAudioContext),t=e.createOscillator(),n=e.createGain();t.connect(n),n.connect(e.destination),t.frequency.value=800,t.type="sine",n.gain.setValueAtTime(.3,e.currentTime),n.gain.exponentialRampToValueAtTime(.01,e.currentTime+.3),t.start(e.currentTime),t.stop(e.currentTime+.3)}catch(e){console.error("Failed to play notification sound:",e)}}}const M=new B;function h(o){const e=document.createElement("div");return e.textContent=o,e.innerHTML}function T(o){const e=new Date(o),n=new Date().getTime()-e.getTime(),s=Math.floor(n/(1e3*60*60*24));return s===0?e.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}):s===1?"Вчера":s<7?e.toLocaleDateString("ru-RU",{weekday:"short"}):e.toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit"})}function y(o){const e=[["#667eea","#764ba2"],["#f093fb","#f5576c"],["#4facfe","#00f2fe"],["#43e97b","#38f9d7"],["#fa709a","#fee140"],["#30cfd0","#330867"],["#a8edea","#fed6e3"],["#ff9a9e","#fecfef"],["#ffecd2","#fcb69f"],["#ff6e7f","#bfe9ff"]];let t=0;for(let s=0;s<o.length;s++)t=o.charCodeAt(s)+((t<<5)-t);const n=Math.abs(t)%e.length;return e[n]}async function S(){"Notification"in window&&Notification.permission==="default"&&await Notification.requestPermission()}function A(o,e,t){"Notification"in window&&Notification.permission==="granted"&&new Notification(o,{body:e,icon:"/favicon.ico",tag:t,requireInteraction:!1})}class U{showAuthScreen(){var e,t,n,s;(e=document.getElementById("authScreen"))==null||e.style.setProperty("display","flex"),(t=document.getElementById("messengerContainer"))==null||t.classList.remove("active"),(n=document.getElementById("profileScreen"))==null||n.classList.remove("active"),(s=document.getElementById("settingsScreen"))==null||s.classList.remove("active")}showMessengerScreen(){var e,t,n,s;(e=document.getElementById("authScreen"))==null||e.style.setProperty("display","none"),(t=document.getElementById("messengerContainer"))==null||t.classList.add("active"),(n=document.getElementById("profileScreen"))==null||n.classList.remove("active"),(s=document.getElementById("settingsScreen"))==null||s.classList.remove("active")}showLoginForm(){const e=document.getElementById("loginForm"),t=document.getElementById("registerForm");e&&(e.style.display="block"),t&&(t.style.display="none"),this.clearMessages()}showRegisterForm(){const e=document.getElementById("loginForm"),t=document.getElementById("registerForm");e&&(e.style.display="none"),t&&(t.style.display="block"),this.clearMessages()}clearMessages(){const e=document.getElementById("loginMessage"),t=document.getElementById("registerMessage");e&&(e.innerHTML=""),t&&(t.innerHTML="")}showError(e,t){const n=document.getElementById(e);n&&(n.innerHTML=`<div class="error-message">${h(t)}</div>`)}showSuccess(e,t){const n=document.getElementById(e);n&&(n.innerHTML=`<div class="success-message">${h(t)}</div>`)}updateUserInfo(e){const t=document.getElementById("userName"),n=document.getElementById("userAvatar");if(t&&(t.innerHTML=`${h(e.username)}<span class="user-id">#${e.userId}</span>`),n){n.textContent=e.username[0].toUpperCase();const[s,r]=y(e.username);n.style.background=`linear-gradient(135deg, ${s} 0%, ${r} 100%)`}}updateConnectionStatus(e,t){const n=document.getElementById("connectionStatus"),s=document.getElementById("connectionText");n&&s&&(n.className=e?"connection-status connected":"connection-status disconnected",s.textContent=t||(e?"Подключено":"Отключено"))}renderChatsList(e){const t=document.getElementById("chatsList");if(!t)return;if(e.length===0){t.innerHTML=`
                <div class="empty-state" style="padding: 40px 20px;">
                    <p style="text-align: center; color: #718096;">Нет чатов. Начните новый диалог!</p>
                </div>
            `;return}const n=e.map(s=>{const[r,a]=y(s.username),m=s.unreadCount?`<span class="unread-badge">${s.unreadCount}</span>`:"",c=s.online?'<div class="online-badge"></div>':"";return`
                <div class="chat-item" data-username="${h(s.username)}" onclick="window.app.openChat('${h(s.username)}')">
                    <div class="chat-avatar" style="background: linear-gradient(135deg, ${r} 0%, ${a} 100%);">
                        ${s.username[0].toUpperCase()}
                        ${c}
                    </div>
                    <div class="chat-info">
                        <div class="chat-header">
                            <div class="chat-name">
                                ${h(s.username)}
                                <span class="user-id">#${s.userId}</span>
                            </div>
                            <div class="chat-time">${s.time||""}</div>
                        </div>
                        <div class="chat-preview">${s.lastMessage||"Начните общение"}</div>
                    </div>
                    ${m}
                </div>
            `}).join("");t.innerHTML=n}renderMessage(e,t){const n=t?"Вы":e.from,[s,r]=y(n),a=T(e.time||e.timestamp),m=t?"sent":"";let c="";e.replyTo&&(c=`
                <div class="message-reply-quote" onclick="window.app.scrollToMessage('${e.replyTo.id}')">
                    <div class="message-reply-content">
                        <div class="message-reply-sender">${h(e.replyTo.from)}</div>
                        <div class="message-reply-text">${h(e.replyTo.text)}</div>
                    </div>
                </div>
            `);let l="";if(e.mediaType)l=this.renderMediaMessage(e);else{const g=e.edited?'<span class="message-edited">(изменено)</span>':"";l=`${h(e.text)} ${g}`}return`
            <div class="message ${m}" data-message-id="${e.id}">
                <div class="message-avatar" style="background: linear-gradient(135deg, ${s} 0%, ${r} 100%);">
                    ${n[0].toUpperCase()}
                </div>
                <div class="message-content">
                    ${c}
                    <div class="message-bubble">
                        ${l}
                    </div>
                    <div class="message-time">
                        ${a}
                        ${t?this.renderReadStatus(e.read):""}
                    </div>
                </div>
            </div>
        `}renderMediaMessage(e){switch(e.mediaType){case"image":return`<div class="media-message"><img src="${e.mediaUrl}" alt="Image" onclick="window.app.openImage('${e.mediaUrl}')"></div>`;case"video":return`<div class="media-message"><video src="${e.mediaUrl}" controls></video></div>`;case"voice":return`<div class="voice-message">🎤 Голосовое сообщение ${e.duration||"0:00"}</div>`;case"file":return`<div class="file-message" onclick="window.open('${e.mediaUrl}')">📎 ${e.fileName} (${e.fileSize})</div>`;default:return h(e.text)}}renderReadStatus(e){return e?'<span class="message-read-status"><svg width="14" height="14" class="read"><use href="#icon-check-double"></use></svg></span>':'<span class="message-read-status"><svg width="14" height="14"><use href="#icon-check-single"></use></svg></span>'}appendMessage(e){const t=document.getElementById("messagesArea");if(t){const n=document.createElement("div");n.innerHTML=e;const s=n.firstElementChild;s&&(t.appendChild(s),t.scrollTop=t.scrollHeight)}}clearChatArea(){const e=document.getElementById("chatArea");e&&(e.innerHTML=`
                <div class="empty-state">
                    <div class="empty-state-icon"><svg class="icon-svg" width="80" height="80" style="color: #718096;"><use href="#icon-chat"></use></svg></div>
                    <h3>Выберите чат</h3>
                    <p>Выберите пользователя из списка слева, чтобы начать общение</p>
                </div>
            `)}setButtonLoading(e,t,n){const s=document.getElementById(e);s&&(s.disabled=t,t&&n&&(s.textContent=n))}}const i=new U,b={lockAuth:`
    <rect x="5" y="11" width="14" height="11" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
  `,chat:`
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" stroke="currentColor" stroke-width="2" fill="none"/>
  `,user:`
    <circle cx="12" cy="8" r="5" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M3 21c0-4.4 3.6-8 8-1s8 3.6 8 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
  `,settings:`
    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.2 4.2l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.2-4.2l4.2-4.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  `,checkSingle:`
    <polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,checkDouble:`
    <polyline points="17 6 6 17 1 12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="23 6 12 17" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,plus:`
    <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
  `,arrowLeft:`
    <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,attach:`
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,mic:`
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
  `,send:`
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,close:`
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,search:`
    <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
  `,pin:`
    <path d="M16 3v4m0 0h-2.5A2.5 2.5 0 0 0 11 9.5V12l-3 3v2h8v-2l-3-3V9.5A2.5 2.5 0 0 0 10.5 7H16z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,reply:`
    <path d="M9 17l-5-5 5-5M4 12h11a4 4 0 0 1 0 8h-1" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,forward:`
    <path d="m15 17 5-5-5-5M20 12H9a4 4 0 0 0 0 8h1" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,edit:`
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,trash:`
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,moreVert:`
    <circle cx="12" cy="12" r="1" fill="currentColor"/>
    <circle cx="12" cy="5" r="1" fill="currentColor"/>
    <circle cx="12" cy="19" r="1" fill="currentColor"/>
  `,play:`
    <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
  `,pause:`
    <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
    <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
  `,image:`
    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
    <path d="m21 15-5-5L5 21" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,file:`
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M13 2v7h7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,download:`
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,lock:`
    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
  `,online:`
    <circle cx="12" cy="12" r="10" fill="currentColor"/>
  `};function u(o,e=24,t=24,n=""){const s=b[o];return s?`<svg class="${n}" width="${e}" height="${t}" viewBox="0 0 24 24">${s}</svg>`:(console.warn(`Icon "${o}" not found`),"")}function R(){const o=document.createElementNS("http://www.w3.org/2000/svg","svg");o.style.display="none";const e=document.createElementNS("http://www.w3.org/2000/svg","defs");Object.entries(b).forEach(([t,n])=>{const s=document.createElementNS("http://www.w3.org/2000/svg","symbol");s.id=`icon-${t}`,s.setAttribute("viewBox","0 0 24 24"),s.innerHTML=n,e.appendChild(s)}),o.appendChild(e),document.body.insertBefore(o,document.body.firstChild)}class N{constructor(){this.container=null}create(){return this.container=document.createElement("div"),this.container.id="authScreen",this.container.className="auth-screen",this.container.innerHTML=`
      <div class="auth-box">
        <div class="auth-logo">
          ${u("lockAuth",64,64)}
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
    `,this.container}show(){this.container&&(this.container.style.display="flex")}hide(){this.container&&(this.container.style.display="none")}}class H{constructor(){this.container=null}create(){return this.container=document.createElement("div"),this.container.id="messengerContainer",this.container.className="messenger-container",this.container.innerHTML=`
      <div class="sidebar">
        <div class="sidebar-header">
          <h2>Чаты</h2>
          <button class="new-chat-btn" id="newChatBtn">
            ${u("plus",18,18)}
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
              ${u("online",12,12,"icon-svg")}
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
            ${u("chat",80,80,"icon-svg")}
          </div>
          <h3>Выберите чат</h3>
          <p>Выберите пользователя из списка слева, чтобы начать общение</p>
        </div>
      </div>
    `,this.container}show(){this.container&&this.container.classList.add("active")}hide(){this.container&&this.container.classList.remove("active")}}class F{constructor(){this.container=null}create(){return this.container=document.createElement("div"),this.container.id="profileScreen",this.container.className="profile-screen",this.container.innerHTML=`
      <div class="profile-header">
        <div class="profile-avatar-large" id="profileAvatar">A</div>
        <div class="profile-username" id="profileUsername">Пользователь</div>
        <div class="profile-status">
          ${u("online",14,14,"icon-svg")}
          В сети
        </div>
      </div>
      <div class="bottom-navigation">
        <div class="bottom-nav-items">
          <div class="bottom-nav-item" data-screen="messenger">
            ${u("chat",24,24)}
            <span>Чаты</span>
          </div>
          <div class="bottom-nav-item active" data-screen="profile">
            ${u("user",24,24)}
            <span>Профиль</span>
          </div>
          <div class="bottom-nav-item" data-screen="settings">
            ${u("settings",24,24)}
            <span>Настройки</span>
          </div>
        </div>
      </div>
    `,this.container}show(){this.container&&this.container.classList.add("active")}hide(){this.container&&this.container.classList.remove("active")}}class P{constructor(){this.container=null}create(){return this.container=document.createElement("div"),this.container.id="settingsScreen",this.container.className="settings-screen",this.container.innerHTML=`
      <div class="settings-header">
        <h2>Настройки</h2>
      </div>
      <div class="bottom-navigation">
        <div class="bottom-nav-items">
          <div class="bottom-nav-item" data-screen="messenger">
            ${u("chat",24,24)}
            <span>Чаты</span>
          </div>
          <div class="bottom-nav-item" data-screen="profile">
            ${u("user",24,24)}
            <span>Профиль</span>
          </div>
          <div class="bottom-nav-item active" data-screen="settings">
            ${u("settings",24,24)}
            <span>Настройки</span>
          </div>
        </div>
      </div>
    `,this.container}show(){this.container&&this.container.classList.add("active")}hide(){this.container&&this.container.classList.remove("active")}}class O{constructor(){this.currentChat=null,this.users=[],this.chats=[],this.unreadMessages=new Map,this.onlineUsers=new Set}async init(){console.log("Initializing Messenger App..."),R(),this.initializeComponents(),this.setupEventListeners(),this.setupWebSocketHandlers();const e=await v.tryRestoreSession();e?(i.updateUserInfo(e),i.showMessengerScreen(),await this.loadUsers(),await S()):(i.showAuthScreen(),i.showLoginForm()),window.app=this}initializeComponents(){const e=document.getElementById("app");if(!e){console.error("App container not found!");return}const t=new N,n=new H,s=new F,r=new P;e.appendChild(t.create()),e.appendChild(n.create()),e.appendChild(s.create()),e.appendChild(r.create())}setupEventListeners(){var e,t,n,s,r,a,m;(e=document.getElementById("showRegisterLink"))==null||e.addEventListener("click",c=>{c.preventDefault(),i.showRegisterForm()}),(t=document.getElementById("showLoginLink"))==null||t.addEventListener("click",c=>{c.preventDefault(),i.showLoginForm()}),(n=document.getElementById("loginBtn"))==null||n.addEventListener("click",()=>{var g,f;const c=((g=document.getElementById("loginUsername"))==null?void 0:g.value)||"",l=((f=document.getElementById("loginPassword"))==null?void 0:f.value)||"";this.login(c,l)}),(s=document.getElementById("registerBtn"))==null||s.addEventListener("click",()=>{var f,w,k;const c=((f=document.getElementById("registerUsername"))==null?void 0:f.value)||"",l=((w=document.getElementById("registerPassword"))==null?void 0:w.value)||"",g=((k=document.getElementById("registerPasswordConfirm"))==null?void 0:k.value)||"";this.register(c,l,g)}),(r=document.getElementById("logoutBtn"))==null||r.addEventListener("click",()=>{this.logout()}),(a=document.getElementById("loginPassword"))==null||a.addEventListener("keypress",c=>{var l;c.key==="Enter"&&((l=document.getElementById("loginBtn"))==null||l.click())}),(m=document.getElementById("registerPasswordConfirm"))==null||m.addEventListener("keypress",c=>{var l;c.key==="Enter"&&((l=document.getElementById("registerBtn"))==null||l.click())})}setupWebSocketHandlers(){d.on("connection_status",({connected:e,error:t})=>{t?i.updateConnectionStatus(!1,"Ошибка подключения"):i.updateConnectionStatus(e,e?"Подключено":"Подключение...")}),d.on("auth_success",()=>{console.log("WebSocket authenticated")}),d.on("auth_error",e=>{console.error("WebSocket auth failed:",e.error),this.logout()}),d.on("message",({message:e})=>{this.handleIncomingMessage(e)}),d.on("online_users",({users:e})=>{this.onlineUsers=new Set(e),this.updateOnlineStatuses()}),d.on("typing",({from:e,isTyping:t})=>{this.handleTypingIndicator(e,t)}),d.on("messages_read",({messageIds:e,by:t})=>{this.handleMessagesRead(e,t)}),d.on("ping",()=>{d.send({type:"pong"})})}async login(e,t){try{i.setButtonLoading("loginBtn",!0,"Вход...");const n=await v.login(e,t);i.updateUserInfo(n),i.showMessengerScreen(),await this.loadUsers(),await S()}catch(n){i.showError("loginMessage",n.message||"Ошибка авторизации")}finally{i.setButtonLoading("loginBtn",!1)}}async register(e,t,n){try{if(!e||!t){i.showError("registerMessage","Пожалуйста, заполните все поля");return}if(e.length<3){i.showError("registerMessage","Логин должен содержать минимум 3 символа");return}if(t.length<6){i.showError("registerMessage","Пароль должен содержать минимум 6 символов");return}if(t!==n){i.showError("registerMessage","Пароли не совпадают");return}i.setButtonLoading("registerBtn",!0,"Регистрация..."),await v.register(e,t),i.showSuccess("registerMessage","Регистрация успешна! Войдите в систему"),setTimeout(()=>{i.showLoginForm()},1500)}catch(s){i.showError("registerMessage",s.message||"Ошибка регистрации")}finally{i.setButtonLoading("registerBtn",!1)}}logout(){v.logout(),this.currentChat=null,this.users=[],this.chats=[],this.unreadMessages.clear(),this.onlineUsers.clear(),i.showAuthScreen(),i.showLoginForm()}async loadUsers(){try{const e=await p.getUsers();this.users=e.users,this.updateChatsList()}catch(e){console.error("Failed to load users:",e)}}updateChatsList(){this.chats=this.users.map(e=>({username:e.username,userId:e.userId,online:this.onlineUsers.has(e.username),unreadCount:this.unreadMessages.get(e.username)||0})),i.renderChatsList(this.chats)}async openChat(e){const t=this.users.find(n=>n.username===e);if(t){this.currentChat={username:t.username,userId:t.userId,online:this.onlineUsers.has(t.username)},this.unreadMessages.delete(e),this.updateChatsList();try{const n=await p.getMessages(e);console.log("Loaded messages:",n.messages)}catch(n){console.error("Failed to load messages:",n)}}}async sendMessage(e){if(!(!this.currentChat||!e.trim()))try{await p.sendMessage(this.currentChat.username,{text:e.trim()})}catch(t){console.error("Failed to send message:",t)}}handleIncomingMessage(e){const t=e.from;if(this.currentChat&&this.currentChat.username===t){const s=i.renderMessage(e,!1);i.appendMessage(s),d.send({type:"mark_read",from:t}),M.playNotificationSound()}else{const s=this.unreadMessages.get(t)||0;this.unreadMessages.set(t,s+1),M.playNotificationSound(),A(`Новое сообщение от ${t}`,e.text||"[Медиа]",t),this.updateChatsList()}}updateOnlineStatuses(){this.updateChatsList()}handleTypingIndicator(e,t){this.currentChat&&this.currentChat.username===e&&console.log(`${e} is ${t?"typing":"not typing"}`)}handleMessagesRead(e,t){this.currentChat&&this.currentChat.username===t&&e.forEach(n=>{const s=document.querySelector(`[data-message-id="${n}"]`);if(s){const r=s.querySelector(".message-read-status svg");if(r){r.classList.add("read");const a=r.querySelector("use");a&&a.setAttribute("href","#icon-check-double")}}})}openImage(e){const t=document.getElementById("imageModal"),n=document.getElementById("imageModalImg");t&&n&&(n.src=e,t.classList.add("active"))}scrollToMessage(e){const t=document.querySelector(`[data-message-id="${e}"]`);t&&t.scrollIntoView({behavior:"smooth",block:"center"})}}const E=new O;document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>E.init()):E.init();
//# sourceMappingURL=index-BmWWietQ.js.map
