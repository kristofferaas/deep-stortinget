import { v } from 'convex/values';
import { query } from '../_generated/server';

export const partyCount = query({
  args: {},
  returns: v.number(),
  handler: async ctx => {
    const parties = await ctx.db.query('parties').collect();
    return parties.length;
  },
});
