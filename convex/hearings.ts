import { v } from "convex/values";

import { query } from "./_generated/server";

export const getHearings = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("hearings"),
      slug: v.string(),
      title: v.string(),
      status: v.optional(v.string()),
      session: v.optional(v.string()),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const hearings = await ctx.db
      .query("hearings")
      .withIndex("by_updatedAt")
      .order("desc")
      .collect();

    return hearings.map((item) => ({
      id: item._id,
      slug: item.slug,
      title: item.title,
      status: item.status,
      session: item.session,
      updatedAt: item.updatedAt,
    }));
  },
});
