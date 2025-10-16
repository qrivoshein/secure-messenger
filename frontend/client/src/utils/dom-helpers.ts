// DOM Helper utilities for creating elements without innerHTML

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options?: {
    className?: string;
    id?: string;
    text?: string;
    attributes?: Record<string, string>;
    styles?: Partial<CSSStyleDeclaration>;
    events?: Record<string, EventListener>;
    children?: (HTMLElement | SVGElement | Text | null)[];
  }
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  if (options?.className) {
    element.className = options.className;
  }

  if (options?.id) {
    element.id = options.id;
  }

  if (options?.text) {
    element.textContent = options.text;
  }

  if (options?.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }

  if (options?.styles) {
    Object.assign(element.style, options.styles);
  }

  if (options?.events) {
    Object.entries(options.events).forEach(([event, handler]) => {
      element.addEventListener(event, handler);
    });
  }

  if (options?.children) {
    options.children.forEach(child => {
      if (child) element.appendChild(child);
    });
  }

  return element;
}

export function createSVGElement(
  tag: string,
  attributes?: Record<string, string>
): SVGElement {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);

  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }

  return element;
}

export function createText(content: string): Text {
  return document.createTextNode(content);
}

export function clearElement(element: HTMLElement): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

export function appendChildren(
  parent: HTMLElement,
  children: (HTMLElement | SVGElement | Text | null)[]
): void {
  children.forEach(child => {
    if (child) parent.appendChild(child);
  });
}
