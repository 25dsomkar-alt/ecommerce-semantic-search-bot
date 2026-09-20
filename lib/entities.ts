import type { EntityItem } from "@/lib/types";

/**
 * Rule-based entity extraction: regular expressions and small dictionaries.
 * It is deliberately simple and explainable (no trained NER model).
 */

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Builds a case-insensitive whole-word regex that prefers the longest term first. */
function buildWordRegex(terms: string[]): RegExp {
  const alternation = [...terms]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join("|");
  return new RegExp(`\\b(?:${alternation})\\b`, "gi");
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }
  return result;
}

function collect(text: string, pattern: RegExp): string[] {
  return Array.from(text.matchAll(pattern), (match) => match[0].trim().replace(/[,.;:\s]+$/, ""));
}

// ---------------------------------------------------------------- products

const PRODUCT_GROUPS: Record<string, string[]> = {
  Footwear: ["running shoes", "shoes", "shoe", "sneakers", "sneaker", "sandals", "sandal", "boots", "boot", "slippers", "heels"],
  Clothing: ["t-shirts", "t-shirt", "tshirt", "shirts", "shirt", "jeans", "jackets", "jacket", "dresses", "dress", "hoodie", "sweater", "saree", "kurta", "trousers", "pants", "shorts", "skirt", "coat"],
  Electronics: ["headphones", "headphone", "earphones", "earbuds", "smartphone", "phone", "laptop", "tablet", "television", "tv", "charger", "camera", "smartwatch", "smart watch", "speaker", "keyboard", "mouse", "monitor", "power bank", "router"],
  Accessories: ["watch", "backpack", "bag", "wallet", "sunglasses", "belt"],
  "Home & Kitchen": ["sofa", "mattress", "pillow", "blender", "mixer", "kettle", "cookware", "lamp", "curtains", "bedsheet"],
  "Beauty & Personal Care": ["perfume", "lipstick", "moisturizer", "shampoo"],
};

const PRODUCT_LOOKUP = new Map<string, string>();
for (const [productType, terms] of Object.entries(PRODUCT_GROUPS)) {
  for (const term of terms) {
    PRODUCT_LOOKUP.set(term, productType);
  }
}
const PRODUCT_PATTERN = buildWordRegex(Array.from(PRODUCT_LOOKUP.keys()));

// ---------------------------------------------------------------- order IDs

