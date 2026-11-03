/*
 * LLM Apps form widget: one block on one shared page for every form action. Nothing in
 * here is specific to a form: the action's handler downloads the form's definition (an AEM
 * form, or a converted Marketo form published as a DA page) and passes it in
 * `_meta.formDefinition` (widget-only, never sent to the model). This block writes it into
 * itself as <pre><code>, the markup AEM publishes a form in and this site's own form block
 * already loads, then runs that block's decorate (rules, validation, submit). Per-form
 * styles and functions come from the definition itself.
 *
 * Adapts the form block to the host's sandboxed iframe (via aem-embed):
 * - the rule-engine Worker URL resolves against the iframe's document, so the Worker is
 *   turned off and the form block runs its main-thread rule engine;
 * - styles live in a shadow root;
 * - a form that posts to the AEM Forms Submission Service names this site, not the sandbox,
 *   as the host the service reads the form's definition from.
 */
import decorateForm from '../form/form.js';
import { setSubmitBaseUrl } from '../form/constant.js';

// The block's CSS lives in the aem-embed shadow root, where `:root` matches nothing.
// Loading form.css into the document as well makes its `:root` custom properties
// inherit into the shadow tree.
function loadFormVariables() {
  const href = new URL('../form/form.css', import.meta.url).href;
  if (document.head.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.append(link);
}

// The form block resolves its assets (component and theme CSS, rule functions) from window.hlx.codeBasePath,
// which is empty inside the host's sandboxed iframe, so they would load from the sandbox origin. Point it at
// this site. Component CSS is also added with aem.js loadCSS as a `<link>` in document.head, which cannot
// style the aem-embed shadow root the form renders in, so mirror those links into the shadow root. The head
// copy stays: component CSS declares its `:root` variables there.
const SITE = new URL('../../', import.meta.url);
const FORM_STYLES = new URL('blocks/form/', SITE).href;

function useSiteCodeBase() {
  window.hlx = window.hlx || {};
  if (!window.hlx.codeBasePath) window.hlx.codeBasePath = SITE.href.replace(/\/$/, '');
}

function mirrorFormStyles(root) {
  const adopt = (link) => {
    if (link.rel !== 'stylesheet' || !link.href.startsWith(FORM_STYLES)) return;
    if ([...root.querySelectorAll('link[rel="stylesheet"]')].some((l) => l.href === link.href)) return;
    const copy = document.createElement('link');
    copy.rel = 'stylesheet';
    copy.href = link.href;
    root.append(copy);
  };
  document.head.querySelectorAll('link').forEach(adopt);
  new MutationObserver((records) => records.forEach((r) => r.addedNodes.forEach((n) => {
    if (n.tagName === 'LINK') adopt(n);
  }))).observe(document.head, { childList: true });
}

// A converted Marketo form's action is the AEM Forms Submission Service plus the base64 path of its definition
// on this site. The service reads that definition from https://<x-adobe-form-hostname><path> to find where to
// deliver the data. In the host's sandboxed iframe the document's hostname is the sandbox's, so send this
// site's (the widget and the form's definition are published on the same site).
const SUBMISSION_SERVICE = 'https://forms.adobe.com/adobe/forms/af/submit/';
const SUBMIT_PATH = '/adobe/forms/af/submit/';

// Set once the form is up, only when its block exposes no form model: a finished submit request is then the
// only sign that a submission ended.
let onSubmitResponse = null;

function watchSubmissions() {
  const send = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || String(input);
    if (!url.includes(SUBMIT_PATH)) return send(input, init);
    let options = init;
    if (url.startsWith(SUBMISSION_SERVICE)) {
      const headers = new Headers(init.headers);
      headers.set('x-adobe-form-hostname', SITE.hostname);
      options = { ...init, headers };
    }
    const request = send(input, options);
    request.then(
      (response) => onSubmitResponse?.({ ok: response.ok, status: response.status }),
      () => onSubmitResponse?.({ ok: false }),
    );
    return request;
  };
}

// The form, in the markup the form block loads: the definition in <pre><code>, as a quoted JSON string, the
// way AEM publishes a form to EDS. textContent keeps it text: nothing in it is parsed as markup.
function formMarkup(meta) {
  if (meta.formDefinition && typeof meta.formDefinition === 'object') {
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = JSON.stringify(JSON.stringify(meta.formDefinition));
    pre.append(code);
    return pre;
  }
  return null;
}

function message(block, text) {
  const p = document.createElement('p');
  p.className = 'form-widget-message';
  p.textContent = text;
  block.replaceChildren(p);
}

function plainText(html) {
  if (typeof html !== 'string' || !html) return '';
  return new DOMParser().parseFromString(html, 'text/html').body.textContent.trim().slice(0, 500);
}

