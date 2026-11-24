const PREVIEW_RESULT = {
  arguments: {
    query: 'Ways to grow my savings and protect my family',
  },
  records: [
    {
      id: 'browse-financial-products-1',
      name: 'Mortgage Loans',
      description: 'Get a SecurBank new mortgage offer to buy the home you dream of. Tailor-Made Mortgage Quote: home loans made personal.',
      features: [
        'Tailor-Made Mortgage Quote',
        'Home loans made personal',
      ],
      price: null,
      image_url: 'https://www.securbankdemo.com/media_17ef831417d99c30cd6aebb7a279c8ac4dea83097.jpg?width=750&format=jpg&optimize=medium',
      source_url: 'https://www.securbankdemo.com/loans',
      product_type: 'mortgage',
      cta_url: 'https://www.securbankdemo.com/loans/form',
    },
    {
      id: 'browse-financial-products-2',
      name: 'SecurBank Credit Cards',
      description: 'From cash back to travel perks, our credit cards offer low rates and big benefits. Apply today and start saving.',
      features: [
        'Apex Credit Card',
        'Travel Vlogger Credit Card',
        'Rewards Card',
        'Low Rate Card',
        'Low Fee Card',
        'The Ultimate Card',
      ],
      price: null,
      image_url: 'https://www.securbankdemo.com/media_1fbbd77cf30cc4c33ebb312eae92e0ac2df97295a.png?width=750&format=png&optimize=medium',
      source_url: 'https://www.securbankdemo.com/creditcards',
      product_type: 'credit card',
      cta_url: 'https://www.securbankdemo.com/creditcards/form',
    },
    {
      id: 'browse-financial-products-3',
      name: 'High-Yield Accounts',
      description: "Build a Strong Foundation: our high-yield accounts offer great returns and special bonuses, ensuring your family's financial stability and growth. Customized Bank Account.",
      features: [
        '100% online application',
        'Flexible terms based on your needs',
        'No hidden fees',
        '5.92% APR',
      ],
      price: null,
      image_url: 'https://www.securbankdemo.com/media_19ff4d30e8cb30c1fbde806798196dabe4f7cb614.jpg?width=750&format=jpg&optimize=medium',
      source_url: 'https://www.securbankdemo.com/accounts',
      product_type: 'account',
      cta_url: 'https://www.securbankdemo.com/loans/form',
    },
    {
      id: 'browse-financial-products-4',
      name: 'Investment Account',
      description: 'Invest today, secure tomorrow.',
      features: [
        'Diversification: Spread risk across various assets.',
        'Compounded Growth: Maximize returns over time.',
        'Tax Benefits: Enjoy potential tax savings.',
        'Liquidity: Easy access to funds when needed.',
        'Professional Management: Expert portfolio guidance.',
        'Retirement Planning: Secure your financial future.',
      ],
      price: null,
      image_url: 'https://www.securbankdemo.com/media_10fae3dfa73b58b0b073189e6d27643a6a3cb309c.jpg?width=750&format=jpg&optimize=medium',
      source_url: 'https://www.securbankdemo.com/accounts',
      product_type: 'investment',
      cta_url: null,
    },
    {
      id: 'browse-financial-products-5',
      name: 'Vehicle Insurance',
      description: 'Enjoy complete and hassle-free coverage.',
      features: [
        'Zero Dep Coverage Available',
        'Online Purchases & renewals at competitive rates',
        'Cashless claim settlement',
        'Avail 24x7 Roadside Assistance with your Car Insurance Policy',
      ],
      price: null,
      image_url: 'https://www.securbankdemo.com/media_1c22d918cc754efc0484e5ba5bcffcfd21f31aeb3.jpg?width=750&format=jpg&optimize=medium',
      source_url: 'https://www.securbankdemo.com/insurance',
      product_type: 'vehicle insurance',
      cta_url: 'https://www.securbankdemo.com/insurance/form',
    },
    {
      id: 'browse-financial-products-6',
      name: 'Protect Your Health & Well-being',
      description: 'Discover comprehensive coverage options tailored for you and your family.',
      features: [
        'Our plans offer extensive benefits to ensure peace of mind.',
        'Coverage includes medical expenses, accident protection, and more.',
        'Enjoy access to a wide network of healthcare providers.',
        'Get the support you need when it matters most.',
      ],
      price: null,
      image_url: 'https://www.securbankdemo.com/media_19ff4d30e8cb30c1fbde806798196dabe4f7cb614.jpeg?width=750&format=jpeg&optimize=medium',
      source_url: 'https://www.securbankdemo.com/insurance',
      product_type: 'health insurance',
      cta_url: null,
    },
  ],
};