/** IDs such as ORD12345, ORD-12345 or OD123456. */
const ORDER_ID_PREFIXED = /\b(?:ORD|ODR|OD)[-_#]?\d{4,12}\b/gi;
/** "order 12345", "order #A-12345", "order id: ORD9981". Requires at least one digit. */
const ORDER_ID_AFTER_KEYWORD = /\border\b\s*(?:id|number|no\.?|num|#)?\s*[:#-]?\s*([A-Z]{0,4}-?\d[A-Z0-9-]{3,})/gi;

function extractOrderIds(message: string): string[] {
  const prefixed = collect(message, ORDER_ID_PREFIXED);
  const afterKeyword = Array.from(message.matchAll(ORDER_ID_AFTER_KEYWORD), (match) => match[1]);
  return unique([...prefixed, ...afterKeyword].map((id) => id.toUpperCase().replace(/^#/, "")));
}

// ---------------------------------------------------------------- dates and time periods

const NUMBER_WORDS = "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty";
const AMOUNT_OF_TIME = `(?:\\d{1,3}|${NUMBER_WORDS}|a\\s+few|a\\s+couple\\s+of|several|an?)`;
const TIME_UNIT = "(?:minute|hour|day|week|month)s?";
const WEEKDAYS = "monday|tuesday|wednesday|thursday|friday|saturday|sunday";
const MONTHS =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

const TIME_PATTERNS: RegExp[] = [
  // yesterday, last week, this morning ...
  new RegExp(
    `\\b(?:day before yesterday|yesterday|today|tonight|this (?:morning|afternoon|evening|week|month)|last (?:night|week|weekend|month|year|${WEEKDAYS})|next (?:week|month))\\b`,
    "gi",
  ),
  // five days ago, 2 weeks ago, a few days ago
  new RegExp(`\\b${AMOUNT_OF_TIME}\\s+(?:business\\s+)?${TIME_UNIT}\\s+ago\\b`, "gi"),
  // for 10 days, within 7 days, in the last 3 days
  new RegExp(
    `\\b(?:for|over|within|past|in the (?:last|past))\\s+(?:the\\s+)?${AMOUNT_OF_TIME}\\s+(?:business\\s+)?${TIME_UNIT}\\b`,
    "gi",
  ),
  // on Monday, since Friday
  new RegExp(`\\b(?:on|since)\\s+(?:${WEEKDAYS})\\b`, "gi"),
  // 12 March, 12th of March 2025
  new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?(?:${MONTHS})\\.?(?:,?\\s+\\d{4})?\\b`, "gi"),
  // March 12, March 12th, 2025
  new RegExp(`\\b(?:${MONTHS})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?\\b`, "gi"),
  // 12/03/2025, 12-03-25
  /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
];

// ---------------------------------------------------------------- amounts

/** Rs 1,499 / ₹500 / $25.50 / 500 rupees / 20 USD */
const AMOUNT_PATTERN =
  /(?<![A-Za-z])(?:(?:₹|rs\.?|inr|usd|eur|\$|€|£)\s?\d[\d,]*(?:\.\d{1,2})?|\d[\d,]*(?:\.\d{1,2})?\s?(?:rupees|inr|usd|dollars|euros|eur)\b)/gi;

// ---------------------------------------------------------------- payment methods

const PAYMENT_METHODS = new Map<string, string>([
  ["credit card", "Credit card"],
  ["debit card", "Debit card"],
  ["gift card", "Gift card"],
  ["card", "Card"],
  ["upi", "UPI"],
  ["net banking", "Net banking"],
  ["netbanking", "Net banking"],
  ["internet banking", "Net banking"],
  ["paypal", "PayPal"],
  ["cash on delivery", "Cash on delivery"],
  ["cod", "Cash on delivery"],
  ["wallet", "Wallet"],
  ["bank transfer", "Bank transfer"],
  ["apple pay", "Apple Pay"],
  ["google pay", "Google Pay"],
  ["gpay", "Google Pay"],
  ["paytm", "Paytm"],
  ["phonepe", "PhonePe"],
]);
const PAYMENT_PATTERN = buildWordRegex(Array.from(PAYMENT_METHODS.keys()));

// ---------------------------------------------------------------- reasons and refunds

const RETURN_REASON_PATTERN =
  /\b(?:damaged|broken|cracked|torn|defective|faulty|not working|stopped working|doesn'?t work|does not work|wrong (?:item|size|colou?r|product)|different (?:item|product|size|colou?r)|too (?:small|big|large|tight|loose)|doesn'?t fit|does not fit|not as described|different from (?:the )?(?:picture|photo|description)|poor quality|missing (?:parts?|items?|pieces?)|changed my mind|no longer (?:need|want)|arrived late|expired)\b/gi;

const REFUND_PATTERN =
  /\b(?:refunds?|refunded|money back|reimburse(?:d|ment)?|store credit|chargeback|credited back)\b/gi;

// ---------------------------------------------------------------- public API

/** Extracts useful details from a customer message as a flat list of label/value pairs. */
export function extractEntities(message: string): EntityItem[] {
  const entities: EntityItem[] = [];
  const add = (label: string, values: string[]) => {
    for (const value of values) {
      entities.push({ label, value });
    }
  };

  add("Order ID", extractOrderIds(message));

  const products = unique(collect(message, PRODUCT_PATTERN).map((value) => value.toLowerCase()));
  add("Product", products);
  add(
    "Product type",
    unique(
      products
        .map((product) => PRODUCT_LOOKUP.get(product))
        .filter((productType): productType is string => productType !== undefined),
    ),
  );

  add("Time reference", unique(TIME_PATTERNS.flatMap((pattern) => collect(message, pattern)).map((v) => v.toLowerCase())));
  add("Amount", unique(collect(message, AMOUNT_PATTERN)));
  add(
    "Payment method",
    unique(collect(message, PAYMENT_PATTERN).map((match) => PAYMENT_METHODS.get(match.toLowerCase()) ?? match)),
  );
  add("Reason", unique(collect(message, RETURN_REASON_PATTERN).map((value) => value.toLowerCase())));
  add("Refund mention", unique(collect(message, REFUND_PATTERN).map((value) => value.toLowerCase())));

  return entities;
}
