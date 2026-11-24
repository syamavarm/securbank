const PREVIEW_RESULT = {
  arguments: {
    credit_card_id: 'apex-card',
  },
  records: [
    {
      id: 'credit-cards-1',
      name: 'Apex Credit Card',
      description: 'Earn premium rewards tailored for the driven professional on the move.',
      features: [
        '$97 annual fee if you spend less than $40,000 a year on eligible purchases',
        '21.99% p.a. interest rate on purchases',
        '$8,000 minimum credit limit and you expect you will be able to repay all or most of the closing balance each month',
        'No ongoing annual fee if you spend $40,000 a year or more on eligible purchases (less refunds or reversals.)',
      ],
      price: '$97',
      image_url: 'https://www.securbankdemo.com/media_17286a01f0231f613f4df00f087253507b8a8c919.png?width=750&format=png&optimize=medium',
      source_url: 'https://www.securbankdemo.com/creditcards/apex-card?category=business',
      credit_card_id: 'apex-card',
      category: 'business',
      annual_fee: '$97',
      annual_fee_conditions: '$97 annual fee if you spend less than $40,000 a year on eligible purchases; no ongoing annual fee if you spend $40,000 a year or more on eligible purchases (less refunds or reversals).',
      purchase_interest_rate: '21.99% p.a.',
      cash_advance_rate: null,
      interest_free_days: null,
      min_credit_limit: '$8,000',
      benefits: [
        'Save on annual fees: Reduce ongoing card costs with our lowest annual card fee',
        'Complimentary purchase protection insurance: or loss or theft of, or accidental damage to new personal items purchased with your card anywhere in the world, for 90 days from when you get your item',
        'Fraud protection: We proactively detects fraudulent transactions, so you can enjoy 100% peace of mind with all purchases.',
        'Digital wallet payments: Tap and pay with the smartphones and wearables you already own and use everyday.',
      ],
      considerations: [
        'No SecurBank Reward or Frequent Flyer Points benefits',
        'A higher interest rate on purchases compared to the SecurBank Low Rate card',
        'A higher Annual Fee compared to the SecurBank First card',
      ],
      intro_offer: null,
      eligibility: null,
    },
  ],
  compare_options: [
    {
      id: 'credit-cards-2',
      name: 'Travel Vlogger Credit Card',
      credit_card_id: 'frequent-flyer-credit-card',
    },
    {
      id: 'credit-cards-3',
      name: 'Rewards Card',
      credit_card_id: 'rewards-card',
    },
    {
      id: 'credit-cards-4',
      name: 'Low Rate Card',
      credit_card_id: 'low-rate-card',
    },
    {
      id: 'credit-cards-5',
      name: 'Low Fee Card',
      credit_card_id: 'low-fee-card',
    },
    {
      id: 'credit-cards-6',
      name: 'The Ultimate Card',
      credit_card_id: 'the-ultimate-card',
    },
  ],
};

const BLOCK_CLASS = 'view-securbank-credit-card';
const DETAIL_GROUP = 'card-detail';
const HEIGHT_BUDGET = 800;
const PANEL_MIN_HEIGHT = 48;
const COMPARE_FIELD = 'credit_card_id';
const EMPTY_TEXT = 'No SecurBank card matches that identifier.';
const ERROR_TEXT = 'Couldn’t load this card. Ask again in the chat.';
const SEND_ERROR_TEXT = 'Couldn’t send that to the chat. Try again.';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function hasText(value) {
  if (typeof value === 'string') return value.trim() !== '';
  return typeof value === 'number' && Number.isFinite(value);
}

function asText(value) {
  return typeof value === 'string' ? value : String(value);
}

function listOf(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(hasText).map(asText);
}

function safeHref(value, schemes = ['https:', 'tel:']) {
  if (!hasText(value)) return null;
  try {
    const url = new URL(asText(value));
    return schemes.includes(url.protocol) ? url.href : null;
  } catch (e) {
    return null;
  }
}

function connected(bridge) {
  return Boolean(bridge && bridge.isConnected);
}

function makeSender(bridge, status) {
  return async (prompt) => {
    if (!connected(bridge) || typeof bridge.sendMessage !== 'function') return;
    status.textContent = '';
    status.hidden = true;
    try {
      const result = await bridge.sendMessage(prompt);
      if (result && result.isError === true) throw new Error('delivery failed');
    } catch (e) {
      status.textContent = SEND_ERROR_TEXT;
      status.hidden = false;
    }
  };
}