const BLOCK = 'browse-securbank-financial-products';
const PROMPT_BROWSE_CARDS = 'Browse SecurBank credit cards';
const PROMPT_FOLLOW_UP = 'Request a follow-up from SecurBank about savings, investment, or credit card options';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function hasText(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function safeUrl(value, schemes = ['https:']) {
  if (!hasText(value)) return null;
  try {
    const url = new URL(value.trim());
    return schemes.includes(url.protocol) ? url.href : null;
  } catch (e) {
    return null;
  }
}

function connected(bridge) {
  return Boolean(bridge && bridge.isConnected);
}

function cardLink(label, href, name, bridge) {
  const link = el('a', 'card-link', label);
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener';
  if (hasText(name)) {
    link.append(el('span', 'visually-hidden', ` for ${name}`));
  }
  link.addEventListener('click', (event) => {
    if (!connected(bridge) || !href.startsWith('https:')) return;
    event.preventDefault();
    bridge.openLink(href).catch(() => {});
  });
  return link;
}

function renderCard(record, cardId, bridge) {
  const card = el('li', 'product-card');
  card.id = cardId;

  const image = safeUrl(record.image_url);
  if (image) {
    const img = el('img', 'product-image');
    img.src = image;
    img.alt = hasText(record.name) ? record.name : '';
    img.width = 750;
    img.height = 563;
    card.append(img);
  }

  const body = el('div', 'product-body');
  if (hasText(record.product_type)) body.append(el('span', 'badge', record.product_type));
  if (hasText(record.name)) body.append(el('h3', 'product-name', record.name));
  if (hasText(record.description)) body.append(el('p', 'product-description', record.description));

  const features = Array.isArray(record.features) ? record.features.filter(hasText) : [];
  if (features.length) {
    const list = el('ul', 'feature-list');
    features.forEach((feature) => list.append(el('li', '', feature)));
    body.append(list);
  }

  const links = [];
  const apply = safeUrl(record.cta_url);
  if (apply) links.push(cardLink('Apply', apply, record.name, bridge));
  const source = safeUrl(record.source_url);
  if (source) links.push(cardLink('Product page', source, record.name, bridge));
  if (links.length) {
    const row = el('p', 'card-links');
    links.forEach((link, i) => {
      if (i > 0) row.append(document.createTextNode(' '));
      row.append(link);
    });
    body.append(row);
  }

  card.append(body);
  return card;
}

function renderIndex(records, ids, rail) {
  const nav = el('nav');
  nav.setAttribute('aria-label', 'Jump to a product category');
  const list = el('ul', 'category-index');
  records.forEach((record, i) => {
    const label = hasText(record.product_type) ? record.product_type : record.name;
    if (!hasText(label)) return;
    const item = el('li');
    const chip = el('a', 'index-chip', label);
    chip.href = `#${ids[i]}`;
    chip.addEventListener('click', (event) => {
      event.preventDefault();
      const card = rail.querySelector(`#${ids[i]}`);
      if (!card) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      rail.scrollTo({
        left: card.offsetLeft - rail.offsetLeft - parseFloat(getComputedStyle(rail).paddingLeft || '0'),
        behavior: reduce ? 'auto' : 'smooth',
      });
      card.focus({ preventScroll: true });
    });
    item.append(chip);
    list.append(item);
  });
  nav.append(list);
  return nav;
}

function renderActions(bridge) {
  const actions = el('div', 'browser-actions');
  const status = el('p', 'browser-status');
  status.setAttribute('role', 'status');
  status.hidden = true;

  const send = async (prompt) => {
    if (!connected(bridge)) return;
    status.hidden = true;
    status.textContent = '';
    try {
      const result = await bridge.sendMessage(prompt);
      if (result && result.isError === true) throw new Error('delivery failed');
    } catch (e) {
      status.textContent = 'Your message could not be sent. Try again in the chat.';
      status.hidden = false;
    }
  };

  const primary = el('button', 'button-primary', 'Browse credit cards');
  primary.type = 'button';
  primary.addEventListener('click', () => send(PROMPT_BROWSE_CARDS));
  const secondary = el('button', 'button-secondary', 'Request a follow-up');
  secondary.type = 'button';
  secondary.addEventListener('click', () => send(PROMPT_FOLLOW_UP));
  actions.append(primary, secondary);
  return [actions, status];
}

function render(block, result, bridge, failed = false) {
  const records = result && Array.isArray(result.records)
    ? result.records.filter((r) => r && typeof r === 'object')
    : [];

  const section = el('section', 'product-browser');
  section.setAttribute('aria-labelledby', `${BLOCK}-title`);

  const head = el('header', 'browser-head');
  const title = el('h2', 'browser-title', 'SecurBank products');
  title.id = `${BLOCK}-title`;
  head.append(title);
  if (records.length) {
    const noun = records.length === 1 ? 'product category' : 'product categories';
    head.append(el('p', 'browser-count', `${records.length} ${noun}`));
  }
  section.append(head);

  if (records.length) {
    const ids = records.map((_, i) => `${BLOCK}-card-${i + 1}`);
    const rail = el('ul', 'product-rail');
    rail.tabIndex = 0;
    rail.setAttribute('aria-label', 'SecurBank products, scroll sideways for more');
    records.forEach((record, i) => {
      const card = renderCard(record, ids[i], bridge);
      card.tabIndex = -1;
      rail.append(card);
    });
    section.append(renderIndex(records, ids, rail), rail);
  } else {
    const message = failed
      ? 'These products could not be loaded. Ask again in the chat.'
      : 'No SecurBank products match this request.';
    section.append(el('p', 'browser-empty', message));
  }

  section.append(...renderActions(bridge));
  block.replaceChildren(section);
}

function applyTheme(block, context) {
  const theme = context && context.theme;
  if (theme === 'dark' || theme === 'light') block.dataset.theme = theme;
}

export default async function decorate(block, bridge) {
  const live = connected(bridge) && !(bridge.hostContext && bridge.hostContext.preview === true);

  if (connected(bridge)) {
    applyTheme(block, bridge.hostContext);
    bridge.onContextChange((context) => applyTheme(block, context));
  }

  if (live) {
    try {
      const toolResult = await bridge.toolResult;
      const content = toolResult && toolResult.structuredContent;
      if (content && Array.isArray(content.records)) {
        render(block, content, bridge);
      } else {
        render(block, null, bridge, true);
      }
    } catch (e) {
      render(block, null, bridge, true);
    }
  } else {
    render(block, PREVIEW_RESULT, bridge);
  }

  if (connected(bridge)) bridge.autoResize(block);
}
