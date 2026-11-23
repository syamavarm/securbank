/* eslint-env node */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const SOURCE = 'https://forms.example.test/content/loan';
const SANDBOX = 'https://mcp-endpoint-test.web-sandbox.oaiusercontent.com';
const source = readFileSync(resolve(__dirname, '../scripts/aem-form-embed.js'), 'utf8')
  .replace(/^import \{ LLMApp \} from '\.\/llmapps-sdk\.js';\n/, '')
  .replace(/^import registerFormTools from '\.\/form-webmcp\.js';\n/m, '')
  .replace('export class AEMFormEmbed', 'class AEMFormEmbed');
const sdkSource = readFileSync(resolve(__dirname, '../scripts/llmapps-sdk.js'), 'utf8')
  .replace(/^export (?:default )?/gm, '')
  .replaceAll('import.meta.url', "'https://sdk.example.test/llmapps-sdk.js'");

function sdkFixture(api) {
  return vm.runInNewContext(`${sdkSource}\nnew LLMApp({appInfo:{name:'test',version:'1.0.0'}})`, {
    window: { openai: api },
  });
}

class Element extends EventTarget {
  constructor(tag = 'aem-form-embed') {
    super();
    this.tag = tag;
    this.attributes = new Map();
    this.children = [];
    this.dataset = {};
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  append(...nodes) {
    this.children.push(...nodes);
  }

  replaceChildren(...nodes) {
    this.children = nodes;
  }

  querySelector(tag) {
    return this.children.find((child) => child.tag === tag) || null;
  }
}

function fixture(
  openLink = async () => ({}),
  sendMessage = async () => ({}),
  initialState = null,
) {
  let Embed;
  const toolRegistrations = [];
  vm.runInNewContext(source, {
    registerFormTools(model) {
      const registration = { model, active: true };
      toolRegistrations.push(registration);
      return () => { registration.active = false; };
    },
    HTMLElement: Element,
    URL,
    CustomEvent,
    window: { location: { origin: SANDBOX }, innerWidth: 390 },
    document: {
      createElement: (tag) => new Element(tag),
      body: { classList: { add() {} } },
    },
    customElements: { define: (_name, constructor) => { Embed = constructor; } },
    console,
  });
  const embed = new Embed();
  const form = new Element('form');
  const calls = [];
  const messages = [];
  const states = [];
  const renders = [];
  let unloads = 0;
  embed.setAttribute('url', SOURCE);
  embed.bridge = {
    chatgpt: sdkFixture({
      widgetState: initialState,
      setWidgetState(state) {
        states.push(structuredClone(state));
        this.widgetState = state;
      },
    }).chatgpt,
    reportSize() {},
    openLink(url) {
      calls.push(url);
      return openLink(url);
    },
    sendMessage(message) {
      messages.push(message);
      return sendMessage(message);
    },
  };
  embed.load = async () => {
    embed.pageUrl = new URL(SOURCE);
    embed.replaceChildren(form);
    embed.dataset.status = 'rendered';
  };
  embed.pageBootstrap = {
    async loadPage() { return {}; },
  };
  form.addEventListener('aem-form-dispose', (event) => {
    unloads += 1;
    event.preventDefault();
  });
  embed.renderPage = async (target, reload) => {
    assert.equal(reload, true);
    renders.push(target.href);
    embed.pageUrl = target;
    embed.dataset.status = 'rendered';
  };
  embed.connectedCallback();
  return {
    embed,
    form,
    toolRegistrations,
    calls,
    messages,
    states,
    renders,
    unloads: () => unloads,
  };
}

function initializeForm(embed) {
  const subscriptions = new Map();
  const formModel = {
    subscribe(callback, event) {
      subscriptions.set(event, callback);
      return { unsubscribe: () => subscriptions.delete(event) };
    },
  };
  embed.dispatchEvent(new CustomEvent('formViewInitialized', { detail: { formModel } }));
  return (event) => subscriptions.get(event)?.();
}

function navigate(embed, url) {
  const event = new CustomEvent('aem-form-navigate', {
    detail: { url },
    cancelable: true,
  });
  embed.dispatchEvent(event);
  return event;
}

const tick = () => new Promise((done) => { setImmediate(done); });

test('opening, redirecting, and failure events do not announce a submission', async () => {
  const { embed, messages, states } = fixture();
  const emit = initializeForm(embed);
  emit('submitFailure');
  emit('idcomBookingError');
  assert.deepEqual(messages, []);
  assert.deepEqual(states, []);
  navigate(embed, '?code=synthetic');
  await embed.pageLoad;
  await emit('bookingComplete');
  assert.deepEqual(messages, []);
  assert.deepEqual(states, []);
});

test('confirmed booking saves submitted state and sends the requested message once without a banner', async () => {
  const {
    embed, form, messages, states,
  } = fixture(undefined, undefined, { panel: 'details' });
  const emit = initializeForm(embed);
  await Promise.all([emit('bookingComplete'), emit('bookingComplete')]);
  assert.deepEqual(states, [{ panel: 'details', status: 'submitted' }]);
  assert.deepEqual(messages, ['I have submitted the form']);
  assert.deepEqual(embed.children, [form]);
});

test('a state-save failure does not suppress the chat notification or change the submitted form', async () => {
  const {
    embed, form, messages, states,
  } = fixture();
  embed.bridge.chatgpt.setWidgetState = () => { throw new Error('Synthetic state error'); };
  const emit = initializeForm(embed);
  await emit('bookingComplete');
  await emit('bookingComplete');
  assert.deepEqual(states, []);
  assert.deepEqual(messages, ['I have submitted the form']);
  assert.equal(embed.children[0], form);
  assert.equal(embed.children[1].getAttribute('role'), 'alert');
  assert.match(embed.children[1].textContent, /Unable to save the submitted widget state/);
  assert.equal(embed.children.length, 2);
});

test('hosts without ChatGPT widget state still receive the chat message', async () => {
  const {
    embed, form, messages, states,
  } = fixture();
  embed.bridge.chatgpt = null;
  await initializeForm(embed)('bookingComplete');
  assert.deepEqual(states, []);
  assert.deepEqual(messages, ['I have submitted the form']);
  assert.deepEqual(embed.children, [form]);
});

test('WebMCP tools follow the current form model and are revoked on navigation and disconnect', async () => {
  const { embed, toolRegistrations } = fixture();
  initializeForm(embed);
  initializeForm(embed);
  assert.deepEqual(toolRegistrations.map(({ active }) => active), [false, true]);
  navigate(embed, '?code=synthetic');
  await embed.pageLoad;
  assert.equal(toolRegistrations[1].active, false);
  initializeForm(embed);
  embed.disconnectedCallback();
  assert.equal(toolRegistrations[2].active, false);
});

test('a replaced model cannot announce stale completion', async () => {
  const { embed, messages, states } = fixture();
  const previous = initializeForm(embed);
  const current = initializeForm(embed);
  await previous('bookingComplete');
  assert.deepEqual(messages, []);
  assert.deepEqual(states, []);
  await current('bookingComplete');
  assert.equal(messages.length, 1);
  assert.equal(states.length, 1);
});

test('disconnecting the widget detaches its completion subscription', async () => {
  const { embed, messages, states } = fixture();
  const emit = initializeForm(embed);
  embed.disconnectedCallback();
  await emit('bookingComplete');
  assert.deepEqual(messages, []);
  assert.deepEqual(states, []);
});

[
  ['refusal', async () => ({ isError: true })],
  ['rejection', async () => { throw new Error('Synthetic chat error'); }],
].forEach(([name, sendMessage]) => {
  test(`chat ${name} retains submitted state without changing the successful form or retrying`, async () => {
    const {
      embed, form, messages, states,
    } = fixture(undefined, sendMessage);
    const emit = initializeForm(embed);
    await emit('bookingComplete');
    await emit('bookingComplete');
    assert.deepEqual(states, [{ status: 'submitted' }]);
    assert.deepEqual(messages, ['I have submitted the form']);
    assert.equal(embed.dataset.status, 'rendered');
    assert.equal(embed.children[0], form);
    assert.equal(embed.children[1].getAttribute('role'), 'alert');
    assert.match(embed.children[1].textContent, /Unable to deliver the form submission confirmation/);
  });
});

test('without a navigation event, the form remains intact', () => {
  const { embed, form, calls } = fixture();
  assert.equal(embed.dataset.status, 'rendered');
  assert.equal(embed.children[0], form);
  assert.deepEqual(calls, []);
});

test('navigation is synchronously canceled and the source URL is rendered inline after cleanup', async () => {
  const {
    embed, calls, renders, unloads,
  } = fixture();
  let disconnected = false;
  embed.resources = { disconnect() { disconnected = true; } };
  const event = navigate(embed, `${SANDBOX}/content/loan?code=synthetic&state=test#complete`);
  assert.equal(event.defaultPrevented, true);
  assert.deepEqual(renders, []);
  await embed.pageLoad;
  assert.equal(disconnected, true);
  assert.equal(embed.dataset.status, 'rendered');
  assert.deepEqual(renders, [`${SOURCE}?code=synthetic&state=test#complete`]);
  assert.equal(unloads(), 1);
  assert.deepEqual(calls, []);
});

test('relative URLs resolve against the current source page without changing double-slash paths', async () => {
  await Promise.all([
    ['?state=synthetic', `${SOURCE}?state=synthetic`],
    ['/next?state=synthetic', 'https://forms.example.test/next?state=synthetic'],
    [`${SANDBOX}//other.example.test/next`, 'https://forms.example.test//other.example.test/next'],
  ].map(async ([url, expected]) => {
    const { embed, renders } = fixture();
    navigate(embed, url);
    await embed.pageLoad;
    assert.deepEqual(renders, [expected]);
    navigate(embed, '?state=second');
    await embed.pageLoad;
    assert.equal(renders[1], `${expected.split('?')[0]}?state=second`);
  }));
});

test('duplicate callbacks, including query-order and fragment variants, are never rendered twice', async () => {
  const { embed, renders, unloads } = fixture();
  navigate(embed, '?code=synthetic&state=test');
  navigate(embed, '?state=test&code=synthetic#complete');
  await embed.pageLoad;
  navigate(embed, '?code=synthetic&state=test');
  await embed.pageLoad;
  assert.equal(renders.length, 1);
  assert.equal(unloads(), 1);
});

test('distinct inline navigations are serialized', async () => {
  const { embed, renders } = fixture();
  const render = embed.renderPage;
  let complete;
  embed.renderPage = async (...args) => {
    await new Promise((done) => { complete = done; });
    await render(...args);
    embed.renderPage = render;
  };
  navigate(embed, '/first');
  navigate(embed, '/second');
  await tick();
  assert.deepEqual(renders, []);
  complete();
  await embed.pageLoad;
  assert.deepEqual(renders, ['https://forms.example.test/first', 'https://forms.example.test/second']);
});

test('an unpublished lifecycle is explicitly rejected before rendering a callback', async () => {
  const { embed, renders } = fixture();
  embed.pageBootstrap = {};
  navigate(embed, '?code=synthetic');
  await embed.pageLoad;
  assert.equal(embed.dataset.status, 'error');
  assert.match(embed.children[0].textContent, /publish its page reload lifecycle/);
  assert.deepEqual(renders, []);
});

test('a source form without the reset hook is rejected before fetching the callback', async () => {
  const { embed, form, renders } = fixture();
  form.dispatchEvent = () => true;
  navigate(embed, '?code=synthetic');
  await embed.pageLoad;
  assert.equal(embed.dataset.status, 'error');
  assert.match(embed.children[0].textContent, /publish its reset hook/);
  assert.deepEqual(renders, []);
});

test('a failed callback is not retried or opened externally, and queued loads stop', async () => {
  const { embed, calls } = fixture();
  let attempts = 0;
  embed.renderPage = async () => {
    attempts += 1;
    throw new Error('Synthetic private callback details');
  };
  navigate(embed, '?code=synthetic');
  navigate(embed, '/another');
  await embed.pageLoad;
  navigate(embed, '?code=synthetic');
  await embed.pageLoad;
  assert.equal(attempts, 1);
  assert.equal(embed.dataset.status, 'error');
  assert.equal(embed.children[0].textContent.includes('private callback details'), false);
  assert.deepEqual(calls, []);
});

test('invalid and non-HTTPS navigation is blocked with an explicit error', () => {
  [null, {}, '', 'https://[', 'data:text/plain,synthetic', 'http://forms.example.test/'].forEach((url) => {
    const { embed, calls } = fixture();
    assert.equal(navigate(embed, url).defaultPrevented, true);
    assert.equal(embed.dataset.status, 'error');
    const [message] = embed.children;
    assert.equal(message.getAttribute('role'), 'alert');
    assert.equal(embed.children.length, 1);
    assert.deepEqual(calls, []);
  });
});

test('only a user click opens the host link, and repeated clicks do not open it twice', async () => {
  const { embed, calls } = fixture();
  navigate(embed, 'https://auth.example.test/next');
  const link = embed.children[0].children[1];
  assert.deepEqual(calls, []);
  assert.equal(link.dispatchEvent(new Event('click', { cancelable: true })), false);
  link.dispatchEvent(new Event('click', { cancelable: true }));
  await tick();
  assert.deepEqual(calls, ['https://auth.example.test/next']);
  assert.equal(link.getAttribute('aria-disabled'), 'true');
});

[
  ['refusal', async () => ({ isError: true })],
  ['rejection', async () => { throw new Error('Synthetic host failure'); }],
].forEach(([name, openLink]) => {
  test(`host ${name} shows an error and permits an explicit retry`, async () => {
    const { embed, calls } = fixture(openLink);
    navigate(embed, 'https://auth.example.test/next');
    const [message, link] = embed.children[0].children;
    link.dispatchEvent(new Event('click', { cancelable: true }));
    await tick();
    assert.equal(message.getAttribute('role'), 'alert');
    assert.equal(link.getAttribute('aria-disabled'), null);
    link.dispatchEvent(new Event('click', { cancelable: true }));
    await tick();
    assert.equal(calls.length, 2);
  });
});
