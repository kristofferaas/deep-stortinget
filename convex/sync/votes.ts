import { v } from 'convex/values';
import { z } from 'zod';
import { internalAction, internalMutation } from '../_generated/server';
import {
  parseMicrosoftJsonDate,
  stortingetDtoSchema,
  stripStortingetDtoMetadata,
} from './helpers';
import { voteValidator } from './validators';
import { internal } from '../_generated/api';

const voteSchema = stortingetDtoSchema.extend({
  // alternativ_votering_id: z.number(),
  // antall_for: z.number(),
  // antall_ikke_tilstede: z.number(),
  // antall_mot: z.number(),
  // behandlingsrekkefoelge: z.number(),
  // dagsorden_sak_nummer: z.number(),
  // fri_votering: z.boolean(),
  // kommentar: z.string().nullable(),
  // mote_kart_nummer: z.number(),
  // personlig_votering: z.boolean(),
  // president: z.unknown(),
  sak_id: z.number(),
  vedtatt: z.boolean(),
  votering_id: z.number(),
  votering_resultat_type: z.number(),
  votering_resultat_type_tekst: z
    .string()
    .nullable()
    .transform(val => val ?? undefined),
  votering_tema: z.string(),
  votering_tid: z.string().transform(parseMicrosoftJsonDate),
});

const voteResponseSchema = stortingetDtoSchema.extend({
  sak_id: z.number(),
  sak_votering_liste: z.array(voteSchema),
});

export const syncVotesForCase = internalAction({
  args: { caseId: v.number() },
  returns: v.object({
    insertedVotes: v.array(v.number()),
  }),
  handler: async (ctx, args) => {
    const baseUrl =
      process.env.STORTINGET_BASE_URL ?? 'https://data.stortinget.no';
    const url = new URL('/eksport/voteringer', baseUrl);
    url.searchParams.set('format', 'json');
    url.searchParams.set('sakid', args.caseId.toString());

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      const json = await response.json();
      const parsed = voteResponseSchema.parse(json);

      const result: { insertedVotes: number[] } = await ctx.runMutation(
        internal.sync.votes.insertVotes,
        {
          votes: parsed.sak_votering_liste.map(stripStortingetDtoMetadata),
        }
      );

      return result;
    } catch (err) {
      console.error('Error syncing votes for case', args.caseId);
      throw err;
    }
  },
});

export const insertVotes = internalMutation({
  args: { votes: v.array(voteValidator) },
  returns: v.object({
    insertedVotes: v.array(v.number()),
  }),
  handler: async (ctx, args) => {
    const insertedVotes: number[] = [];
    for (const vote of args.votes) {
      const existing = await ctx.db
        .query('votes')
        .withIndex('by_vote_id', q => q.eq('votering_id', vote.votering_id))
        .unique();
      if (!existing) {
        await ctx.db.insert('votes', vote);
        insertedVotes.push(vote.votering_id);
      }
    }
    return { insertedVotes };
  },
});
