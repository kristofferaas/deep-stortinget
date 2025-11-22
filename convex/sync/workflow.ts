import { vWorkflowId, WorkflowManager } from "@convex-dev/workflow";
import { vResultValidator } from "@convex-dev/workpool";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
  mutation,
} from "../_generated/server";
import { SyncStatus } from "./validators";
import { Id } from "../_generated/dataModel";

export const workflow = new WorkflowManager(components.workflow, {
  workpoolOptions: {
    maxParallelism: 1,
    defaultRetryBehavior: {
      maxAttempts: 5, // Maximum number of retry attempts (including first attempt)
      initialBackoffMs: 1000, // Start with 1 second delay
      base: 2, // Double the backoff time with each retry (exponential)
      // This gives backoff sequence: 1s, 2s, 4s, 8s, 16s
    },
    retryActionsByDefault: true, // Enable retries by default for all actions
  },
});

// The actual workflow that will be run
export const syncStortingetWorkflow = workflow.define({
  args: {
    runId: v.id("syncRuns"),
  },
  handler: async (step, args) => {
    // Sync parties from data.stortinget.no to database
    const partyIds = await step.runAction(
      internal.sync.parties.syncParties,
      {},
    );
    await step.runMutation(internal.sync.workflow.updateSyncRun, {
      runId: args.runId,
      partiesCount: partyIds.length,
    });

    // Sync cases from data.stortinget.no to database
    const caseIds = await step.runAction(internal.sync.cases.syncCases, {});
    await step.runMutation(internal.sync.workflow.updateSyncRun, {
      runId: args.runId,
      casesCount: caseIds.length,
    });

    // Sync votes for ALL cases in parallel
    const promises = caseIds.map((id) =>
      step.runAction(internal.sync.votes.syncVotesForCase, { caseId: id }),
    );
    const results = await Promise.all(promises);

    // Flatten ALL vote IDs (both new and existing) from all results
    const allVoteIds = results.flatMap((result) => result.voteIds);
    await step.runMutation(internal.sync.workflow.updateSyncRun, {
      runId: args.runId,
      votesCount: allVoteIds.length,
    });

    // Sync vote proposals for ALL votes in parallel
    const voteProposalPromises = allVoteIds.map((voteId) =>
      step.runAction(internal.sync.votesProposals.syncVoteProposals, {
        voteId,
      }),
    );
    const voteProposalResults = await Promise.all(voteProposalPromises);

    // Count total vote proposals synced (flatten all proposal IDs)
    const allVoteProposalIds = voteProposalResults.flatMap((ids) => ids);
    await step.runMutation(internal.sync.workflow.updateSyncRun, {
      runId: args.runId,
      voteProposalsCount: allVoteProposalIds.length,
    });
  },
});

// Workflow helpers

export const startWorkflow = internalAction({
  handler: async (ctx) => {
    // Check if nightly sync is enabled
    const syncEnabled = await ctx.runQuery(
      internal.sync.workflow.getSyncSetting,
      { key: "nightly_sync_enabled" },
    );

    if (!syncEnabled) {
      console.log("Nightly sync is disabled, skipping workflow");
      return;
    }

    // Create a new sync run entry
    const { runId } = await ctx.runMutation(
      internal.sync.workflow.createSyncRun,
      {},
    );

    await workflow.start(
      ctx,
      internal.sync.workflow.syncStortingetWorkflow,
      { runId },
      {
        onComplete: internal.sync.workflow.handleWorkflowComplete,
        context: { runId },
      },
    );
  },
});

