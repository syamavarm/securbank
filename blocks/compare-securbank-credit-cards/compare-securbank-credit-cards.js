const PREVIEW_RESULT = {
  arguments: {
    credit_card_ids: 'apex-card,frequent-flyer-credit-card',
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
    },
    {
      id: 'credit-cards-2',
      name: 'Travel Vlogger Credit Card',
      description: 'Offering rewards on travel spends, airline miles, and exclusive travel perks for content creators on the go.',
      features: [
        '$97 annual fee if you spend less than $40,000 a year on eligible purchases',
        '21.99% p.a. interest rate on purchases',
        '$8,000 minimum credit limit and you expect you will be able to repay all or most of the closing balance each month',
        'No ongoing annual fee if you spend $40,000 a year or more on eligible purchases (less refunds or reversals.)',
      ],
      price: '$97',
      image_url: 'https://www.securbankdemo.com/media_1edeaab7228e02bb1dbf2934d2b9355a924884853.png?width=750&format=png&optimize=medium',
      source_url: 'https://www.securbankdemo.com/creditcards/frequent-flyer-credit-card?category=travel',
      credit_card_id: 'frequent-flyer-credit-card',
      category: 'travel',
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
    },
  ],
};

const SHORT_ROWS = [
  { key: 'category', label: 'Category' },
  { key: 'intro_offer', label: 'Intro offer' },
  { key: 'annual_fee', label: 'Annual fee' },
  { key: 'purchase_interest_rate', label: 'Purchase rate', nowrap: true },
  { key: 'min_credit_limit', label: 'Min. credit limit' },
];

const LIST_ROWS = [
  { key: 'annual_fee_conditions', label: 'Annual fee conditions' },
  { key: 'features', label: 'Features' },
  { key: 'benefits', label: 'Benefits' },
  { key: 'considerations', label: 'Things to consider' },
];

const LONG_VALUE = 40;
const NOT_LISTED = 'Not listed';
const EMPTY_LINE = 'Choose two SecurBank credit cards to compare.';
const APPLY_LABEL = 'Apply for a credit card';
const SEND_ERROR = 'The request could not be sent. Try again.';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function isBlank(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.filter((item) => !isBlank(item)).length === 0;
  return false;
}

function normalize(value) {
  if (isBlank(value)) return null;
  if (Array.isArray(value)) {
    return value.filter((item) => !isBlank(item)).map((item) => String(item));
  }
  return value;
}

function sameValue(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => item === b[index]);
  }
  return a === b;
}

function allSame(values) {
  return values.every((value) => sameValue(value, values[0]));
}

function safeUrl(url, schemes) {
  if (typeof url !== 'string' || !url.trim()) return null;
  try {
    const parsed = new URL(url.trim());
    return schemes.includes(parsed.protocol) ? parsed.href : null;
  } catch (e) {
    return null;
  }
}

function joinNames(names) {
  if (names.length <= 2) return names.join(' compared with ');
  return `${names.slice(0, -1).join(', ')} compared with ${names[names.length - 1]}`;
}

function itemCount(n) {
  return `${n} ${n === 1 ? 'item' : 'items'}`;
}

function recordName(record) {
  return isBlank(record?.name) ? '' : String(record.name);
}

function listValue(value) {
  if (value === null) return el('p', '', NOT_LISTED);
  if (Array.isArray(value)) {
    const ul = el('ul');
    value.forEach((item) => ul.append(el('li', '', item)));
    return ul;
  }
  return el('p', '', value);
}

function cardHead(record, bridge) {
  const th = el('th', 'card-head');
  th.scope = 'col';
  const name = recordName(record);
  const src = safeUrl(record.image_url, ['https:']);
  if (src) {
    const img = el('img', 'card-image');
    img.src = src;
    img.alt = name;
    th.append(img);
  }
  if (name) {
    const href = safeUrl(record.source_url, ['https:', 'tel:']);
    if (href) {
      const link = el('a', 'card-name', name);
      link.href = href;
      if (href.startsWith('https:')) {
        link.target = '_blank';
        link.rel = 'noopener';
        link.addEventListener('click', (event) => {
          if (!bridge?.isConnected) return;
          event.preventDefault();
          bridge.openLink(href);
        });
      }
      th.append(link);
    } else {
      th.append(el('span', 'card-name card-name-plain', name));
    }
  }
  if (!isBlank(record.description)) th.append(el('span', 'card-description', record.description));
  return th;
}

function renderEmpty(root) {
  root.append(el('h2', 'visually-hidden', 'SecurBank credit card comparison'));
  root.append(el('p', 'compare-empty', EMPTY_LINE));
}

