// Sample WebMCP tools for an AEM form model, following adobe-rnd/aem-boilerplate-forms#222.
// Field values are never returned: banking forms hold personal and financial data.
// Each call is logged so ChatGPT usage can be confirmed in the widget's DevTools console.

const text = (value) => String(value ?? '').replace(/<[^>]*>/g, '').trim();

function visibleFields(form) {
  const fields = [];
  form.visit((field) => {
    if (!field.isContainer && field.visible !== false) fields.push(field);
  });
  return fields;
}

const summaryTool = (form) => ({
  name: 'get_form_summary',
  description: 'Use when the user asks what this form contains or what is left to fill. Returns the form title and each visible field with its label, type, required flag and whether it is filled. Field values are never returned. Read-only.',
  annotations: { readOnlyHint: true, untrustedContentHint: true },
  inputSchema: { type: 'object', properties: {} },
  async execute() {
    return {
      success: true,
      title: text(form.label?.value || form.title),
      fields: visibleFields(form).map((field) => ({
        name: field.name,
        label: text(field.label?.value),
        type: field.fieldType,
        required: field.required === true,
        filled: ![undefined, null, ''].includes(field.value),
      })),
    };
  },
});

const NOT_SETTABLE = ['button', 'file-input', 'captcha', 'plain-text', 'image'];

const setValueTool = (form) => ({
  name: 'set_field_value',
  description: 'Use when the user asks to fill, set or change a single field. Reference the field by the name returned from get_form_summary. Requires user confirmation. Never use it to submit the form.',
  annotations: { readOnlyHint: false, consequentialHint: true },
  inputSchema: {
    type: 'object',
    properties: {
      field: { type: 'string', description: 'field name from get_form_summary' },
      value: { type: ['string', 'number', 'boolean'], description: 'value to set' },
    },
    required: ['field', 'value'],
  },
  async execute(args) {
    const matches = visibleFields(form).filter((field) => field.name === args?.field);
    if (matches.length !== 1) {
      return { success: false, error: `${matches.length ? 'ambiguous' : 'unknown'} field: ${args?.field}` };
    }
    const [target] = matches;
    const locked = target.enabled === false || target.readOnly === true;
    if (locked || NOT_SETTABLE.includes(target.fieldType)) {
      return { success: false, error: `field cannot be set: ${args.field}` };
    }
    if (args.value === undefined) return { success: false, error: 'value is required' };
    target.value = args.value;
    return { success: true, field: args.field, valid: target.valid !== false };
  },
});

const focusTool = (form) => ({
  name: 'focus_field',
  description: 'Use when the user asks to go to, jump to or highlight a field. Reference the field by the name returned from get_form_summary. Does not change any value.',
  annotations: { readOnlyHint: false },
  inputSchema: {
    type: 'object',
    properties: { field: { type: 'string', description: 'field name from get_form_summary' } },
    required: ['field'],
  },
  async execute(args) {
    const matches = visibleFields(form).filter((field) => field.name === args?.field);
    if (matches.length !== 1) {
      return { success: false, error: `${matches.length ? 'ambiguous' : 'unknown'} field: ${args?.field}` };
    }
    matches[0].focus();
    return { success: true, field: args.field };
  },
});

/**
 * Register the sample tools for one form model.
 * @returns {function} cleanup that revokes them; a no-op when the host has no WebMCP.
 */
export default function registerFormTools(form) {
  const modelContext = document.modelContext || navigator.modelContext;
  if (typeof modelContext?.registerTool !== 'function') {
    // eslint-disable-next-line no-console
    console.info('[AEM Form Embed] WebMCP is unavailable in this host');
    return () => {};
  }
  const controller = new AbortController();
  const tools = [summaryTool(form), focusTool(form), setValueTool(form)].map((tool) => ({
    ...tool,
    async execute(args) {
      const result = await tool.execute(args);
      // eslint-disable-next-line no-console
      console.info(`[AEM Form Embed] WebMCP ${tool.name}`, { field: args?.field, success: result.success });
      // ChatGPT's WebMCP examples return tool results as JSON text.
      return JSON.stringify(result);
    },
  }));
  const cleanup = () => {
    if (controller.signal.aborted) return;
    controller.abort();
    tools.forEach(({ name }) => {
      try {
        modelContext.unregisterTool?.(name);
      } catch {
        // Already revoked through the abort signal.
      }
    });
  };
  try {
    tools.forEach((tool) => modelContext.registerTool(tool, { signal: controller.signal }));
    // eslint-disable-next-line no-console
    console.info('[AEM Form Embed] WebMCP tools registered', tools.map(({ name }) => name));
  } catch (error) {
    cleanup();
    // eslint-disable-next-line no-console
    console.warn('[AEM Form Embed] WebMCP tools were not registered', error);
  }
  return cleanup;
}
