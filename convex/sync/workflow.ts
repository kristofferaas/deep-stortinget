import { vWorkflowId, WorkflowId, WorkflowManager } from "@convex-dev/workflow";
import { vResultValidator } from "@convex-dev/workpool";
import { v } from "convex/values";
import { api, components, internal } from "../_generated/api";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";

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
  args: {},
  handler: async (step) => {
    const currentWorkflowId = step.workflowId;

    // Create a new sync run entry with current workflowId
    const runId = await step.runMutation(
      internal.sync.workflow.registerSyncRun,
      {
        workflowId: currentWorkflowId,
      },
    );

    // Sync parties from data.stortinget.no to database
    const partyIds = await step.runAction(
      internal.sync.parties.syncParties,
      {},
    );
    await step.runMutation(internal.sync.workflow.updateSyncRun, {
      runId,
      partiesCount: partyIds.length,
    });

    // Sync cases from data.stortinget.no to database
    const caseIds = await step.runAction(internal.sync.cases.syncCases, {});
    await step.runMutation(internal.sync.workflow.updateSyncRun, {
      runId,
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
      runId,
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
      runId,
      voteProposalsCount: allVoteProposalIds.length,
    });
  },
});

// Workflow helpers

export const startWorkflow = action({
  args: {
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!args.force) {
      // Check if nightly sync is enabled
      const syncEnabled = await ctx.runQuery(
        internal.sync.workflow.getSyncSetting,
        { key: "nightly_sync_enabled" },
      );

      if (!syncEnabled) {
        console.log("Nightly sync is disabled, skipping workflow");
        return;
      }
    }

    // Start the workflow
    await workflow.start(
      ctx,
      internal.sync.workflow.syncStortingetWorkflow,
      {},
      {
        onComplete: internal.sync.workflow.handleWorkflowComplete,
        context: {},
      },
    );
  },
});

export const handleWorkflowComplete = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.object({}),
  },
  handler: async (ctx, args) => {
    // Look up the sync run by workflowId
    const syncRun = await ctx.db
      .query("syncRuns")
      .withIndex("by_workflowId", (q) => q.eq("workflowId", args.workflowId))
      .unique();

    if (!syncRun) {
      console.error(`No sync run found for workflow ${args.workflowId}`);
      return;
    }

    // Finalize the sync run based on the result
    const status =
      args.result.kind === "success"
        ? "success"
        : args.result.kind === "failed"
          ? "failed"
          : "canceled";

    const message =
      args.result.kind === "failed" ? args.result.error : undefined;

    await ctx.runMutation(internal.sync.workflow.finalizeSyncRun, {
      runId: syncRun._id,
      status,
      message,
    });

    // Clean up old runs regardless of outcome
    await ctx.runMutation(internal.sync.workflow.cleanupOldRuns, {});
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

// Public query to get sync runs retention days
export const getSyncRunsRetentionDays = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("syncSettings")
      .withIndex("by_key", (q) => q.eq("key", "sync_runs_retention_days"))
      .unique();

    // Default to 30 days if setting doesn't exist or is not a number
    return typeof setting?.value === "number" ? setting.value : 30;
  },
});

// Public mutation to update sync runs retention days
export const updateSyncRunsRetentionDays = mutation({
  args: { days: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Validate that days is a positive number
    if (args.days < 1) {
      throw new Error("Retention days must be at least 1");
    }

    const existing = await ctx.db
      .query("syncSettings")
      .withIndex("by_key", (q) => q.eq("key", "sync_runs_retention_days"))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.days });
    } else {
      await ctx.db.insert("syncSettings", {
        key: "sync_runs_retention_days",
        value: args.days,
      });
    }

    return null;
  },
});

// Sync run management functions

export const registerSyncRun = internalMutation({
  args: {
    workflowId: vWorkflowId,
  },
  returns: v.id("syncRuns"),
  handler: async (ctx, args) => {
    const runId = await ctx.db.insert("syncRuns", {
      workflowId: args.workflowId,
      startedAt: Date.now(),
      status: "started",
    });

    return runId;
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
      v.literal("failed"),
      v.literal("canceled"),
    ),
    message: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      status: args.status,
      finishedAt: Date.now(),
      message: args.message,
    });
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
    await ctx.runMutation(api.sync.workflow.deleteSyncRuns, {
      runIds: oldRuns.map((run) => run._id),
    });

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
        v.literal("failed"),
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
        v.literal("failed"),
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

// Public mutation to delete sync runs and cleanup their workflows
export const deleteSyncRuns = mutation({
  args: {
    runIds: v.array(v.id("syncRuns")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const runId of args.runIds) {
      const run = await ctx.db.get(runId);
      if (!run) continue;

      // Cleanup the workflow using the workflowId
      try {
        await workflow.cleanup(ctx, run.workflowId);
      } catch (error) {
        // Workflow might already be cleaned up or not exist, continue anyway
        console.log(
          `Failed to cleanup workflow ${run.workflowId}:`,
          error instanceof Error ? error.message : String(error),
        );
      }

      // Delete the sync run record
      await ctx.db.delete(runId);
    }

    return null;
  },
});

// Public action to cancel the currently running sync
export const cancelRunningSync = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Get the latest sync run with "started" status
    const latestRun = await ctx.runQuery(
      internal.sync.workflow.getLatestRunningSyncRun,
    );

    if (!latestRun) {
      // No running sync to cancel
      return null;
    }

    // Cancel the workflow
    try {
      await workflow.cancel(ctx, latestRun.workflowId as WorkflowId);
    } catch (error) {
      console.log(
        `Failed to cancel workflow ${latestRun.workflowId}:`,
        error instanceof Error ? error.message : String(error),
      );
    }

    return null;
  },
});

// Public query to check if a sync is currently running
export const isSyncRunning = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const latestRun = await ctx.db
      .query("syncRuns")
      .withIndex("by_startedAt")
      .order("desc")
      .first();

    return latestRun?.status === "started";
  },
});

// Internal query to get the latest running sync run
export const getLatestRunningSyncRun = internalQuery({
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
        v.literal("failed"),
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

    if (!latestRun || latestRun.status !== "started") {
      return null;
    }

    return latestRun;
  },
});