export const handleWorkflowComplete = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.object({ runId: v.id("syncRuns") }),
  },
  handler: async (ctx, args) => {
    if (args.result.kind === "success") {
      // Finalize the sync run
      await ctx.runMutation(internal.sync.workflow.finalizeSyncRun, {
        runId: args.context.runId,
        status: "success",
      });

      // Cleanup old runs based on retention setting
      await ctx.runMutation(internal.sync.workflow.cleanupOldRuns, {});

      // Cleanup workflow metadata
      await workflow.cleanup(ctx, args.workflowId);
    } else {
      // Record failure/cancellation
      await ctx.runMutation(internal.sync.workflow.finalizeSyncRun, {
        runId: args.context.runId,
        status: args.result.kind === "canceled" ? "canceled" : "error",
        message:
          args.result.kind === "canceled" ? "Canceled" : args.result.error,
      });
      // Do not cleanup the workflow on error or canceled
    }
  },
});

export const updateStatus = internalMutation({
  args: {
    status: v.union(
      v.literal("success"),
      v.literal("error"),
      v.literal("canceled"),
      v.literal("started"),
      v.literal("idle"),
    ),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const currentStatus = await ctx.db
      .query("sync")
      .withIndex("by_key", (q) => q.eq("key", "stortinget_sync"))
      .unique();

    if (!currentStatus) {
      // insert new status
      const insertDoc: SyncStatus = {
        key: "stortinget_sync",
        status: args.status,
      };
      if (args.message !== undefined) insertDoc.message = args.message;
      if (args.status === "started") insertDoc.startedAt = now;
      if (
        args.status === "success" ||
        args.status === "error" ||
        args.status === "canceled"
      ) {
        insertDoc.finishedAt = now;
      }
      await ctx.db.insert("sync", insertDoc);
    } else {
      // update status with appropriate timestamps
      const patch: Partial<SyncStatus> = { status: args.status };

      if (args.message !== undefined) patch.message = args.message;

      switch (args.status) {
        case "started":
          // Treat started as a new start: always set startedAt and clear finishedAt
          patch.startedAt = now;
          patch.finishedAt = undefined;
          break;
        case "success":
        case "error":
        case "canceled":
          patch.finishedAt = now;
          break;
        case "idle":
          // leave timestamps as-is
          break;
      }
      // Ensure we never end up with finishedAt before startedAt.
      // If finishing and startedAt is missing or after finishedAt, set startedAt to now.
      if (
        (args.status === "success" ||
          args.status === "error" ||
          args.status === "canceled") &&
        typeof patch.finishedAt === "number"
      ) {
        const started = currentStatus?.startedAt;
        if (typeof started !== "number" || started > patch.finishedAt) {
          patch.startedAt = now;
        }
      }

      // When starting, explicitly clear any previous finishedAt
      if (args.status === "started") {
        // Explicitly clear any previous finishedAt
        patch.finishedAt = undefined;
      }

      await ctx.db.patch(currentStatus._id, patch);
    }
  },
});

export const getSyncStatus = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("sync"),
      _creationTime: v.number(),
      key: v.string(),
      status: v.union(
        v.literal("idle"),
        v.literal("started"),
        v.literal("success"),
        v.literal("error"),
        v.literal("canceled"),
      ),
      message: v.optional(v.string()),
      startedAt: v.optional(v.number()),
      finishedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx) => {
    const currentStatus = await ctx.db
      .query("sync")
      .withIndex("by_key", (q) => q.eq("key", "stortinget_sync"))
      .unique();

    return currentStatus;
  },
});

// Internal query to get sync settings (boolean values only)
export const getSyncSetting = internalQuery({
  args: { key: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("syncSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    // Default to false (disabled) if setting doesn't exist or is not boolean
    return typeof setting?.value === "boolean" ? setting.value : false;
  },
});

// Public query to get nightly sync status
export const isNightlySyncEnabled = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("syncSettings")
      .withIndex("by_key", (q) => q.eq("key", "nightly_sync_enabled"))
      .unique();

    // Default to false (disabled) if setting doesn't exist or is not boolean
    return typeof setting?.value === "boolean" ? setting.value : false;
  },
});

// Public mutation to toggle nightly sync
export const toggleNightlySync = mutation({
  args: { enabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("syncSettings")
      .withIndex("by_key", (q) => q.eq("key", "nightly_sync_enabled"))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.enabled });
    } else {
      await ctx.db.insert("syncSettings", {
        key: "nightly_sync_enabled",
        value: args.enabled,
      });
    }

    return null;
  },
});

