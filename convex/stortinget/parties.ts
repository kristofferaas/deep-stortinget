import { v } from "convex/values";
import { query } from "../_generated/server";
import { partyValidator } from "../sync/validators";

export const listParties = query({
  args: {},
  returns: v.array(partyValidator),
  handler: async (ctx) => {
    const parties = await ctx.db.query("parties").collect();

    // Sort parties by name
    const sortedParties = parties.sort((a, b) => a.navn.localeCompare(b.navn));

    return sortedParties.map((party) => ({
      id: party.id,
      navn: party.navn,
      representert_parti: party.representert_parti,
    }));
  },
});
