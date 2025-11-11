import { vWorkflowId, WorkflowManager } from "@convex-dev/workflow";
import { vResultValidator } from "@convex-dev/workpool";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { internalAction, internalMutation, internalQuery, query, mutation } from "../_generated/server";
import { SyncStatus } from "./validators";

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
  handler: async (step) => {
    await step.runMutation(internal.sync.workflow.updateStatus, {
      status: "started",
    });

    // Sync parties from data.stortinget.no to database
    await step.runAction(internal.sync.parties.syncParties, {});

    // Sync cases from data.stortinget.no to database
    const caseIds = await step.runAction(internal.sync.cases.syncCases, {});

    // Sync votes for ALL cases in parallel
    const promises = caseIds.map((id) =>
      step.runAction(internal.sync.votes.syncVotesForCase, { caseId: id }),
    );
    const results = await Promise.all(promises);

    // Flatten ALL vote IDs (both new and existing) from all results
    const allVoteIds = results.flatMap((result) => result.voteIds);

    // Sync vote proposals for ALL votes in parallel
    const voteProposalPromises = allVoteIds.map((voteId) =>
      step.runAction(internal.sync.votesProposals.syncVoteProposals, {
        voteId,
      }),
    );
    await Promise.all(voteProposalPromises);
  },
});

// Workflow helpers

export const startWorkflow = internalAction({
  handler: async (ctx) => {
    // Check if nightly sync is enabled
    const syncEnabled = await ctx.runQuery(
      internal.sync.workflow.getSyncSetting,
      { key: "nightly_sync_enabled" }
    );

    if (!syncEnabled) {
      console.log("Nightly sync is disabled, skipping workflow");
      return;
    }

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
    context: v.any(),
  },
  handler: async (ctx, args) => {
    if (args.result.kind === "success") {
      // cleanup, finalize DB, notify users, etc.
      await ctx.runMutation(internal.sync.workflow.updateStatus, {
        status: "success",
      });
      await workflow.cleanup(ctx, args.workflowId);
    } else {
      // record failure/cancellation
      await ctx.runMutation(
        internal.sync.workflow.updateStatus,
        args.result.kind === "canceled"
          ? {
              status: "canceled",
              message: "Canceled",
            }
          : {
              status: "error",
              message: args.result.error,
            },
      );
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

// Internal query to get sync settings
export const getSyncSetting = internalQuery({
  args: { key: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("syncSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    // Default to false (disabled) if setting doesn't exist
    return setting?.value ?? false;
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

    // Default to false (disabled) if setting doesn't exist
    return setting?.value ?? false;
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
