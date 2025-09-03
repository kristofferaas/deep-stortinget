import { internalAction, internalMutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { hearingResponseSchema } from './helpers';
import { internal } from '../_generated/api';
import { hearingValidator } from '../validators';

export const syncHearings = internalAction({
  args: {},
  returns: v.object({
    status: v.number(),
    newHearingCount: v.number(),
  }),
  handler: async ctx => {
    const baseUrl =
      process.env.STORTINGET_BASE_URL ?? 'https://data.stortinget.no';
    const url = new URL('/eksport/horinger', baseUrl);
    url.searchParams.set('format', 'json');

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    try {
      const json = await response.json();
      const parsed = hearingResponseSchema.parse(json);

      const inserted: number = await ctx.runMutation(
        internal.stortinget.hearings.insertMissingHearings,
        { hearings: parsed.horinger_liste }
      );

      return { status: response.status, newHearingCount: inserted };
    } catch (err) {
      console.error(err);
      return { status: response.status, newHearingCount: 0 };
    }
  },
});

export const insertMissingHearings = internalMutation({
  args: {
    hearings: v.array(hearingValidator),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    let insertedCount = 0;
    for (const hearing of args.hearings) {
      const existing = await ctx.db
        .query('hearings')
        .withIndex('by_hearing_id', q => q.eq('id', hearing.id))
        .unique();
      if (!existing) {
        await ctx.db.insert('hearings', hearing);
        insertedCount += 1;
      }
    }
    return insertedCount;
  },
});

export const hearingCount = query({
  args: {},
  returns: v.number(),
  handler: async ctx => {
    const hearings = await ctx.db.query('hearings').collect();
    return hearings.length;
  },
});