function renderHead(record, bridge) {
  const head = el('header', 'card-head');
  const image = safeHref(record.image_url, ['https:']);
  if (image) {
    const img = el('img', 'card-image');
    img.src = image;
    img.alt = hasText(record.name) ? asText(record.name) : '';
    img.width = 144;
    img.height = 90;
    head.append(img);
  } else {
    head.classList.add('card-head-noimage');
  }

  const intro = el('div', 'card-intro');
  const heading = el('div', 'card-heading');
  if (hasText(record.name)) {
    const name = el('h2', 'card-name', asText(record.name));
    name.id = 'card-name';
    heading.append(name);
  }
  if (hasText(record.category)) heading.append(el('span', 'badge', asText(record.category)));
  if (heading.childElementCount) intro.append(heading);
  if (hasText(record.description)) intro.append(el('p', 'card-description', asText(record.description)));

  const source = safeHref(record.source_url);
  if (source) {
    const link = el('a', 'source-link', 'View on SecurBank');
    link.href = source;
    if (source.startsWith('https:')) {
      link.target = '_blank';
      link.rel = 'noopener';
      link.addEventListener('click', (event) => {
        if (connected(bridge) && typeof bridge.openLink === 'function') {
          event.preventDefault();
          bridge.openLink(source);
        }
      });
    }
    intro.append(link);
  }
  head.append(intro);
  return head;
}

function renderTerms(record) {
  const terms = el('dl', 'terms');
  if (hasText(record.annual_fee) || hasText(record.annual_fee_conditions)) {
    const row = el('div', 'term term-fee');
    row.append(el('dt', 'term-label', 'Annual fee'));
    if (hasText(record.annual_fee)) row.append(el('dd', 'term-value', asText(record.annual_fee)));
    if (hasText(record.annual_fee_conditions)) {
      row.append(el('dd', 'term-note', asText(record.annual_fee_conditions)));
    }
    terms.append(row);
  }
  [
    ['Purchase interest rate', record.purchase_interest_rate],
    ['Minimum credit limit', record.min_credit_limit],
  ].forEach(([label, value]) => {
    if (!hasText(value)) return;
    const row = el('div', 'term');
    row.append(el('dt', 'term-label', label), el('dd', 'term-value', asText(value)));
    terms.append(row);
  });
  if (hasText(record.intro_offer)) {
    const row = el('div', 'term term-offer');
    const label = el('dt', 'term-label');
    label.append(el('span', 'badge badge-highlight', 'Intro offer'));
    row.append(label, el('dd', 'term-value', asText(record.intro_offer)));
    terms.append(row);
  }
  return terms.childElementCount ? terms : null;
}

function fitPanel(details, list) {
  // Keep an open panel inside the inline height budget; the list scrolls internally.
  list.style.removeProperty('--detail-max');
  const block = details.closest(`.${BLOCK_CLASS}`);
  if (!block) return;
  const over = Math.ceil(block.getBoundingClientRect().height) - HEIGHT_BUDGET;
  if (over > 0) {
    const fitted = Math.max(PANEL_MIN_HEIGHT, list.offsetHeight - over);
    list.style.setProperty('--detail-max', `${fitted}px`);
  }
}

function renderDetails(record) {
  const group = el('div', 'details-group');
  [
    ['Card features', record.features],
    ['Benefits', record.benefits],
    ['Things to consider', record.considerations],
  ].forEach(([label, value]) => {
    const items = listOf(value);
    if (!items.length) return;
    const details = el('details', 'detail');
    details.setAttribute('name', DETAIL_GROUP);
    const summary = el('summary', 'detail-summary', label);
    const chevron = el('span', 'detail-chevron');
    chevron.setAttribute('aria-hidden', 'true');
    summary.append(' ', el('span', 'detail-count', String(items.length)), chevron);
    const list = el('ul', 'detail-list');
    items.forEach((item) => list.append(el('li', null, item)));
    details.append(summary, list);
    details.addEventListener('toggle', () => {
      if (details.open) fitPanel(details, list);
    });
    group.append(details);
  });
  return group.childElementCount ? group : null;
}

