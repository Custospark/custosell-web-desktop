const BUSINESS_PROMPTS = [
  'What is low on stock?',
  'How did sales do today?',
  'What invoices are outstanding?',
];

const PERSONAL_PROMPTS = [
  'What can I do in my workspace?',
  'How do I upgrade my plan?',
  'How does offline mode work?',
];

const SHOPPING_PROMPTS = [
  'How do I place an order?',
  'How do I track my order?',
  'How do I pay?',
];

const GUEST_PROMPTS = [
  'What can Custosell do?',
  'How do I get started?',
  'What does it cost?',
];

export type AssistantSegment = 'business' | 'personal' | 'shopping' | 'guest';

/** Input hint per active route - falls back to the account-type default. */
export const PLACEHOLDER_BY_SLUG: Record<string, string> = {
  dashboard: 'Ask about your business or anything you want on Custosell…',
  sales: 'Ask about this sale or anything you want on Custosell…',
  inventory: 'Ask about this product or anything you want on Custosell…',
  customers: 'Ask about these customers or anything you want on Custosell…',
  pipeline: 'Ask about these deals or anything you want on Custosell…',
  estimates: 'Ask about these estimates or anything you want on Custosell…',
  expenses: 'Ask about these expenses or anything you want on Custosell…',
  accounting: 'Ask about your books or anything you want on Custosell…',
  forecasting: 'Ask about your forecast or anything you want on Custosell…',
  documents: 'Ask about these files or anything you want on Custosell…',
  hr: 'Ask about your team or anything you want on Custosell…',
  efris: 'Ask about these receipts or anything you want on Custosell…',
  discover: 'Ask about shopping or anything you want on Custosell…',
  account: 'Ask about your account or anything you want on Custosell…',
  guide: 'Ask for help or anything you want on Custosell…',
  settings: 'Ask about settings or anything you want on Custosell…',
  platform: 'Ask about the platform or anything you want on Custosell…',
  your_tools: 'Ask about your tools or anything you want on Custosell…',
};

export const GROUP_PROMPTS: Record<string, string[]> = {
  Dashboard: ['How is my business doing today?'],
  Sales: ['How did sales do today?', 'Show recent sales'],
  'Inventory & Supply Chain': ['What is low on stock?', 'Find a product'],
  Customers: ['Who are my top customers?'],
  'Online Shopping': ['Show me new arrivals'],
  'Sales Funnel': ['Which deals need follow-up?'],
  'Projects & Estimates': ['What projects are active?'],
  'Income & Expenses': ['Where did money go this month?'],
  Accounting: ['How healthy are my books?'],
  Forecasting: ['What is my cash outlook?'],
  Documents: ['What files were added lately?'],
  'HR & Payroll': ['Who is on leave?', 'How many people do we have?'],
  EFRIS: ['Are my receipts fiscalized?'],
};

/** Table/view-aware context: what the user is literally looking at. Checked before module-level. */
export const VIEW_CONTEXTS: { match: RegExp; placeholder: string; prompts: string[] }[] = [
  {
    match: /^\/sales\/new/,
    placeholder: 'Ask about this sale or anything you want on Custosell…',
    prompts: ['How do I apply a discount here?', 'Which payment methods can I take?'],
  },
  {
    match: /^\/(sales\/(history|orders)|invoices)/,
    placeholder: 'Ask about these records or anything you want on Custosell…',
    prompts: ['Total these up for me', 'Which was the biggest?'],
  },
  {
    match: /^\/customers/,
    placeholder: 'Ask about these customers or anything you want on Custosell…',
    prompts: ['Who bought the most?', 'Find a customer'],
  },
  {
    match: /^\/inventory/,
    placeholder: 'Ask about these products or anything you want on Custosell…',
    prompts: ['Which of these are low on stock?', 'Find the priciest item'],
  },
  {
    match: /^\/expenses/,
    placeholder: 'Ask about these expenses or anything you want on Custosell…',
    prompts: ['Where did the money go?', 'Total this period for me'],
  },
  {
    match: /^\/pipeline/,
    placeholder: 'Ask about these deals or anything you want on Custosell…',
    prompts: ['Which deals need follow-up?'],
  },
  {
    match: /^\/estimates/,
    placeholder: 'Ask about these estimates or anything you want on Custosell…',
    prompts: ['How many estimates are draft?', 'Show me active projects'],
  },
  {
    match: /^\/hr\//,
    placeholder: 'Ask about your team or anything you want on Custosell…',
    prompts: ['Who is on leave?', 'How many people do we have?'],
  },
  {
    match: /^\/documents/,
    placeholder: 'Ask about these files or anything you want on Custosell…',
    prompts: ['How many files do we have?'],
  },
];

export const SEGMENT_COPY: Record<
  AssistantSegment,
  { input: string; intro: string; prompts: string[] }
> = {
  business: {
    input: 'Ask about your business or anything you want on Custosell…',
    intro:
      'I am Oscar, your AI agent. Ask about sales, stock, invoices - or anything else on Custosell.',
    prompts: BUSINESS_PROMPTS,
  },
  personal: {
    input: 'Ask about your workspace or anything you want on Custosell…',
    intro:
      'I am Oscar, your AI agent. Ask about your workspace, tools, plans - or anything else on Custosell.',
    prompts: PERSONAL_PROMPTS,
  },
  shopping: {
    input: 'Ask about shopping or anything you want on Custosell…',
    intro:
      'I am Oscar, your AI agent. Ask about placing orders, tracking, paying - or anything else on Custosell.',
    prompts: SHOPPING_PROMPTS,
  },
  guest: {
    input: 'Ask anything you want about Custosell…',
    intro:
      'I am Oscar, your AI agent. Ask how Custosell works - features, pricing, getting started - or anything else.',
    prompts: GUEST_PROMPTS,
  },
};
