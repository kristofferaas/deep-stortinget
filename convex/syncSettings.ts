import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { Crons } from "@convex-dev/crons";

const SYNC_SETTINGS_KEY = "nightly_sync_config";
const CRON_NAME = "stortinget-nightly-sync";
const CRON_SCHEDULE = "0 3 * * *"; // Daily at 03:00 UTC

/**
 * Query the current sync enabled status
 */
export const getSyncEnabled = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("syncSettings")
      .withIndex("by_key", (q) => q.eq("key", SYNC_SETTINGS_KEY))
      .unique();

    // Default to disabled if not found
    return setting?.enabled ?? false;
  },
});

/**
 * Get the full sync settings including cron details
 */
export const getSyncSettings = query({
  args: {},
  returns: v.union(
    v.object({
      enabled: v.boolean(),
      cronSchedule: v.string(),
      updatedAt: v.number(),
      updatedBy: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("syncSettings")
      .withIndex("by_key", (q) => q.eq("key", SYNC_SETTINGS_KEY))
      .unique();

    if (!setting) {
      return null;
    }

    return {
      enabled: setting.enabled,
      cronSchedule: setting.cronSchedule ?? CRON_SCHEDULE,
      updatedAt: setting.updatedAt,
      updatedBy: setting.updatedBy,
    };
  },
});

/**
 * Enable the nightly sync cron job
 */
export const enableNightlySync = internalMutation({
  args: {
    userId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const crons = new Crons(components.crons);

    // Check if cron already exists
    const existingCron = await crons.get(ctx, CRON_NAME);

    if (!existingCron) {
      // Register the cron job
      await crons.register(
        ctx,
        CRON_NAME,
        { kind: "cron", cronspec: CRON_SCHEDULE },
        internal.sync.workflow.startWorkflow,
        {},
      );
      console.log("Nightly sync cron registered");
    }

    // Update or create the settings record
    const existing = await ctx.db
      .query("syncSettings")
      .withIndex("by_key", (q) => q.eq("key", SYNC_SETTINGS_KEY))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: true,
        cronSchedule: CRON_SCHEDULE,
        updatedAt: now,
        updatedBy: args.userId,
      });
    } else {
      await ctx.db.insert("syncSettings", {
        key: SYNC_SETTINGS_KEY,
        enabled: true,
        cronSchedule: CRON_SCHEDULE,
        updatedAt: now,
        updatedBy: args.userId,
      });
    }

    return null;
  },
});

/**
 * Disable the nightly sync cron job
 */
export const disableNightlySync = internalMutation({
  args: {
    userId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const crons = new Crons(components.crons);

    // Check if cron exists and delete it
    const existingCron = await crons.get(ctx, CRON_NAME);

    if (existingCron) {
      await crons.delete(ctx, CRON_NAME);
      console.log("Nightly sync cron unregistered");
    }

    // Update the settings record
    const existing = await ctx.db
      .query("syncSettings")
      .withIndex("by_key", (q) => q.eq("key", SYNC_SETTINGS_KEY))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: false,
        updatedAt: now,
        updatedBy: args.userId,
      });
    } else {
      // Create with disabled state if it doesn't exist
      await ctx.db.insert("syncSettings", {
        key: SYNC_SETTINGS_KEY,
        enabled: false,
        cronSchedule: CRON_SCHEDULE,
        updatedAt: now,
        updatedBy: args.userId,
      });
    }

    return null;
  },
});

/**
 * Toggle the sync enabled status
 */
export const toggleSyncEnabled = mutation({
  args: {
    enabled: v.boolean(),
    userId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.enabled) {
      await ctx.runMutation(internal.syncSettings.enableNightlySync, {
        userId: args.userId,
      });
    } else {
      await ctx.runMutation(internal.syncSettings.disableNightlySync, {
        userId: args.userId,
      });
    }
    return null;
  },
});
