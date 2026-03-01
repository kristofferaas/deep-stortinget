import { query } from "./_generated/server";

export const getViewer = query({
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    return user;
  },
});
