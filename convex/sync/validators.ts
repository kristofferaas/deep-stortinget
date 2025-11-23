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
  sesjon_id: v.optional(v.string()),
  horing_status: v.string(),
});

export type Hearing = Infer<typeof hearingValidator>;

export const caseValidator = v.object({
  id: v.number(),
  type: v.union(
    v.literal("budsjett"),
    v.literal("lovsak"),
    v.literal("alminneligsak"),
  ),
  tittel: v.string(),
  korttittel: v.string(),
  status: v.union(
    v.literal("varslet"),
    v.literal("mottatt"),
    v.literal("til_behandling"),
    v.literal("behandlet"),
    v.literal("trukket"),
    v.literal("bortfalt"),
  ),
  dokumentgruppe: v.union(
    v.literal("ikke_spesifisert"),
    v.literal("proposisjon"),
    v.literal("melding"),
    v.literal("redegjoerelse"),
    v.literal("representantforslag"),
    v.literal("grunnlovsforslag"),
    v.literal("dokumentserien"),
    v.literal("innstillingssaker"),
    v.literal("innberetning"),
  ),
  sist_oppdatert_dato: v.string(),
  sak_fremmet_id: v.number(),
  henvisning: v.optional(v.string()),
});

export type Case = Infer<typeof caseValidator>;

export const voteValidator = v.object({
  // alternativ_votering_id: v.number(),
  // antall_for: v.number(),
  // antall_ikke_tilstede: v.number(),
  // antall_mot: v.number(),
  // behandlingsrekkefoelge: v.number(),
  // dagsorden_sak_nummer: v.number(),
  // fri_votering: v.boolean(),
  // kommentar: v.optional(v.string()),
  // mote_kart_nummer: v.number(),
  // personlig_votering: v.boolean(),
  // president: v.any(), // TODO
  sak_id: v.number(),
  vedtatt: v.boolean(),
  votering_id: v.number(),
  votering_resultat_type: v.number(),
  votering_resultat_type_tekst: v.optional(v.string()),
  votering_tema: v.string(),
  votering_tid: v.string(),
});

export type Vote = Infer<typeof voteValidator>;

export const partyValidator = v.object({
  id: v.string(),
  navn: v.string(),
  representert_parti: v.boolean(),
});

export type Party = Infer<typeof partyValidator>;

export const voteProposalValidator = v.object({
  votering_id: v.number(),
  forslag_betegnelse: v.optional(v.string()),
  forslag_betegnelse_kort: v.optional(v.string()),
  forslag_id: v.number(),
  // forslag_levert_av_parti_liste: v.array(partyValidator),
  // forslag_levert_av_representant: v.any(),
  forslag_paa_vegne_av_tekst: v.optional(v.string()),
  forslag_sorteringsnummer: v.number(),
  forslag_tekst: v.optional(v.string()),
  forslag_type: v.number(),
});

export type VoteProposal = Infer<typeof voteProposalValidator>;