function renderActions(record, result, send) {
  const actions = el('footer', 'actions');
  const options = Array.isArray(result.compare_options) ? result.compare_options : [];
  const viewedId = record[COMPARE_FIELD];
  const choices = options.filter((option) => option
    && hasText(option.name) && hasText(option[COMPARE_FIELD])
    && asText(option[COMPARE_FIELD]) !== asText(viewedId));

  if (choices.length && hasText(viewedId)) {
    const compare = el('div', 'compare');
    const field = el('span', 'compare-field');
    const select = el('select', 'compare-select');
    select.name = 'compare-with';
    select.setAttribute('aria-label', 'Compare with another card');
    const placeholder = el('option', null, 'Compare with another card');
    placeholder.value = '';
    placeholder.selected = true;
    select.append(placeholder);
    choices.forEach((option) => {
      const item = el('option', null, asText(option.name));
      item.value = asText(option[COMPARE_FIELD]);
      select.append(item);
    });
    field.append(select);
    const button = el('button', 'action-button action-secondary', 'Compare');
    button.type = 'button';
    button.disabled = true;
    select.addEventListener('change', () => {
      button.disabled = select.value === '';
    });
    button.addEventListener('click', () => {
      const chosen = choices.find((option) => asText(option[COMPARE_FIELD]) === select.value);
      if (!chosen) return;
      const viewedName = hasText(record.name) ? asText(record.name) : asText(viewedId);
      send(`Compare ${viewedName} and ${asText(chosen.name)} (${asText(viewedId)}, ${asText(chosen[COMPARE_FIELD])})`);
    });
    compare.append(field, button);
    actions.append(compare);
  }

  if (hasText(record.name)) {
    const name = asText(record.name);
    const apply = el('button', 'action-button action-primary', `Apply for ${name}`);
    apply.type = 'button';
    apply.addEventListener('click', () => send(`Apply for the ${name}`));
    actions.append(apply);
  }
  return actions.childElementCount ? actions : null;
}

function renderSkeleton(block) {
  const article = el('article', 'card-detail card-loading');
  article.setAttribute('aria-busy', 'true');
  const head = el('div', 'card-head');
  const intro = el('div', 'card-intro');
  intro.append(el('div', 'skeleton skeleton-line'), el('div', 'skeleton skeleton-line skeleton-short'));
  head.append(el('div', 'skeleton skeleton-image'), intro);
  article.append(head, el('div', 'skeleton skeleton-terms'));
  block.replaceChildren(article);
}

function render(block, result, bridge) {
  const data = result && typeof result === 'object' ? result : null;
  const article = el('article', 'card-detail');

  if (!data || !Array.isArray(data.records)) {
    article.append(el('p', 'card-message', ERROR_TEXT));
    block.replaceChildren(article);
    return;
  }
  const records = data.records.filter((record) => record && typeof record === 'object');
  if (!records.length) {
    article.append(el('p', 'card-message', EMPTY_TEXT));
    block.replaceChildren(article);
    return;
  }

  const status = el('p', 'card-status');
  status.setAttribute('role', 'status');
  status.hidden = true;
  const send = makeSender(bridge, status);
  const body = el('div', 'card-body');

  const show = (record) => {
    const parts = [
      renderHead(record, bridge),
      renderTerms(record),
      renderDetails(record),
      renderActions(record, data, send),
    ].filter(Boolean);
    body.replaceChildren(...parts);
    if (hasText(record.name)) article.setAttribute('aria-labelledby', 'card-name');
    else article.removeAttribute('aria-labelledby');
  };

  if (records.length > 1) {
    article.classList.add('card-detail-multi');
    const tabs = el('div', 'card-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Cards in this result');
    const buttons = records.map((record, index) => {
      const label = hasText(record.name) ? asText(record.name) : `Card ${index + 1}`;
      const tab = el('button', 'card-tab', label);
      tab.type = 'button';
      tab.setAttribute('role', 'tab');
      return tab;
    });
    const choose = (index) => {
      buttons.forEach((tab, i) => tab.setAttribute('aria-selected', String(i === index)));
      show(records[index]);
    };
    buttons.forEach((tab, index) => tab.addEventListener('click', () => choose(index)));
    tabs.append(...buttons);
    article.append(tabs);
    choose(0);
  } else {
    show(records[0]);
  }
  article.append(body, status);
  block.replaceChildren(article);
}

function applyTheme(block, context) {
  const theme = context && context.theme;
  if (theme === 'light' || theme === 'dark') block.dataset.theme = theme;
}

export default async function decorate(block, bridge) {
  const isConnected = connected(bridge);
  const live = isConnected && !(bridge.hostContext && bridge.hostContext.preview === true);

  if (isConnected) {
    applyTheme(block, bridge.hostContext);
    if (typeof bridge.onContextChange === 'function') {
      bridge.onContextChange((context) => applyTheme(block, context || bridge.hostContext));
    }
  }

  if (!live) {
    render(block, PREVIEW_RESULT, bridge);
    if (isConnected && typeof bridge.autoResize === 'function') bridge.autoResize(block);
    return;
  }

  renderSkeleton(block);
  if (typeof bridge.autoResize === 'function') bridge.autoResize(block);
  let result = null;
  try {
    const toolResult = await bridge.toolResult;
    result = toolResult ? toolResult.structuredContent : null;
  } catch (e) {
    result = null;
  }
  render(block, result, bridge);
}