// Posts a user turn so the assistant continues and the user sees what happened. In ChatGPT this is its native
// follow-up message (window.openai); elsewhere the MCP Apps ui/message.
function followUp(bridge, text) {
  const openai = window.openai;
  if (typeof openai?.sendFollowUpMessage === 'function') return openai.sendFollowUpMessage({ prompt: text });
  return bridge.sendMessage?.(text);
}

// Settles when the host has taken the request, or after `ms`, whichever comes first.
function settled(request, ms = 4000) {
  return Promise.race([
    Promise.resolve(request).catch(() => {}),
    new Promise((resolve) => { setTimeout(resolve, ms); }),
  ]);
}

// A successful submission hands control back to the host and removes the widget. A failed one keeps the form open
// with what the user typed, so the site's error shows and the user can retry; the model is only told it failed.
// Requests go out synchronously, so they reach the host even when a site handler navigates away; the widget
// closes only once the host has taken them, or a closed widget could drop the follow-up.
function handBack(block, bridge, formTitle) {
  const name = typeof formTitle === 'string' && formTitle ? ` "${formTitle}"` : '';
  let done = false;
  let failedAt = 0;
  return ({ ok, status, body }) => {
    if (done) return;
    if (!ok) {
      // One failed submit raises both submitFailure and submitError.
      if (Date.now() - failedAt < 2000) return;
      failedAt = Date.now();
      const reason = status ? ` (HTTP ${status})` : '';
      settled(bridge.updateModelContext?.(
        `The user's submission of the form${name} failed${reason}. The form is still open for a retry.`,
      ));
      return;
    }
    done = true;
    block.style.setProperty('display', 'none', 'important');
    const thanks = plainText(body?.thankYouMessage);
    const text = `I've submitted the${name} form successfully.${thanks ? ` The site replied: "${thanks}"` : ''}`;
    const context = settled(bridge.updateModelContext?.(`The user submitted the form${name} successfully.`));
    const message = settled(followUp(bridge, text));
    Promise.all([context, message]).then(() => {
      if (bridge.chatgpt?.requestClose) bridge.chatgpt.requestClose();
      else block.remove();
    });
  };
}

export default async function decorate(block, bridge) {
  block.textContent = '';
  if (!bridge?.isConnected || bridge.hostContext?.preview === true) {
    message(block, 'This form opens when the assistant calls the tool.');
    return;
  }

  const result = await bridge.toolResult;
  const markup = formMarkup(result?._meta || {});
  if (!markup) {
    message(block, 'The form is not available right now.');
    return;
  }

  window.Worker = undefined;
  watchSubmissions();
  // Submissions are followed through the form model's terminal events, not the block's markup, so the site's own
  // submit handling (thank-you message, custom success handler, redirect) cannot change the outcome. The form
  // block publishes its model as window.myForm once the rule engine starts, after its decorate returns; until then
  // (or if a block version never publishes it)
  // a finished submit request is the signal.
  const finish = handBack(block, bridge, result._meta.formTitle);
  onSubmitResponse = finish;
  let formModel;
  Object.defineProperty(window, 'myForm', {
    configurable: true,
    get: () => formModel,
    set(model) {
      formModel = model;
      if (typeof model?.subscribe !== 'function') return;
      onSubmitResponse = null;
      model.subscribe((e) => finish({ ok: true, body: e?.payload?.body }), 'submitSuccess');
      model.subscribe((e) => finish({ ok: false, status: e?.payload?.status }), 'submitFailure');
      model.subscribe((e) => finish({ ok: false, status: e?.payload?.status }), 'submitError');
    },
  });
  useSiteCodeBase();
  loadFormVariables();
  mirrorFormStyles(block.getRootNode());
  // form.css scopes every rule to `main .form`, the form block's own class.
  block.classList.add('form');
  block.replaceChildren(markup);
  // The form block prefixes a form's action with its publish URL (constant.js), which AEM forms need. A converted
  // form's action is already an absolute Submission Service URL, so only for it the prefix is cleared.
  if (result._meta.formConverted === true) setSubmitBaseUrl('');
  // Rely only on the form block's markup, not on what its decorate returns: block versions differ there.
  await decorateForm(block).catch(() => {});
  const form = block.querySelector('form');
  if (!form) {
    message(block, 'The form is not available right now.');
    return;
  }

  // A form's text can link out (a consent's privacy notice). A sandboxed widget may not open windows itself, so the
  // host opens the link: ChatGPT's openExternal, or MCP Apps ui/open-link elsewhere.
  block.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[href]');
    if (!link || !/^(https?:|mailto:)/i.test(link.href)) return;
    event.preventDefault();
    if (typeof window.openai?.openExternal === 'function') window.openai.openExternal({ href: link.href });
    else bridge.openLink?.(link.href);
  });

  bridge.autoResize?.(block);
}
