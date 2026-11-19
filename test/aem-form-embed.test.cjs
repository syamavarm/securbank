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
  .replace('export class AEMFormEmbed', 'class AEMFormEmbed');

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
}

function fixture(openLink = async () => ({})) {
  let Embed;
  vm.runInNewContext(source, {
    HTMLElement: Element,
    URL,
    window: { location: { origin: SANDBOX }, innerWidth: 390 },
    document: { createElement: (tag) => new Element(tag) },
    customElements: { define: (_name, constructor) => { Embed = constructor; } },
    console,
  });
  const embed = new Embed();
  const form = new Element('form');
  const calls = [];
  embed.setAttribute('url', SOURCE);
  embed.bridge = {
    reportSize() {},
    openLink(url) {
      calls.push(url);
      return openLink(url);
    },
  };
  embed.load = async () => {
    embed.replaceChildren(form);
    embed.dataset.status = 'rendered';
  };
  embed.connectedCallback();
  return { embed, form, calls };
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

test('without a navigation event, the form remains intact', () => {
  const { embed, form, calls } = fixture();
  assert.equal(embed.dataset.status, 'rendered');
  assert.equal(embed.children[0], form);
  assert.deepEqual(calls, []);
});

test('navigation is synchronously canceled and the source page becomes a user-clicked handoff', () => {
  const { embed, calls } = fixture();
  let disconnected = false;
  embed.resources = { disconnect() { disconnected = true; } };
  const event = navigate(embed, `${SANDBOX}/content/loan?code=synthetic&state=test#complete`);
  assert.equal(event.defaultPrevented, true);
  assert.equal(disconnected, true);
  assert.equal(embed.dataset.status, 'navigation-pending');
  const [message, link] = embed.children[0].children;
  assert.equal(link.href, `${SOURCE}?code=synthetic&state=test#complete`);
  assert.equal(link.textContent, 'Continue in browser');
  assert.equal(message.textContent.includes('synthetic'), false);
  assert.deepEqual(calls, []);
});

test('relative URLs resolve against the form and external HTTPS URLs keep their origin', () => {
  [
    ['?state=synthetic', `${SOURCE}?state=synthetic`],
    ['/next?state=synthetic', 'https://forms.example.test/next?state=synthetic'],
    ['https://auth.example.test/next', 'https://auth.example.test/next'],
    [`${SANDBOX}//other.example.test/next`, 'https://forms.example.test//other.example.test/next'],
  ].forEach(([url, expected]) => {
    const { embed } = fixture();
    navigate(embed, url);
    assert.equal(embed.children[0].children[1].href, expected);
  });
});

test('invalid and non-HTTPS navigation is blocked with an explicit error', () => {
  [null, {}, '', 'https://[', 'data:text/plain,synthetic', 'http://forms.example.test/'].forEach((url) => {
    const { embed, calls } = fixture();
    assert.equal(navigate(embed, url).defaultPrevented, true);
    assert.equal(embed.dataset.status, 'error');
    const [message] = embed.children[0].children;
    assert.equal(message.getAttribute('role'), 'alert');
    assert.equal(embed.children[0].children.length, 1);
    assert.deepEqual(calls, []);
  });
});

test('only a user click opens the host link, and repeated clicks do not open it twice', async () => {
  const { embed, calls } = fixture();
  navigate(embed, SOURCE);
  const link = embed.children[0].children[1];
  assert.deepEqual(calls, []);
  assert.equal(link.dispatchEvent(new Event('click', { cancelable: true })), false);
  link.dispatchEvent(new Event('click', { cancelable: true }));
  await tick();
  assert.deepEqual(calls, [SOURCE]);
  assert.equal(link.getAttribute('aria-disabled'), 'true');
});

[
  ['refusal', async () => ({ isError: true })],
  ['rejection', async () => { throw new Error('Synthetic host failure'); }],
].forEach(([name, openLink]) => {
  test(`host ${name} shows an error and permits an explicit retry`, async () => {
    const { embed, calls } = fixture(openLink);
    navigate(embed, SOURCE);
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