function renderCompare(root, records, bridge) {
  const names = records.map(recordName).filter(Boolean);
  const title = joinNames(names);
  root.setAttribute('aria-labelledby', 'compare-title');
  const h2 = el('h2', 'visually-hidden', title);
  h2.id = 'compare-title';
  root.append(h2);

  const evaluate = (row) => {
    const values = records.map((r) => normalize(r[row.key]));
    return { ...row, values, same: allSame(values) };
  };
  // A short term whose value runs long moves into the accordion so the inline height stays bounded.
  const evaluated = SHORT_ROWS.map(evaluate);
  const isLong = (row) => row.values.some((v) => typeof v === 'string' && v.length > LONG_VALUE);
  const shortRows = evaluated.filter((row) => !isLong(row));
  const listRows = [...evaluated.filter(isLong), ...LIST_ROWS.map(evaluate)];
  const total = shortRows.length + listRows.length;
  const sameCount = [...shortRows, ...listRows].filter((r) => r.same).length;

  // Card heads and the rows that differ.
  const table = el('table', 'compare-table');
  table.append(el('caption', 'visually-hidden', title));
  if (records.length > 2) {
    table.classList.add('compare-table-wide');
    const colgroup = el('colgroup');
    records.forEach(() => colgroup.append(el('col')));
    table.append(colgroup);
  }
  const thead = el('thead');
  const headRow = el('tr');
  records.forEach((record) => headRow.append(cardHead(record, bridge)));
  thead.append(headRow);
  table.append(thead);

  const differs = shortRows.filter((r) => !r.same);
  if (differs.length) {
    const tbody = el('tbody', 'differs-rows');
    differs.forEach((row) => {
      const labelRow = el('tr', 'row-label');
      const th = el('th');
      th.scope = 'colgroup';
      th.colSpan = records.length;
      const inner = el('span', 'row-label-inner', row.label);
      inner.append(' ', el('span', 'badge-highlight', 'Differs'));
      th.append(inner);
      labelRow.append(th);
      const valueRow = el('tr', 'row-values');
      row.values.forEach((value) => {
        const td = el('td');
        td.append(el('span', row.nowrap ? 'value-text nowrap' : 'value-text', value === null ? NOT_LISTED : value));
        valueRow.append(td);
      });
      tbody.append(labelRow, valueRow);
    });
    table.append(tbody);
  }
  const scroller = el('div', 'compare-scroll');
  scroller.append(table);
  root.append(scroller);

  // Terms shared by every card.
  const shared = shortRows.filter((r) => r.same);
  if (shared.length) {
    const section = el('section', 'shared');
    section.setAttribute('aria-labelledby', 'shared-heading');
    const heading = el('h3', 'shared-heading', 'Same on both cards');
    heading.id = 'shared-heading';
    heading.append(' ', el('span', 'shared-count', `${sameCount} of ${total} terms`));
    const dl = el('dl', 'shared-grid');
    shared.forEach((row) => {
      const item = el('div', 'shared-item');
      const value = row.values[0];
      item.append(el('dt', '', row.label), el('dd', row.nowrap ? 'nowrap' : '', value === null ? NOT_LISTED : value));
      dl.append(item);
    });
    section.append(heading, dl);
    root.append(section);
  }

  // Long terms in an exclusive accordion.
  const lists = el('div', listRows.length > LIST_ROWS.length ? 'list-rows list-rows-compact' : 'list-rows');
  listRows.forEach((row) => {
    const details = el('details', 'list-row');
    details.setAttribute('name', 'card-lists');
    const summary = el('summary');
    summary.append(el('span', 'list-label', row.label));
    summary.append(el('span', row.same ? 'badge' : 'badge-highlight', row.same ? 'Same' : 'Differs'));
    const counts = row.values.filter(Array.isArray).map((v) => v.length);
    if (counts.length && counts.length === row.values.length) {
      const unique = [...new Set(counts)];
      summary.append(el('span', 'list-count', unique.length === 1 ? itemCount(unique[0]) : `${counts.join(' and ')} items`));
    }
    const chevron = el('span', 'chevron');
    chevron.setAttribute('aria-hidden', 'true');
    summary.append(chevron);
    const body = el('div', 'list-body');
    if (row.same) {
      body.append(listValue(row.values[0]));
    } else {
      body.classList.add('list-split');
      row.values.forEach((value, index) => {
        const column = el('div', 'list-column');
        const name = recordName(records[index]);
        if (name) column.append(el('p', 'list-column-name', name));
        column.append(listValue(value));
        body.append(column);
      });
    }
    details.append(summary, body);
    lists.append(details);
  });
  root.append(lists);

  // Primary journey: open the application form in a follow-up turn.
  const actions = el('div', 'actions');
  const button = el('button', 'button-primary', APPLY_LABEL);
  button.type = 'button';
  const status = el('p', 'compare-status');
  status.setAttribute('role', 'status');
  status.hidden = true;
  button.addEventListener('click', async () => {
    if (!bridge?.isConnected) return;
    const prompt = names.length
      ? `Apply for a SecurBank credit card. I compared ${names.join(' and ')}.`
      : 'Apply for a SecurBank credit card.';
    button.disabled = true;
    status.hidden = true;
    try {
      const result = await bridge.sendMessage(prompt);
      if (result?.isError === true) throw new Error('delivery failed');
    } catch (e) {
      status.textContent = SEND_ERROR;
      status.hidden = false;
    } finally {
      button.disabled = false;
    }
  });
  actions.append(button);
  root.append(actions, status);
}

function render(block, result, bridge) {
  const records = Array.isArray(result?.records)
    ? result.records.filter((r) => r && typeof r === 'object')
    : [];
  const root = el('div', 'card-compare');
  if (records.length < 2) renderEmpty(root);
  else renderCompare(root, records, bridge);
  block.replaceChildren(root);
}

function applyTheme(block, bridge) {
  const theme = bridge?.hostContext?.theme;
  if (theme === 'dark' || theme === 'light') block.dataset.theme = theme;
}

export default async function decorate(block, bridge) {
  const live = bridge?.isConnected && bridge.hostContext?.preview !== true;
  let result = PREVIEW_RESULT;
  if (live) {
    try {
      result = (await bridge.toolResult)?.structuredContent ?? { records: [] };
    } catch (e) {
      result = { records: [] };
    }
  }
  render(block, result, bridge);
  if (bridge?.isConnected) {
    applyTheme(block, bridge);
    if (typeof bridge.onContextChange === 'function') {
      bridge.onContextChange(() => applyTheme(block, bridge));
    }
    bridge.autoResize(block);
  }
}
