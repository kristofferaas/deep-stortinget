import { v, Infer } from "convex/values";

export const hearingValidator = v.object({
  id: v.number(),
  status: v.number(),
  status_info_tekst: v.string(),
  type: v.number(),
  start_dato: v.string(),
  soknadfrist_dato: v.string(),
  innspillsfrist: v.string(),
  skriftlig: v.boolean(),
  anmodningsfrist_dato_tid: v.string(),
  respons_dato_tid: v.string(),
  versjon: v.string(),
  sesjon_id: v.optional(v.string()),
  horing_status: v.string(),
});

export type Hearing = Infer<typeof hearingValidator>;