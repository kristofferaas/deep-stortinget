import { v, Infer } from 'convex/values';

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

export const caseValidator = v.object({
  id: v.number(),
  versjon: v.string(),
  type: v.union(
    v.literal('budsjett'),
    v.literal('lovsak'),
    v.literal('alminneligsak')
  ),
  tittel: v.string(),
  korttittel: v.string(),
  status: v.union(
    v.literal('varslet'),
    v.literal('mottatt'),
    v.literal('til_behandling'),
    v.literal('behandlet'),
    v.literal('trukket'),
    v.literal('bortfalt')
  ),
  dokumentgruppe: v.union(
    v.literal('ikke_spesifisert'),
    v.literal('proposisjon'),
    v.literal('melding'),
    v.literal('redegjoerelse'),
    v.literal('representantforslag'),
    v.literal('grunnlovsforslag'),
    v.literal('dokumentserien'),
    v.literal('innstillingssaker'),
    v.literal('innberetning')
  ),
  sist_oppdatert_dato: v.string(),
  sak_fremmet_id: v.number(),
  henvisning: v.optional(v.string()),
});

export type Case = Infer<typeof caseValidator>;
