import { Infer, v } from 'convex/values';

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
