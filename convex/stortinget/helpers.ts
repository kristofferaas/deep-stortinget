import { z } from 'zod';

// Dates from data.stortinget.no are in Microsoft JSON Date format
export function parseMicrosoftJsonDate(input: string): string {
  const match = /\/Date\((\d+)([+-]\d{4})?\)\//.exec(input);
  if (!match) throw new Error('Invalid Microsoft JSON Date');
  const ms = Number(match[1]); // UTC milliseconds since epoch
  return new Date(ms).toISOString(); // "2023-03-08T23:00:00.000Z"
}

// Hearing (høring) schemas
export const hearingSchema = z.object({
  id: z.number(),
  status: z.number(),
  status_info_tekst: z.string(),
  type: z.number(),
  start_dato: z.string().transform(parseMicrosoftJsonDate),
  soknadfrist_dato: z.string().transform(parseMicrosoftJsonDate),
  innspillsfrist: z.string().transform(parseMicrosoftJsonDate),
  skriftlig: z.boolean(),
  anmodningsfrist_dato_tid: z.string().transform(parseMicrosoftJsonDate),
  respons_dato_tid: z.string().transform(parseMicrosoftJsonDate),
  versjon: z.string(),
  sesjon_id: z.string().optional(),
  horing_status: z.string(),
});

export type Hearing = z.infer<typeof hearingSchema>;

export const hearingResponseSchema = z.object({
  versjon: z.string(),
  sesjon_id: z.string(),
  respons_dato_tid: z.string().transform(parseMicrosoftJsonDate),
  horinger_liste: z.array(hearingSchema),
});

export type HearingResponse = z.infer<typeof hearingResponseSchema>;

// Case (sak) schemas
export const caseSchema = z.object({
  id: z.number(),
  versjon: z.string(),
  type: z.number().transform(val => {
    if (val === 1) return 'budsjett';
    if (val === 2) return 'alminneligsak';
    if (val === 3) return 'lovsak';
    throw new Error('Invalid case type');
  }),
  tittel: z.string(),
  korttittel: z.string(),
  status: z.number().transform(val => {
    if (val === 1) return 'behandlet';
    if (val === 2) return 'til_behandling';
    if (val === 3) return 'mottatt';
    if (val === 4) return 'varslet'; // TODO: I have not verified status 4
    if (val === 5) return 'trukket'; // TODO: I have not verified status 5
    if (val === 6) return 'bortfalt'; // TODO: I have not verified status 6
    throw new Error('Invalid case status');
  }),
  dokumentgruppe: z.number().transform(val => {
    if (val === 0) return 'ikke_spesifisert';
    if (val === 1) return 'proposisjon';
    if (val === 2) return 'melding';
    if (val === 3) return 'redegjoerelse';
    if (val === 4) return 'representantforslag';
    if (val === 5) return 'grunnlovsforslag';
    if (val === 6) return 'dokumentserien';
    if (val === 7) return 'innstillingssaker';
    if (val === 8) return 'innberetning';
    throw new Error('Invalid case document group');
  }),
  sist_oppdatert_dato: z.string().transform(parseMicrosoftJsonDate),
  sak_fremmet_id: z.number(),
  henvisning: z
    .string()
    .nullable()
    .transform(val => val ?? undefined),
});

export type Case = z.infer<typeof caseSchema>;

export const caseResponseSchema = z.object({
  versjon: z.string(),
  sesjon_id: z.string(),
  respons_dato_tid: z.string().transform(parseMicrosoftJsonDate),
  saker_liste: z.array(caseSchema),
});

export type CaseResponse = z.infer<typeof caseResponseSchema>;