// Sync run management functions

export const createSyncRun = internalMutation({
  args: {},
  returns: v.object({
    runId: v.id("syncRuns"),
    workflowId: v.string(),
  }),
  handler: async (ctx) => {
    // Generate a unique workflow ID
    const workflowId = `sync-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const runId: Id<"syncRuns"> = await ctx.db.insert("syncRuns", {
      workflowId,
      startedAt: Date.now(),
      status: "started",
    });

    return { runId, workflowId };
  },
});

export const updateSyncRun = internalMutation({
  args: {
    runId: v.id("syncRuns"),
    partiesCount: v.optional(v.number()),
    casesCount: v.optional(v.number()),
    votesCount: v.optional(v.number()),
    voteProposalsCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { runId, ...updates } = args;
    await ctx.db.patch(runId, updates);
    return null;
  },
});

export const finalizeSyncRun = internalMutation({
  args: {
    runId: v.id("syncRuns"),
    status: v.union(
      v.literal("success"),
      v.literal("error"),
      v.literal("canceled"),
    ),
    message: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: {
      status: "success" | "error" | "canceled";
      finishedAt: number;
      message?: string;
    } = {
      status: args.status,
      finishedAt: Date.now(),
    };

    if (args.message) {
      updates.message = args.message;
    }

    await ctx.db.patch(args.runId, updates);
    return null;
  },
});

export const cleanupOldRuns = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Get retention period from settings (default to 30 days)
    const retentionSetting = await ctx.db
      .query("syncSettings")
      .withIndex("by_key", (q) => q.eq("key", "sync_runs_retention_days"))
      .unique();

    const retentionDays =
      typeof retentionSetting?.value === "number" ? retentionSetting.value : 30;
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - retentionMs;

    // Query old runs
    const oldRuns = await ctx.db
      .query("syncRuns")
      .withIndex("by_startedAt")
      .filter((q) => q.lt(q.field("startedAt"), cutoffTime))
      .collect();

    // Delete old runs
    for (const run of oldRuns) {
      await ctx.db.delete(run._id);
    }

    console.log(`Cleaned up ${oldRuns.length} old sync runs`);
    return null;
  },
});

// Public query to get the latest sync run
export const getLatestSyncRun = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("syncRuns"),
      _creationTime: v.number(),
      workflowId: v.string(),
      startedAt: v.number(),
      finishedAt: v.optional(v.number()),
      message: v.optional(v.string()),
      status: v.union(
        v.literal("started"),
        v.literal("success"),
        v.literal("error"),
        v.literal("canceled"),
      ),
      partiesCount: v.optional(v.number()),
      casesCount: v.optional(v.number()),
      votesCount: v.optional(v.number()),
      voteProposalsCount: v.optional(v.number()),
    }),
  ),
  handler: async (ctx) => {
    const latestRun = await ctx.db
      .query("syncRuns")
      .withIndex("by_startedAt")
      .order("desc")
      .first();

    return latestRun;
  },
});

// Public query to get all sync runs with pagination
export const getSyncRuns = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("syncRuns"),
      _creationTime: v.number(),
      workflowId: v.string(),
      startedAt: v.number(),
      finishedAt: v.optional(v.number()),
      message: v.optional(v.string()),
      status: v.union(
        v.literal("started"),
        v.literal("success"),
        v.literal("error"),
        v.literal("canceled"),
      ),
      partiesCount: v.optional(v.number()),
      casesCount: v.optional(v.number()),
      votesCount: v.optional(v.number()),
      voteProposalsCount: v.optional(v.number()),
    }),
  ),
  handler: async (ctx) => {
    const runs = await ctx.db
      .query("syncRuns")
      .withIndex("by_startedAt")
      .order("desc")
      .take(100); // Get the latest 100 runs

    return runs;
  },
});
