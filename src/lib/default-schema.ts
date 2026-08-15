import type { Prisma, PrismaClient } from "@prisma/client";
import { conversationSchema } from "./conversation-schema";

export const GENERAL_CONVERSATION_SCHEMA_NAME = "General Conversation";
const GENERAL_CONVERSATION_SYSTEM_KEY = "general_conversation_v0";

// Metadata for the schema library. Processing deliberately uses conversationSchema
// above, preserving the exact V0 shape, nesting, validation, and semantics.
export const generalConversationSchemaDefinition = {
  version: 1,
  kind: "v0_default",
  fields: [
    "call_summary",
    "customer.name",
    "customer.company",
    "intent",
    "products_or_services_discussed",
    "customer_needs",
    "pain_points",
    "budget",
    "timeline",
    "competitors_mentioned",
    "objections",
    "sentiment",
    "next_actions",
    "important_entities",
    "key_quotes",
  ],
  jsonSchema: conversationSchema,
};

type SchemaClient = PrismaClient | Prisma.TransactionClient;

export async function ensureGeneralConversationSchema(client: SchemaClient, userId: string) {
  return client.extractionSchema.upsert({
    where: {
      userId_systemKey: {
        userId,
        systemKey: GENERAL_CONVERSATION_SYSTEM_KEY,
      },
    },
    create: {
      userId,
      name: GENERAL_CONVERSATION_SCHEMA_NAME,
      description: "The built-in V0 business conversation schema.",
      schemaDefinition: JSON.stringify(generalConversationSchemaDefinition),
      isDefault: true,
      systemKey: GENERAL_CONVERSATION_SYSTEM_KEY,
    },
    update: {
      name: GENERAL_CONVERSATION_SCHEMA_NAME,
      description: "The built-in V0 business conversation schema.",
      schemaDefinition: JSON.stringify(generalConversationSchemaDefinition),
      isDefault: true,
    },
  });
}
