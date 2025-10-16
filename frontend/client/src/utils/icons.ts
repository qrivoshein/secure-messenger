export const SVG_ICONS = {
  lockAuth: `
    <rect x="5" y="11" width="14" height="11" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
  `,
  chat: `
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" stroke="currentColor" stroke-width="2" fill="none"/>
  `,
  user: `
    <circle cx="12" cy="8" r="5" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M3 21c0-4.4 3.6-8 8-1s8 3.6 8 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
  `,
  settings: `
    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.2 4.2l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.2-4.2l4.2-4.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  `,
  checkSingle: `
    <polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  checkDouble: `
    <polyline points="17 6 6 17 1 12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="23 6 12 17" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  plus: `
    <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
  `,
  arrowLeft: `
    <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  attach: `
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  mic: `
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
  `,
  send: `
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  close: `
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  search: `
    <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
  `,
  pin: `
    <path d="M16 3v4m0 0h-2.5A2.5 2.5 0 0 0 11 9.5V12l-3 3v2h8v-2l-3-3V9.5A2.5 2.5 0 0 0 10.5 7H16z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  reply: `
    <path d="M9 17l-5-5 5-5M4 12h11a4 4 0 0 1 0 8h-1" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  forward: `
    <path d="m15 17 5-5-5-5M20 12H9a4 4 0 0 0 0 8h1" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  edit: `
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  trash: `
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  moreVert: `
    <circle cx="12" cy="12" r="1" fill="currentColor"/>
    <circle cx="12" cy="5" r="1" fill="currentColor"/>
    <circle cx="12" cy="19" r="1" fill="currentColor"/>
  `,
  play: `
    <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
  `,
  pause: `
    <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
    <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
  `,
  image: `
    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
    <path d="m21 15-5-5L5 21" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  file: `
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M13 2v7h7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  download: `
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  lock: `
    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
  `,
  online: `
    <circle cx="12" cy="12" r="10" fill="currentColor"/>
  `
};

export function createSVGIcon(iconName: keyof typeof SVG_ICONS, width = 24, height = 24, className = ''): SVGElement {
  const iconContent = SVG_ICONS[iconName];
  if (!iconContent) {
    console.warn(`Icon "${iconName}" not found`);
    return document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  }
  
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  if (className) svg.setAttribute('class', className);
  svg.setAttribute('width', width.toString());
  svg.setAttribute('height', height.toString());
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.innerHTML = iconContent;
  
  return svg;
}

export function initSVGSprite(): void {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.display = 'none';
  
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  
  Object.entries(SVG_ICONS).forEach(([name, content]) => {
    const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
    symbol.id = `icon-${name}`;
    symbol.setAttribute('viewBox', '0 0 24 24');
    symbol.innerHTML = content;
    defs.appendChild(symbol);
  });
  
  svg.appendChild(defs);
  document.body.insertBefore(svg, document.body.firstChild);
}
