// Pure helpers for interpreting the AI Concierge's replies.
//
// Gemini is prompted to append machine-readable control tags to the end of its
// natural-language answer:
//   [ADD_TO_CART: [{"id": "...", "quantity": n}]]  -> add items to the cart
//   [ITEMS: ["id1", "id2"]]                          -> attach item cards
//   [SHOW_CHECKOUT]                                  -> reveal the checkout CTA
// The UI must (a) act on those tags and (b) strip them so the visitor never
// sees the raw protocol. Keeping this logic here — free of React/DOM — makes
// the parser deterministic and unit-testable, which is exactly the behaviour a
// prompt-injection or a malformed model response could otherwise break.

import type { MenuItem } from '../types';

export interface ParsedAiResponse {
  /** The user-facing text, with every control tag removed and trimmed. */
  text: string;
  /** Validated cart additions the UI should apply. */
  cartAdditions: { id: string; quantity: number }[];
  /** Menu items to render as suggestion cards. */
  suggestedItems: MenuItem[];
  /** Whether the assistant asked to reveal the checkout action. */
  showCheckout: boolean;
}

const ADD_TO_CART_RE = /\[ADD_TO_CART:\s*(\[[^\]]*\])\]/i;
const ITEMS_RE = /\[ITEMS:\s*(\[[^\]]*\])\]/i;
const SHOW_CHECKOUT_RE = /\[SHOW_CHECKOUT\]/gi;

// Global strippers tolerate malformed/duplicated tags left in the text.
const ADD_TO_CART_STRIP_RE = /\[ADD_TO_CART:\s*.*?\]\]/gi;
const ITEMS_STRIP_RE = /\[ITEMS:\s*.*?\]\]/gi;

