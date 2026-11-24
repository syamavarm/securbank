/* LLM Apps form widget, generated: sha256=856e701c106f2f46b792e3b548641c85c3babe54b0b1eebdf166c1095695010e */
import { LLMApp } from './llmapps-sdk.js';

function resolvePageRequests(source) {
  const fetch = window.fetch;
  window.fetch = async (input, options) => {
    const request = input instanceof Request ? input : null;
    return fetch.call(window, request || new URL(input, source()).href, options);
  };
  const open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function openPageRequest(method, url, ...args) {
    return open.call(this, method, new URL(url, source()).href, ...args);
  };
  return () => {
    window.fetch = fetch;
    XMLHttpRequest.prototype.open = open;
  };
}

function absoluteResources(container, source) {
  const sourceOrigin = new URL(source).origin;
  const resolveResource = (value, rebase = true) => {
    const url = new URL(value, source);
    return rebase && ['http:', 'https:'].includes(url.protocol) && url.origin === window.location.origin
      ? `${sourceOrigin}${url.pathname}${url.search}${url.hash}`
      : url.href;
  };
  const selector = '[src], [href], [srcset]';
  const nodes = [...container.querySelectorAll(selector)];
  if (container.matches?.(selector)) nodes.unshift(container);
  nodes.forEach((node) => {
    ['src', 'href'].forEach((attribute) => {
      const value = node.getAttribute(attribute);
      if (value !== null && !value.startsWith('#')) {
        const resource = attribute === 'src' || ['link', 'image', 'use'].includes(node.localName);
        const absolute = resolveResource(value, resource);
        if (value !== absolute) node.setAttribute(attribute, absolute);
      }
    });
    const srcset = node.getAttribute('srcset');
    if (srcset && !srcset.includes('data:')) {
      const absolute = srcset.split(',').map((candidate) => {
        const [url, ...descriptor] = candidate.trim().split(/\s+/);
        return [resolveResource(url), ...descriptor].join(' ');
      }).join(', ');
      if (srcset !== absolute) node.setAttribute('srcset', absolute);
    }
  });
}

function absoluteImagePaths(field, source) {
  if (!field || typeof field !== 'object') return;
  if (field.fieldType === 'image') {
    if (typeof field.value === 'string' && field.value.startsWith('/')) {
      field.value = new URL(field.value, source).href;
    }
    const repoPath = field.properties?.['fd:repoPath'];
    if (typeof repoPath === 'string' && repoPath.startsWith('/')) {
      field.properties['fd:repoPath'] = new URL(repoPath, source).href;
    }
  }
  Object.values(field).forEach((value) => {
    if (value && typeof value === 'object') absoluteImagePaths(value, source);
  });
}

function sourceScript(original, signal) {
  const script = document.createElement('script');
  [...original.attributes].forEach(({ name, value }) => script.setAttribute(name, value));
  script.textContent = original.textContent;
  if (!script.src && script.type !== 'module') {
    original.replaceWith(script);
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const finish = (error) => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', aborted);
      if (error) reject(error);
      else resolve();
    };
    const aborted = () => {
      script.remove();
      finish(new Error('Source script loading was cancelled.'));
    };
    const timeout = setTimeout(() => {
      script.remove();
      finish(new Error(`Source script timed out: ${script.src}`));
    }, 30000);
    script.addEventListener('load', () => finish(), { once: true });
    script.addEventListener('error', () => finish(new Error(`Unable to load source script: ${script.src}`)), { once: true });
    signal?.addEventListener('abort', aborted, { once: true });
    original.replaceWith(script);
  });
}

export class AEMFormEmbed extends HTMLElement {
  connectedCallback() {
    if (this.started) return;
    this.started = true;
    this.lifecycle = new AbortController();
    this.dataset.status = 'loading';
    this.textContent = 'Loading form...';
    this.pageLoad = this.load().catch((error) => {
      if (this.lifecycle.signal.aborted) return;
      console.error('[AEM Form Embed]', error);
      this.dataset.status = 'error';
      document.body.classList.add('appear');
      const message = document.createElement('p');
      message.setAttribute('role', 'alert');
      message.textContent = error.message;
      this.prepend(message);
    });
  }

  measure() {
    const height = Math.ceil(this.getBoundingClientRect().height);
    this.bridge?.reportSize?.(window.innerWidth, height);
  }

  async load() {
    if (document.querySelectorAll('aem-form-embed').length !== 1) {
      throw new Error('A form page requires its own sandbox document');
    }
    const source = new URL(this.getAttribute('url'));
    if (source.protocol !== 'https:' || source.username || source.password) {
      throw new TypeError('The form page URL must use HTTPS without credentials');
    }
    this.bridge = new LLMApp({
      appInfo: { name: 'AEMFormEmbed', version: '0.1.0' },
      appCapabilities: { availableDisplayModes: ['inline'] },
    });
    for (const method of ['connect', 'reportSize']) {
      if (typeof this.bridge[method] !== 'function') {
        throw new Error(`The site's llmapps-sdk.js lacks ${method}(); update the SDK before embedding forms.`);
      }
    }
    await this.bridge.connect();
    if (this.lifecycle?.signal.aborted) {
      this.bridge.destroy?.();
      throw new Error('Form embedding was cancelled.');
    }

    this.originalWorker = window.Worker;
    this.originalHlx = window.hlx;
    this.originalLocation = window.location.href;
    window.Worker = undefined;
    this.pageUrl = source;
    this.restoreRequests = resolvePageRequests(() => this.pageUrl.href);
    this.sizeObserver = new ResizeObserver(() => this.measure());
    this.sizeObserver.observe(this);
    await this.renderPage(source);
  }

