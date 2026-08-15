export const fieldTypes = ["text", "number", "boolean", "text_list", "date", "currency"] as const;
export type FieldType = (typeof fieldTypes)[number];

export type SchemaField = {
  key: string;
  name: string;
  type: FieldType;
  description: string;
  required: boolean;
};

export type SchemaDefinition = { version: 1; fields: SchemaField[] };
type UnknownRecord = Record<string, unknown>;

function makeKey(name: string) {
  const key = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return key.slice(0, 48);
}

export function parseSchemaDefinition(value: unknown): SchemaDefinition {
  if (!value || typeof value !== "object") throw new Error("A schema definition is required.");
  const fields = (value as UnknownRecord).fields;
  if (!Array.isArray(fields) || fields.length < 1 || fields.length > 30) {
    throw new Error("Add between 1 and 30 fields.");
  }

  const parsed = fields.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`Field ${index + 1} is invalid.`);
    const record = item as UnknownRecord;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const description = typeof record.description === "string" ? record.description.trim() : "";
    const type = record.type;
    if (!name || name.length > 64) throw new Error(`Field ${index + 1} needs a name of 64 characters or fewer.`);
    if (!fieldTypes.includes(type as FieldType)) throw new Error(`Field "${name}" has an unsupported type.`);
    if (description.length > 400) throw new Error(`Field "${name}" has a description that is too long.`);
    const key = makeKey(name);
    if (!key) throw new Error(`Field "${name}" needs letters or numbers.`);
    return { key, name, type: type as FieldType, description, required: record.required === true };
  });

  if (new Set(parsed.map((field) => field.key)).size !== parsed.length) {
    throw new Error("Field names must be unique.");
  }
  return { version: 1, fields: parsed };
}

function scalarSchema(type: FieldType) {
  switch (type) {
    case "number":
      return { type: ["number", "null"] };
    case "boolean":
      return { type: ["boolean", "null"] };
    case "text_list":
      return { type: "array", items: { type: "string" } };
    default:
      return { type: ["string", "null"] };
  }
}

export function buildCustomJsonSchema(definition: SchemaDefinition) {
  return {
    type: "object",
    additionalProperties: false,
    properties: Object.fromEntries(
      definition.fields.map((field) => [
        field.key,
        {
          ...scalarSchema(field.type),
          description: `${field.name}: ${field.description || "Extract this information from the conversation."} ${field.required ? "The customer marked this field as important." : "This field is optional."}`,
        },
      ]),
    ),
    required: definition.fields.map((field) => field.key),
  } as const;
}
