import { Crons } from "@convex-dev/crons";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { mutation, query } from "../_generated/server";

const crons = new Crons(components.crons);

const NIGHTLY_SYNC_SETTING_KEY = "nightly_sync_enabled";
const NIGHTLY_SYNC_CRON_NAME = "stortinget_daily_sync";

/**
 * Get the current nightly sync setting.
 * Returns false by default if the setting doesn't exist.
 */
export const getNightlySyncEnabled = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("syncSettings")
      .withIndex("by_key", (q) => q.eq("key", NIGHTLY_SYNC_SETTING_KEY))
      .unique();

    return setting?.enabled ?? false;
  },
});

/**
 * Toggle the nightly sync setting and register/unregister the cron accordingly.
 */
export const toggleNightlySync = mutation({
  args: {
    enabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Update or create the setting
    const existingSetting = await ctx.db
      .query("syncSettings")
      .withIndex("by_key", (q) => q.eq("key", NIGHTLY_SYNC_SETTING_KEY))
      .unique();

    if (existingSetting) {
      await ctx.db.patch(existingSetting._id, { enabled: args.enabled });
    } else {
      await ctx.db.insert("syncSettings", {
        key: NIGHTLY_SYNC_SETTING_KEY,
        enabled: args.enabled,
      });
    }

    // Register or unregister the cron based on the enabled state
    if (args.enabled) {
      // Check if cron already exists
      const existingCron = await crons.get(ctx, { name: NIGHTLY_SYNC_CRON_NAME });

      if (existingCron === null) {
        // Register the cron to run every day at 03:00 UTC
        await crons.register(
          ctx,
          { kind: "cron", cronspec: "0 3 * * *" },
          internal.sync.workflow.startWorkflow,
          {},
          NIGHTLY_SYNC_CRON_NAME
        );
      }
    } else {
      // Unregister the cron if it exists
      const existingCron = await crons.get(ctx, { name: NIGHTLY_SYNC_CRON_NAME });

      if (existingCron !== null) {
        await crons.delete(ctx, { name: NIGHTLY_SYNC_CRON_NAME });
      }
    }

    return null;
  },
});