/** Safely parse a JSON array from a tag capture; returns [] on any failure. */
function safeParseArray<T>(raw: string | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/**
 * Parse a raw Gemini reply into the actions the UI should take. Only cart
 * additions and item references that resolve to a REAL, known menu item are
 * kept — the model can never inject an arbitrary id, price, or quantity into
 * the cart, and out-of-range quantities are clamped.
 */
export function parseAiResponse(rawResponse: string, menuItems: MenuItem[]): ParsedAiResponse {
  let text = rawResponse ?? '';

  const showCheckout = SHOW_CHECKOUT_RE.test(text);
  text = text.replace(SHOW_CHECKOUT_RE, '').trim();

  // ADD_TO_CART: keep only additions whose id maps to a known item.
  const rawAdditions = safeParseArray<{ id?: unknown; quantity?: unknown }>(
    text.match(ADD_TO_CART_RE)?.[1]
  );
  const cartAdditions = rawAdditions
    .filter((a): a is { id: string; quantity?: unknown } => typeof a?.id === 'string')
    .filter((a) => menuItems.some((m) => m.id === a.id))
    .map((a) => {
      const q = Number(a.quantity);
      const quantity = Number.isFinite(q) && q >= 1 ? Math.floor(q) : 1;
      return { id: a.id, quantity };
    });
  text = text.replace(ADD_TO_CART_STRIP_RE, '').trim();

  // ITEMS: resolve referenced ids to their menu items (dedup, preserve order).
  const ids = safeParseArray<unknown>(text.match(ITEMS_RE)?.[1]).filter(
    (id): id is string => typeof id === 'string'
  );
  const suggestedItems = menuItems.filter((m) => ids.includes(m.id));
  text = text.replace(ITEMS_STRIP_RE, '').trim();

  return { text, cartAdditions, suggestedItems, showCheckout };
}

/**
 * Lightweight, multilingual keyword matcher used by the offline fallback
 * assistant to map free text to menu items when the live model is unavailable.
 */
export function getMatchingItems(text: string, items: MenuItem[]): MenuItem[] {
  const t = text.toLowerCase();
  const matchTaco =
    t.includes('taco') ||
    t.includes('quesadilla') ||
    t.includes('guacamole') ||
    t.includes('mexic') ||
    t.includes('burrito');
  const matchBurger =
    t.includes('burger') ||
    t.includes('hamburg') ||
    t.includes('fries') ||
    t.includes('papas') ||
    t.includes('frites') ||
    t.includes('patatine');
  const matchWok =
    t.includes('wok') ||
    t.includes('noodle') ||
    t.includes('fideo') ||
    t.includes('macarr') ||
    t.includes('nouille') ||
    t.includes('spaghett') ||
    t.includes('dumpling') ||
    t.includes('asian');
  const matchSweet =
    t.includes('sweet') ||
    t.includes('waffle') ||
    t.includes('gelato') ||
    t.includes('ice') ||
    t.includes('helado') ||
    t.includes('sorvete') ||
    t.includes('glace') ||
    t.includes('bubble') ||
    t.includes('shake') ||
    t.includes('doce') ||
    t.includes('dessert') ||
    t.includes('postre') ||
    t.includes('dolce');

  return items.filter((item) => {
    const stallNameLower = item.stallName.toLowerCase();
    const categoryLower = item.category.toLowerCase();
    if (matchTaco && (stallNameLower.includes('taco') || categoryLower.includes('mexican')))
      return true;
    if (
      matchBurger &&
      (stallNameLower.includes('burger') ||
        categoryLower.includes('burger') ||
        categoryLower.includes('fries'))
    )
      return true;
    if (
      matchWok &&
      (stallNameLower.includes('wok') ||
        stallNameLower.includes('roll') ||
        categoryLower.includes('noodle') ||
        categoryLower.includes('rice') ||
        categoryLower.includes('asian'))
    )
      return true;
    if (
      matchSweet &&
      (stallNameLower.includes('sweet') ||
        stallNameLower.includes('retreat') ||
        categoryLower.includes('dessert') ||
        categoryLower.includes('beverage') ||
        categoryLower.includes('waffle'))
    )
      return true;

    return (
      item.name.toLowerCase().includes(t) ||
      categoryLower.includes(t) ||
      item.description.toLowerCase().includes(t)
    );
  });
}

/**
 * Sanitize and length-clamp user inputs to prevent XSS, HTML injection,
 * and prompt injection.
 */
export function sanitizePrompt(rawText: string): string {
  const clean = (rawText || '').replace(/<[^>]*>/g, '').trim();
  return clean.length > 500 ? clean.substring(0, 500) : clean;
}

// Known prompt-injection / jailbreak patterns. Sanitizing (stripping HTML) is
// not enough on its own — a user can type plain-text instructions that try to
// override the system prompt ("ignore previous instructions", "you are now…").
// These are matched case-insensitively so the chat layer can refuse to forward
// a manipulative message to the model.
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(the\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/i,
  /disregard\s+(all\s+)?(your|the|previous)\b/i,
  /forget\s+(everything|all|your|the)\b/i,
  /\byou\s+are\s+now\b/i,
  /\bpretend\s+(you|to)\s+be\b/i,
  /\bact\s+as\s+(if|an?|the)\b/i,
  /override\s+(the\s+)?(system|safety|instructions?|prompt)/i,
  /\breveal\s+(your|the)\s+(system\s+)?(prompt|instructions?)/i,
  /^\s*system\s*:/im,
  /^\s*\[?\s*system\s*\]?\s*:/im,
  /\bsudo\b/i,
  /\brm\s+-rf\b/i,
  /\b(eval|exec)\s*\(/i,
];

/**
 * Returns true if the input looks like a prompt-injection / jailbreak attempt.
 * The chat layer uses this to refuse forwarding the message to Gemini and to
 * respond with a safe, canned reply instead.
 */
export function detectPromptInjection(rawText: string): boolean {
  if (typeof rawText !== 'string' || rawText.length === 0) return false;
  return INJECTION_PATTERNS.some((re) => re.test(rawText));
}
