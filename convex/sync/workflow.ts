import { vWorkflowId, WorkflowManager } from "@convex-dev/workflow";
import { vResultValidator } from "@convex-dev/workpool";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { internalAction, internalMutation, query } from "../_generated/server";
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

export const syncStortingetWorkflow = workflow.define({
  handler: async (step) => {
    await step.runMutation(internal.sync.workflow.updateStatus, {
      status: "started",
    });

    // Sync parties from data.stortinget.no to database
    await step.runAction(internal.sync.parties.syncParties, {});

    // Sync cases from data.stortinget.no to database
    const caseIds = await step.runAction(internal.sync.cases.syncCases, {});

    // Run sync votes for all case ids in parallel
    const promises = caseIds.map((id) =>
      step.runAction(internal.sync.votes.syncVotesForCase, { caseId: id }),
    );
    await Promise.all(promises);
  },
});

export const startWorkflow = internalAction({
  handler: async (ctx) => {
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
  handler: async (ctx) => {
    const currentStatus = await ctx.db
      .query("sync")
      .withIndex("by_key", (q) => q.eq("key", "stortinget_sync"))
      .unique();

    return currentStatus;
  },
});
