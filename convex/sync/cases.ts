import { internalAction, internalMutation } from '../_generated/server';
import { v } from 'convex/values';
import { caseResponseSchema } from './helpers';
import { internal } from '../_generated/api';
import { caseValidator } from '../validators';

export const syncCases = internalAction({
  args: {},
  returns: v.object({
    inserted: v.array(v.number()),
    updated: v.array(v.number()),
  }),
  handler: async ctx => {
    const baseUrl =
      process.env.STORTINGET_BASE_URL ?? 'https://data.stortinget.no';
    const url = new URL('/eksport/saker', baseUrl);
    url.searchParams.set('format', 'json');

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const json = await response.json();
    const parsed = caseResponseSchema.parse(json);

    const result: { inserted: number[]; updated: number[] } =
      await ctx.runMutation(internal.sync.cases.upsertCases, {
        cases: parsed.saker_liste,
      });

    return result;
  },
});

export const upsertCases = internalMutation({
  args: {
    cases: v.array(caseValidator),
  },
  returns: v.object({
    inserted: v.array(v.number()),
    updated: v.array(v.number()),
  }),
  handler: async (ctx, args) => {
    const inserted: number[] = [];
    const updated: number[] = [];
    for (const sak of args.cases) {
      const existing = await ctx.db
        .query('cases')
        .withIndex('by_case_id', q => q.eq('id', sak.id))
        .unique();

      if (!existing) {
        await ctx.db.insert('cases', sak);
        inserted.push(sak.id);
      } else if (existing.sist_oppdatert_dato !== sak.sist_oppdatert_dato) {
        await ctx.db.replace(existing._id, sak);
        updated.push(sak.id);
      }
    }
    return { inserted, updated };
  },
});
