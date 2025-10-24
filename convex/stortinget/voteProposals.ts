import { v } from "convex/values";
import { query } from "../_generated/server";

export const voteProposalCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const voteProposals = await ctx.db.query("voteProposals").collect();
    return voteProposals.length;
  },
});
