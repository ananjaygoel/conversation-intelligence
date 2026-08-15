export type ConversationData = {
  call_summary: string;
  customer: { name: string | null; company: string | null };
  intent: string | null;
  products_or_services_discussed: string[];
  customer_needs: string[];
  pain_points: string[];
  budget: string | null;
  timeline: string | null;
  competitors_mentioned: string[];
  objections: string[];
  sentiment: string | null;
  next_actions: string[];
  important_entities: string[];
  key_quotes: string[];
};

const nullableString = { type: ["string", "null"] } as const;
const stringList = { type: "array", items: { type: "string" } } as const;

export const conversationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    call_summary: { type: "string" },
    customer: {
      type: "object",
      additionalProperties: false,
      properties: { name: nullableString, company: nullableString },
      required: ["name", "company"],
    },
    intent: nullableString,
    products_or_services_discussed: stringList,
    customer_needs: stringList,
    pain_points: stringList,
    budget: nullableString,
    timeline: nullableString,
    competitors_mentioned: stringList,
    objections: stringList,
    sentiment: nullableString,
    next_actions: stringList,
    important_entities: stringList,
    key_quotes: stringList,
  },
  required: [
    "call_summary", "customer", "intent", "products_or_services_discussed",
    "customer_needs", "pain_points", "budget", "timeline", "competitors_mentioned",
    "objections", "sentiment", "next_actions", "important_entities", "key_quotes",
  ],
} as const;

export function isConversationData(value: unknown): value is ConversationData {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const expectedKeys = Object.keys(conversationSchema.properties);
  if (Object.keys(record).length !== expectedKeys.length || !expectedKeys.every((key) => key in record)) return false;

  const isNullableString = (item: unknown) => typeof item === "string" || item === null;
  const isStringList = (item: unknown) => Array.isArray(item) && item.every((entry) => typeof entry === "string");
  const customer = record.customer as Record<string, unknown> | null;

  return (
    typeof record.call_summary === "string" && !!customer && Object.keys(customer).length === 2 &&
    isNullableString(customer.name) && isNullableString(customer.company) &&
    isNullableString(record.intent) && isStringList(record.products_or_services_discussed) &&
    isStringList(record.customer_needs) && isStringList(record.pain_points) &&
    isNullableString(record.budget) && isNullableString(record.timeline) &&
    isStringList(record.competitors_mentioned) && isStringList(record.objections) &&
    isNullableString(record.sentiment) && isStringList(record.next_actions) &&
    isStringList(record.important_entities) && isStringList(record.key_quotes)
  );
}