  async renderPage(source) {
    const response = await fetch(source.href, {
      credentials: 'omit', redirect: 'error', signal: this.lifecycle?.signal,
    });
    if (!response.ok) throw new Error(`Unable to fetch form page: HTTP ${response.status}`);
    const page = new DOMParser().parseFromString(await response.text(), 'text/html');
    if (this.lifecycle?.signal.aborted) throw new Error('Source page loading was cancelled.');
    if (!page.querySelector('main .form')) throw new Error('The source page does not contain a form block');
    if (!page.querySelector('main')) throw new Error('The source page does not contain main content');

    // The existing iframe provides isolation; the site's scripts use its real document.
    this.pageUrl = source;
    history.replaceState(null, '', `${source.pathname}${source.search}${source.hash}`);
    document.documentElement.lang = page.documentElement.lang || 'en';
    document.title = page.title;
    page.querySelectorAll('base').forEach((node) => node.remove());
    absoluteResources(page, source);
    const identity = this.getAttribute('form-id');
    const selected = new Set();
    page.querySelectorAll('main .form pre code').forEach((code) => {
      const definition = JSON.parse(code.textContent);
      if (identity && definition.id === identity) selected.add(code.closest('.form'));
      absoluteImagePaths(definition, source);
      code.textContent = JSON.stringify(definition);
    });
    const forms = [...page.querySelectorAll('main .form')];
    if (forms.length > 1) {
      if (selected.size !== 1) {
        throw new Error('Cannot select the source form: form-id must identify one inline form definition.');
      }
      forms.filter((form) => !selected.has(form)).forEach((form) => form.remove());
    }
    const scripts = [...page.querySelectorAll('script')];
    // Configure the source code origin before the bootstrap imports any modules.
    const bootstrap = scripts.find((script) => new URL(script.src || source.href).pathname.endsWith('/scripts/aem.js'));
    window.hlx = { ...(window.hlx || {}), codeBasePath: bootstrap
      ? new URL('../', bootstrap.src).href.replace(/\/$/, '') : source.origin };
    this.pageHead = new Set(page.head.childNodes);
    this.headResources = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => this.pageHead.add(node));
      });
    });
    this.headResources.observe(document.head, { childList: true });
    document.head.append(...page.head.childNodes);
    [...page.body.attributes].forEach(({ name, value }) => document.body.setAttribute(name, value));
    this.replaceChildren(...page.body.childNodes);
    this.style.display = 'block';
    this.resources = new MutationObserver(() => absoluteResources(this, source));
    this.resources.observe(this, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset', 'href'],
    });
    for (const script of scripts) {
      // Preserve source order; never add a second form renderer or page bootstrap.
      // eslint-disable-next-line no-await-in-loop
      await sourceScript(script, this.lifecycle?.signal);
      if (this.lifecycle?.signal.aborted) throw new Error('Source page loading was cancelled.');
      if (script.src.endsWith('/scripts/aem.js')) {
        window.hlx.codeBasePath = new URL('../', script.src).href.replace(/\/$/, '');
      }
    }
    this.dataset.status = 'rendered';
    this.measure();
  }

  disconnectedCallback() {
    this.lifecycle?.abort();
    this.sizeObserver?.disconnect();
    this.resources?.disconnect();
    this.headResources?.disconnect();
    this.pageHead?.forEach((node) => node.remove());
    this.restoreRequests?.();
    if (this.originalLocation) {
      window.Worker = this.originalWorker;
      window.hlx = this.originalHlx;
      history.replaceState(null, '', this.originalLocation);
    }
    this.bridge?.destroy?.();
  }
}

if (!customElements.get('aem-form-embed')) customElements.define('aem-form-embed', AEMFormEmbed);

// MCP runtime widgets use this established outer element, regardless of renderer.
export class AEMFormPage extends HTMLElement {
  connectedCallback() {
    if (this.started) return;
    this.started = true;
    this.pageLoad = this.load().catch((error) => {
      console.error('[AEM Form Embed] Widget page:', error);
      this.setAttribute('role', 'alert');
      this.textContent = `Unable to load native form widget: ${error.message}`;
    });
  }

  async load() {
    const invalidUrl = 'The form page must use an absolute HTTPS URL without credentials.';
    let url;
    try {
      url = new URL(this.getAttribute('url') || '');
    } catch {
      throw new Error(invalidUrl);
    }
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error(invalidUrl);
    const fragment = new URLSearchParams(url.hash.slice(1));
    const formId = fragment.get('form-id');
    if (formId !== null) url.hash = '';
    const element = document.createElement('aem-form-embed');
    element.setAttribute('url', url.href);
    if (formId !== null) element.setAttribute('form-id', formId);
    this.replaceWith(element);
  }
}

if (!customElements.get('aem-embed')) customElements.define('aem-embed', AEMFormPage);
