import { LLMApp } from './llmapps-sdk.js';

function resolvePageRequests(source) {
  const fetch = window.fetch.bind(window);
  window.fetch = async (input, options) => {
    const request = input instanceof Request ? input : null;
    return fetch(request || new URL(input, source()).href, options);
  };
  const open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function openPageRequest(method, url, ...args) {
    return open.call(this, method, new URL(url, source()).href, ...args);
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

function sourceScript(original) {
  const script = document.createElement('script');
  [...original.attributes].forEach(({ name, value }) => script.setAttribute(name, value));
  script.textContent = original.textContent;
  if (!script.src && script.type !== 'module') {
    original.replaceWith(script);
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', () => reject(new Error(`Unable to load source script: ${script.src}`)), { once: true });
    original.replaceWith(script);
  });
}

function waitForForm(element) {
  if (element.querySelector('form')) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const observer = new MutationObserver(() => {
      if (element.querySelector('form')) {
        observer.disconnect();
        clearTimeout(timeout);
        resolve();
      }
    });
    const timeout = setTimeout(() => {
      observer.disconnect();
      reject(new Error('The source page did not render a form within 30 seconds; inspect the browser console'));
    }, 30000);
    observer.observe(element, { childList: true, subtree: true });
  });
}

export class AEMFormEmbed extends HTMLElement {
  connectedCallback() {
    if (this.started) return;
    this.started = true;
    this.addEventListener('formViewInitialized', ({ detail }) => {
      this.submissionSubscription?.unsubscribe();
      this.submissionSubscription = detail.formModel.subscribe(
        () => this.notifySubmission(),
        'bookingComplete',
      );
    });
    this.addEventListener('aem-form-navigate', (event) => {
      if (event.target !== this) return;
      event.preventDefault();
      this.navigate(event.detail?.url);
    });
    this.dataset.status = 'loading';
    this.textContent = 'Loading form...';
    this.pageLoad = this.load().catch((error) => {
      console.error('[AEM Form Embed]', error);
      this.dataset.status = 'error';
      document.body.classList.add('appear');
      const message = document.createElement('p');
      message.setAttribute('role', 'alert');
      message.textContent = error.message;
      this.prepend(message);
    });
  }

  async notifySubmission() {
    if (this.submissionNotificationAttempted) return;
    this.submissionNotificationAttempted = true;
    try {
      if (!this.bridge.chatgpt?.supportsFollowUpMessage) {
        throw new Error('ChatGPT follow-up messages are not available');
      }
      const reply = await this.bridge.chatgpt.sendFollowUpMessage({
        prompt: `The HDFC form widget reported completion. Do not call tools or reopen the form.
Reply with only the following confirmation:

Your HDFC personal loan form has been submitted successfully.

**Submission does not mean loan approval.** Please retain any application reference number provided
and follow the bank's instructions for verification and next steps.`,
      });
      if (reply?.isError) throw new Error('Chat confirmation was refused');
    } catch {
      const warning = document.createElement('p');
      warning.setAttribute('role', 'alert');
      warning.textContent = 'Unable to deliver the form submission confirmation in chat.';
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
      const form = this.querySelector('form');
      if (form && form.dispatchEvent(new CustomEvent('aem-form-dispose', { cancelable: true }))) {
        this.navigationFailed = true;
        this.showNavigationError('Cannot render the next page: the source form must publish its reset hook first.');
        return;
      }
      this.submissionSubscription?.unsubscribe();
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
    this.bridge.reportSize(window.innerWidth, 800);
  }

  showNavigationHandoff(target) {
    const panel = document.createElement('section');
    const message = document.createElement('p');
    message.setAttribute('role', 'status');
    panel.append(message);
    this.resources?.disconnect();
    this.replaceChildren(panel);
    this.dataset.status = 'navigation-pending';
    this.bridge.reportSize(window.innerWidth, 800);

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
    if (source.protocol !== 'https:') throw new TypeError('The form page URL must use HTTPS');
    this.bridge = new LLMApp({
      appInfo: { name: 'AEMFormEmbed', version: '0.1.0' },
      appCapabilities: { availableDisplayModes: ['inline', 'fullscreen'] },
    });
    await this.bridge.connect();

    window.Worker = undefined;
    this.pageUrl = source;
    resolvePageRequests(() => this.pageUrl.href);
    await this.renderPage(source);
  }

  async renderPage(source, reload = false) {
    const response = await fetch(source.href, { credentials: 'omit', redirect: 'error' });
    if (!response.ok) throw new Error(`Unable to fetch form page: HTTP ${response.status}`);
    const page = new DOMParser().parseFromString(await response.text(), 'text/html');
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
      await sourceScript(script);
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
    if (hasForm) await waitForForm(this);
    this.dataset.status = 'rendered';
    this.bridge.reportSize(window.innerWidth, 800);
  }

  disconnectedCallback() {
    this.submissionSubscription?.unsubscribe();
    this.resources?.disconnect();
    this.headResources?.disconnect();
  }
}

customElements.define('aem-form-embed', AEMFormEmbed);
