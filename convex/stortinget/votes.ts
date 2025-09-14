import { v } from "convex/values";
import { query } from "../_generated/server";

export const voteCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const votes = await ctx.db.query("votes").collect();
    return votes.length;
  },
});
