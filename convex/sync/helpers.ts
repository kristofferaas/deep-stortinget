import { z } from "zod";

// Dates from data.stortinget.no are in Microsoft JSON Date format
export function parseMicrosoftJsonDate(input: string): string {
  const match = /\/Date\((-?\d+)([+-]\d{4})?\)\//.exec(input);
  if (!match) {
    throw new Error("Invalid Microsoft JSON Date. Received: " + input);
  }
  const ms = Number(match[1]);

  // If an offset like +0200 or -0700 is present, adjust to UTC.
  // In the Microsoft JSON Date format, the milliseconds represent the local time
  // at the given offset. To get the UTC instant, subtract the offset.
  let adjustedMs = ms;
  const offset = match[2];
  if (offset) {
    const sign = offset[0] === "+" ? 1 : -1;
    const hours = Number(offset.slice(1, 3));
    const minutes = Number(offset.slice(3, 5));
    const totalOffsetMinutes = sign * (hours * 60 + minutes);
    adjustedMs = ms - totalOffsetMinutes * 60_000;
  }

  return new Date(adjustedMs).toISOString();
}

export const stortingetDtoSchema = z.object({
  versjon: z.literal("1.6"),
  respons_dato_tid: z.string().transform(parseMicrosoftJsonDate),
});

export const stripStortingetDtoMetadata = <
  T extends z.infer<typeof stortingetDtoSchema>,
>(
  dto: T,
): Pretty<Omit<T, "versjon" | "respons_dato_tid">> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { versjon, respons_dato_tid, ...properties } = dto;
  return properties;
};

type Pretty<T> = {
  [K in keyof T]: T[K];
} & {};

// Hearing (høring) schemas
export const hearingSchema = stortingetDtoSchema.extend({
  id: z.number(),
  status: z.number(),
  status_info_tekst: z.string(),
  type: z.number(),
  start_dato: z.string().transform(parseMicrosoftJsonDate),
  soknadfrist_dato: z.string().transform(parseMicrosoftJsonDate),
  innspillsfrist: z.string().transform(parseMicrosoftJsonDate),
  skriftlig: z.boolean(),
  anmodningsfrist_dato_tid: z.string().transform(parseMicrosoftJsonDate),
  sesjon_id: z.string().optional(),
  horing_status: z.string(),
});

export type Hearing = z.infer<typeof hearingSchema>;

export const hearingResponseSchema = stortingetDtoSchema.extend({
  sesjon_id: z.string(),
  horinger_liste: z.array(hearingSchema),
});

export type HearingResponse = z.infer<typeof hearingResponseSchema>;

// Checksum computation for change detection
export async function computeChecksum(data: unknown): Promise<string> {
  // Deterministic JSON stringify with sorted keys
  const json = JSON.stringify(data, (key, value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce(
          (sorted, key) => {
            sorted[key] = value[key];
            return sorted;
          },
          {} as Record<string, unknown>,
        );
    }
    return value;
  });

  // Use Web Crypto API (available in V8 isolates)
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(json);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
}

// Case (sak) schemas
export const caseSchema = stortingetDtoSchema.extend({
  id: z.number(),
  type: z.number().transform((val) => {
    if (val === 1) return "budsjett";
    if (val === 2) return "alminneligsak";
    if (val === 3) return "lovsak";
    throw new Error("Invalid case type");
  }),
  tittel: z.string(),
  korttittel: z.string(),
  status: z.number().transform((val) => {
    if (val === 1) return "behandlet";
    if (val === 2) return "til_behandling";
    if (val === 3) return "mottatt";
    if (val === 4) return "varslet"; // TODO: I have not verified status 4
    if (val === 5) return "trukket"; // TODO: I have not verified status 5
    if (val === 6) return "bortfalt"; // TODO: I have not verified status 6
    throw new Error("Invalid case status: " + val);
  }),
  dokumentgruppe: z.number().transform((val) => {
    if (val === 0) return "ikke_spesifisert";
    if (val === 1) return "proposisjon";
    if (val === 2) return "melding";
    if (val === 3) return "redegjoerelse";
    if (val === 4) return "representantforslag";
    if (val === 5) return "grunnlovsforslag";
    if (val === 6) return "dokumentserien";
    if (val === 7) return "innstillingssaker";
    if (val === 8) return "innberetning";
    throw new Error("Invalid case document group");
  }),
  sist_oppdatert_dato: z.string().transform(parseMicrosoftJsonDate),
  sak_fremmet_id: z.number(),
  henvisning: z
    .string()
    .nullable()
    .transform((val) => val ?? undefined),
});

export type Case = z.infer<typeof caseSchema>;

export const caseResponseSchema = stortingetDtoSchema.extend({
  sesjon_id: z.string(),
  saker_liste: z.array(caseSchema),
});

export type CaseResponse = z.infer<typeof caseResponseSchema>;

// Batch processing helper
export async function batcher<T, R>(
  items: T[],
  callback: (batch: T[]) => Promise<R>,
  batchSize: number = 50,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batchItems = items.slice(i, i + batchSize);
    const result = await callback(batchItems);
    results.push(result);
  }
  return results;
}
