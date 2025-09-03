import { z } from 'zod';

export const hearingSchema = z.object({
  id: z.number(),
  status: z.number(),
  status_info_tekst: z.string(),
  type: z.number(),
  start_dato: z.string(),
  soknadfrist_dato: z.string(),
  innspillsfrist: z.string(),
  skriftlig: z.boolean(),
  anmodningsfrist_dato_tid: z.string(),
  respons_dato_tid: z.string(),
  versjon: z.string(),
  sesjon_id: z.string().optional(),
  horing_status: z.string(),
});

export type Hearing = z.infer<typeof hearingSchema>;

export const hearingResponseSchema = z.object({
  versjon: z.string(),
  sesjon_id: z.string(),
  respons_dato_tid: z.string(),
  horinger_liste: z.array(hearingSchema),
});

export type HearingResponse = z.infer<typeof hearingResponseSchema>;
