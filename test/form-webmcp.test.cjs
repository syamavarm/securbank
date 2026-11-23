/* eslint-env node */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = readFileSync(resolve(__dirname, '../scripts/form-webmcp.js'), 'utf8')
  .replace('export default function registerFormTools', 'function registerFormTools');

function load(modelContext) {
  return vm.runInNewContext(`${source}\nregisterFormTools`, {
    AbortController,
    document: { modelContext },
    navigator: {},
    console,
  });
}

function field(name, extra = {}) {
  return {
    name,
    fieldType: 'text-input',
    label: { value: `<b>${name} label</b>` },
    visible: true,
    focused: 0,
    focus() { this.focused += 1; },
    ...extra,
  };
}

function formWith(fields) {
  return {
    label: { value: 'Synthetic loan' },
    visit(callback) { fields.forEach(callback); },
  };
}

function registry() {
  const tools = new Map();
  return {
    tools,
    registerTool(tool, { signal }) {
      if (tools.has(tool.name)) throw new Error(`duplicate tool: ${tool.name}`);
      tools.set(tool.name, tool);
      signal.addEventListener('abort', () => tools.delete(tool.name));
    },
  };
}

test('hosts without WebMCP are a no-op', () => {
  const cleanup = load(undefined)(formWith([]));
  assert.equal(typeof cleanup, 'function');
  cleanup();
});

test('summary reports structure and fill status without exposing values', async () => {
  const modelContext = registry();
  const fields = [
    field('pan', { required: true, value: 'SYNTHETICPAN' }),
    field('mobile', { value: '' }),
    field('hidden', { visible: false, value: 'secret' }),
    { name: 'panel', isContainer: true, visible: true },
  ];
  load(modelContext)(formWith(fields));
  const tool = modelContext.tools.get('get_form_summary');
  assert.equal(tool.annotations.readOnlyHint, true);
  const result = await tool.execute({});
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    success: true,
    title: 'Synthetic loan',
    fields: [
      {
        name: 'pan', label: 'pan label', type: 'text-input', required: true, filled: true,
      },
      {
        name: 'mobile', label: 'mobile label', type: 'text-input', required: false, filled: false,
      },
    ],
  });
  assert.equal(JSON.stringify(result).includes('SYNTHETICPAN'), false);
  assert.equal(JSON.stringify(result).includes('secret'), false);
});

test('focus_field focuses exactly one visible field and rejects unknown or ambiguous names', async () => {
  const modelContext = registry();
  const mobile = field('mobile');
  const hidden = field('hidden', { visible: false });
  load(modelContext)(formWith([mobile, hidden, field('dup'), field('dup')]));
  const tool = modelContext.tools.get('focus_field');
  assert.deepEqual({ ...await tool.execute({ field: 'mobile' }) }, { success: true, field: 'mobile' });
  assert.equal(mobile.focused, 1);
  assert.match((await tool.execute({ field: 'hidden' })).error, /unknown field/);
  assert.equal(hidden.focused, 0);
  assert.match((await tool.execute({ field: 'dup' })).error, /ambiguous field/);
  assert.match((await tool.execute({})).error, /unknown field/);
});

test('set_field_value is confirmation-gated, sets one editable field and never echoes the value', async () => {
  const modelContext = registry();
  const email = field('email', { valid: true });
  const fields = [
    email,
    field('locked', { readOnly: true, value: 'kept' }),
    field('off', { enabled: false, value: 'kept' }),
    field('send', { fieldType: 'button', value: 'kept' }),
    field('hidden', { visible: false, value: 'kept' }),
  ];
  load(modelContext)(formWith(fields));
  const tool = modelContext.tools.get('set_field_value');
  assert.equal(tool.annotations.consequentialHint, true);
  const result = await tool.execute({ field: 'email', value: 'synthetic@example.test' });
  assert.deepEqual({ ...result }, { success: true, field: 'email', valid: true });
  assert.equal(email.value, 'synthetic@example.test');
  assert.equal(JSON.stringify(result).includes('synthetic@example.test'), false);
  await Promise.all(['locked', 'off', 'send'].map(async (name) => {
    assert.match((await tool.execute({ field: name, value: 'x' })).error, /cannot be set/);
  }));
  assert.match((await tool.execute({ field: 'hidden', value: 'x' })).error, /unknown field/);
  assert.match((await tool.execute({ field: 'email' })).error, /value is required/);
  assert.deepEqual(fields.slice(1).map(({ value }) => value), ['kept', 'kept', 'kept', 'kept']);
});

test('calls are logged with the tool and field name only, never the value', async () => {
  const logs = [];
  const modelContext = registry();
  vm.runInNewContext(`${source}\nregisterFormTools`, {
    AbortController,
    document: { modelContext },
    navigator: {},
    console: { info: (...entry) => logs.push(entry), warn() {} },
  })(formWith([field('email')]));
  await modelContext.tools.get('set_field_value').execute({ field: 'email', value: 'synthetic@example.test' });
  assert.deepEqual([...logs[0][1]], ['get_form_summary', 'focus_field', 'set_field_value']);
  assert.equal(logs[1][0], '[AEM Form Embed] WebMCP set_field_value');
  assert.deepEqual({ ...logs[1][1] }, { field: 'email', success: true });
  assert.equal(JSON.stringify(logs).includes('synthetic@example.test'), false);
});

test('cleanup revokes tools so a replacement form can register the same names', () => {
  const modelContext = registry();
  const register = load(modelContext);
  const cleanup = register(formWith([field('mobile')]));
  assert.deepEqual([...modelContext.tools.keys()], ['get_form_summary', 'focus_field', 'set_field_value']);
  cleanup();
  cleanup();
  assert.equal(modelContext.tools.size, 0);
  register(formWith([field('email')]));
  assert.equal(modelContext.tools.size, 3);
});

test('a registration failure revokes partial registrations and does not throw', () => {
  const modelContext = registry();
  modelContext.tools.set('focus_field', {});
  const cleanup = load(modelContext)(formWith([]));
  assert.equal(modelContext.tools.has('get_form_summary'), false);
  cleanup();
});
