/* LLM Apps form widget, generated: sha256=df85d530eb59add7f02bdb36e17ed97555bd753ef32d5f7f3b0afe9e3d4b6cd1 */
import { LLMApp } from './llmapps-sdk.js';
import registerFormTools from './form-webmcp.js';

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
    this.subscriptions = [];
    this.lifecycle = new AbortController();
    this.addEventListener('formViewInitialized', ({ detail, target }) => {
      if (!detail?.formModel || typeof detail.formModel.subscribe !== 'function') {
        this.showNavigationError('The source runtime supplied an invalid form model.');
        return;
      }
      const identity = this.getAttribute('form-id');
      if (identity && identity !== target.dataset?.id && identity !== detail.formModel.id) {
        target.closest('.form')?.setAttribute('hidden', '');
        return;
      }
      if (this.formModel === detail.formModel) return;
      if (this.formModel) {
        this.showNavigationError('Multiple source forms require an explicit form-id.');
        return;
      }
      this.clearSubscriptions();
      this.formModel = detail.formModel;
      this.formElement = target;
      this.unregisterFormTools = registerFormTools(detail.formModel);
      ['submitSuccess', ...this.completionEvents()].forEach((name) => {
        this.subscriptions.push(detail.formModel.subscribe(() => this.notifySubmission(), name));
      });
      ['submitFailure', 'submitError'].forEach((name) => {
        this.subscriptions.push(detail.formModel.subscribe(() => this.notifyFailure(), name));
      });
      this.resolveReady?.();
    }, { signal: this.lifecycle.signal });
    this.addEventListener('aem-form-navigate', (event) => {
      event.preventDefault();
      this.navigate(event.detail?.url);
    }, { signal: this.lifecycle.signal });
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

  completionEvents() {
    return [...new Set((this.getAttribute('completion-events') || '').split(',')
      .map((name) => name.trim()).filter((name) => /^[A-Za-z][\w:-]*$/.test(name)))];
  }

  clearSubscriptions() {
    this.subscriptions?.forEach((subscription) => subscription?.unsubscribe());
    this.subscriptions = [];
    this.unregisterFormTools?.();
    this.unregisterFormTools = null;
  }

  async notifyFailure() {
    if (Date.now() - (this.failureAt || 0) < 2000) return;
    this.failureAt = Date.now();
    try {
      const result = await this.bridge.sendMessage('The form submission failed. The form remains open for a retry.');
      if (result?.isError) throw new Error('Host refused the failure notification.');
    } catch (error) {
      this.showWarning(`Unable to report the form submission failure: ${error.message}`);
    }
  }

  showWarning(text) {
    const warning = document.createElement('p');
    warning.setAttribute('role', 'alert');
    warning.textContent = text;
    this.append(warning);
  }

  measure() {
    const height = Math.ceil(this.getBoundingClientRect().height);
    this.bridge?.reportSize?.(window.innerWidth, height);
  }

  disposeForm() {
    const form = this.formElement || this.querySelector('form');
    if (!form) return;
    let acknowledged = false;
    const event = new CustomEvent('aem-form-dispose', {
      cancelable: true, detail: { acknowledge: () => { acknowledged = true; } },
    });
    form.dispatchEvent(event);
    if (!acknowledged && !event.defaultPrevented) {
      throw new Error('The source form must publish its aem-form-dispose lifecycle hook.');
    }
    this.clearSubscriptions();
    this.formElement = null;
    this.formModel = null;
  }

  async notifySubmission() {
    if (this.submissionNotificationAttempted) return;
    this.submissionNotificationAttempted = true;
    const errors = [];
    const { chatgpt } = this.bridge;
    if (chatgpt) {
      try {
        chatgpt.setWidgetState({ ...chatgpt.widgetState, status: 'submitted' });
      } catch {
        errors.push('Unable to save the submitted widget state.');
      }
    }
    try {
      const followUp = window.openai?.sendFollowUpMessage;
      const result = typeof followUp === 'function'
        ? await window.openai.sendFollowUpMessage({ prompt: 'I have submitted the form successfully.' })
        : await this.bridge.sendMessage('I have submitted the form successfully.');
      if (result?.isError) throw new Error('Chat confirmation was refused');
    } catch {
      errors.push('Unable to deliver the form submission confirmation in chat.');
    }
    if (errors.length) {
      const warning = document.createElement('p');
      warning.setAttribute('role', 'alert');
      warning.textContent = errors.join(' ');
      this.append(warning);
    }
  }

  navigate(url) {
    const source = this.pageUrl || new URL(this.getAttribute('url'));
    let target = typeof url === 'string' && url && URL.canParse(url, source)
      ? new URL(url, source)
      : null;
    if (!target || target.protocol !== 'https:') {
      this.showNavigationError('Cannot continue: the form supplied an invalid navigation URL.');
      return;
    }
    if (target.origin === window.location.origin) {
      target = new URL(`${source.origin}${target.pathname}${target.search}${target.hash}`);
    }
    if (target.origin !== new URL(this.getAttribute('url')).origin) {
      this.showNavigationHandoff(target);
      return;
    }

    const key = new URL(target);
    key.hash = '';
    key.searchParams.sort();
    this.destinations ||= new Set();
    if (this.destinations.has(key.href) || this.navigationFailed) return;
    this.destinations.add(key.href);
    this.pageLoad = this.pageLoad.then(async () => {
      if (this.navigationFailed) return;
      if (typeof this.pageBootstrap?.loadPage !== 'function') {
        this.navigationFailed = true;
        this.showNavigationError('Cannot render the next page: the source site must publish its page reload lifecycle first.');
        return;
      }
      try {
        this.disposeForm();
      } catch (error) {
        this.navigationFailed = true;
        this.showNavigationError(`Cannot render the next page: ${error.message}`);
        return;
      }
      this.resources?.disconnect();
      this.headResources?.disconnect();
      this.pageHead?.forEach((node) => node.remove());
      this.dataset.status = 'loading';
      this.textContent = 'Loading next page...';
      await this.renderPage(target, true);
    }).catch(() => {
      // eslint-disable-next-line no-console
      console.error('[AEM Form Embed] Redirect page rendering failed; the callback was not retried.');
      this.navigationFailed = true;
      this.showNavigationError('Unable to render the next page. It has not been retried. Check the journey status before continuing.');
    });
  }

  showNavigationError(text) {
    this.resources?.disconnect();
    this.dataset.status = 'error';
    const message = document.createElement('p');
    message.setAttribute('role', 'alert');
    message.textContent = text;
    this.replaceChildren(message);
    document.body.classList.add('appear');
    this.measure();
  }

  showNavigationHandoff(target) {
    const panel = document.createElement('section');
    const message = document.createElement('p');
    message.setAttribute('role', 'status');
    panel.append(message);
    this.resources?.disconnect();
    this.replaceChildren(panel);
    this.dataset.status = 'navigation-pending';
    this.measure();

    message.textContent = 'Continue in your browser to proceed with the form.';
    const link = document.createElement('a');
    link.href = target.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.referrerPolicy = 'no-referrer';
    link.textContent = 'Continue in browser';
    const showOpenError = () => {
      link.removeAttribute('aria-disabled');
      message.setAttribute('role', 'alert');
      message.textContent = 'Unable to open the form site. Please try again.';
    };
    link.addEventListener('click', (click) => {
      click.preventDefault();
      if (link.getAttribute('aria-disabled') === 'true') return;
      link.setAttribute('aria-disabled', 'true');
      if (typeof this.bridge.openLink !== 'function') {
        showOpenError();
        return;
      }
      this.bridge.openLink(target.href).then((result) => {
        if (result?.isError) showOpenError();
      }, showOpenError);
    });
    panel.append(link);
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
    for (const method of ['connect', 'sendMessage', 'reportSize']) {
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

  async renderPage(source, reload = false) {
    const response = await fetch(source.href, {
      credentials: 'omit', redirect: 'error', signal: this.lifecycle?.signal,
    });
    if (!response.ok) throw new Error(`Unable to fetch form page: HTTP ${response.status}`);
    const page = new DOMParser().parseFromString(await response.text(), 'text/html');
    if (this.lifecycle?.signal.aborted) throw new Error('Source page loading was cancelled.');
    const hasForm = !!page.querySelector('main .form');
    if (!hasForm && !reload) throw new Error('The source page does not contain a form block');
    if (!page.querySelector('main')) throw new Error('The source page does not contain main content');

    // The existing iframe provides isolation; the site's scripts use its real document.
    this.pageUrl = source;
    history.replaceState(null, '', `${source.pathname}${source.search}${source.hash}`);
    document.documentElement.lang = page.documentElement.lang || 'en';
    document.title = page.title;
    page.querySelectorAll('base').forEach((node) => node.remove());
    absoluteResources(page, source);
    page.querySelectorAll('.form pre code').forEach((code) => {
      const definition = JSON.parse(code.textContent);
      absoluteImagePaths(definition, source);
      code.textContent = JSON.stringify(definition);
    });
    const scripts = [...page.querySelectorAll('script')];
    // Configure the source code origin before the bootstrap imports any modules.
    const bootstrap = scripts.find((script) => new URL(script.src || source.href).pathname.endsWith('/scripts/aem.js'));
    window.hlx = { ...(window.hlx || {}), codeBasePath: bootstrap
      ? new URL('../', bootstrap.src).href.replace(/\/$/, '') : source.origin };
    let readyTimeout;
    let cancelReady;
    const ready = hasForm ? new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      cancelReady = () => reject(new Error('Form readiness was cancelled.'));
      this.lifecycle?.signal.addEventListener('abort', cancelReady, { once: true });
      readyTimeout = setTimeout(() => reject(new Error(
        'The source form did not signal formViewInitialized; publish the lifecycle hooks and check form-id.',
      )), 30000);
    }) : Promise.resolve();
    // Attach rejection handling before a slow source script can finish loading.
    ready.catch(() => {});
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
    try {
      for (const script of scripts) {
        // Preserve source order; never add a second form renderer or page bootstrap.
        // eslint-disable-next-line no-await-in-loop
        await sourceScript(script, this.lifecycle?.signal);
        if (this.lifecycle?.signal.aborted) throw new Error('Source page loading was cancelled.');
        if (script.src.endsWith('/scripts/aem.js')) {
          window.hlx.codeBasePath = new URL('../', script.src).href.replace(/\/$/, '');
        }
        if (new URL(script.src || source.href).pathname.endsWith('/scripts/scripts.js')) {
          // ES modules stay cached; invoke the site's explicit lifecycle on subsequent pages.
          // eslint-disable-next-line no-await-in-loop
          this.pageBootstrap = await import(script.src);
          if (reload) {
            if (typeof this.pageBootstrap.loadPage !== 'function') {
              throw new Error('The source page does not support reloading');
            }
            // eslint-disable-next-line no-await-in-loop
            await this.pageBootstrap.loadPage();
          }
        }
      }
      if (typeof this.pageBootstrap?.loadPage !== 'function') {
        throw new Error('The source site must export loadPage() from scripts/scripts.js before embedding forms.');
      }
      await ready;
    } finally {
      clearTimeout(readyTimeout);
      if (cancelReady) this.lifecycle?.signal.removeEventListener('abort', cancelReady);
      this.resolveReady = null;
    }
    this.dataset.status = 'rendered';
    this.measure();
  }

  disconnectedCallback() {
    try {
      this.disposeForm();
    } catch (error) {
      console.error('[AEM Form Embed] Cleanup hook missing:', error.message);
    }
    this.clearSubscriptions();
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
    this.controller = new AbortController();
    this.pageLoad = this.load().catch((error) => {
      console.error('[AEM Form Embed] Widget page:', error);
      this.setAttribute('role', 'alert');
      this.textContent = `Unable to load native form widget: ${error.message}`;
    });
  }

  async load() {
    const url = new URL(this.getAttribute('url'));
    if (url.protocol !== 'https:' || url.username || url.password
      || url.origin !== new URL(import.meta.url).origin || url.search || url.hash) {
      throw new Error('The widget page must use the adapter HTTPS origin without credentials or query parameters.');
    }
    url.pathname += url.pathname.endsWith('/') ? 'index.plain.html' : '.plain.html';
    const response = await fetch(url.href, {
      credentials: 'omit', redirect: 'error', signal: this.controller?.signal,
    });
    if (!response.ok) throw new Error(`Widget page HTTP ${response.status}`);
    const page = new DOMParser().parseFromString(await response.text(), 'text/html');
    if (this.controller?.signal.aborted) return;
    const forms = page.querySelectorAll('aem-form-embed');
    if (forms.length !== 1) throw new Error('The widget page must contain exactly one aem-form-embed.');
    const element = document.createElement('aem-form-embed');
    ['url', 'form-id', 'completion-events'].forEach((name) => {
      if (forms[0].hasAttribute(name)) element.setAttribute(name, forms[0].getAttribute(name));
    });
    this.replaceWith(element);
  }

  disconnectedCallback() {
    this.controller?.abort();
  }
}

if (!customElements.get('aem-embed')) customElements.define('aem-embed', AEMFormPage);
