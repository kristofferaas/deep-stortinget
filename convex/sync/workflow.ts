import { WorkflowManager } from '@convex-dev/workflow';
import { v } from 'convex/values';
import { components, internal } from '../_generated/api';
import { internalAction, internalMutation, query } from '../_generated/server';

export const workflow = new WorkflowManager(components.workflow);

export const startWorkflow = internalAction({
  handler: async ctx => {
    // mark status as started
    await ctx.runMutation(internal.sync.workflow.setSyncStatus, {
      key: 'stortinget_sync',
      status: 'in_progress',
      message: 'Sync started',
      lastFinishedAt: 0,
    });

    const workflowId = await workflow.start(
      ctx,
      internal.sync.workflow.syncStortingetWorkflow,
      {}
    );

    try {
      while (true) {
        const status = await workflow.status(ctx, workflowId);
        if (status.type === 'inProgress') {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        console.log('Workflow completed with status:', status);
        await ctx.runMutation(internal.sync.workflow.setSyncStatus, {
          key: 'stortinget_sync',
          status: status.type === 'failed' ? 'error' : 'success',
          message:
            status.type === 'failed'
              ? `Sync failed: ${status.error}`
              : 'Sync completed successfully',
          lastFinishedAt: Date.now(),
        });
        break;
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        await ctx.runMutation(internal.sync.workflow.setSyncStatus, {
          key: 'stortinget_sync',
          status: 'error',
          message: `Sync crashed: ${err.message}`,
          lastFinishedAt: Date.now(),
        });
      } else {
        await ctx.runMutation(internal.sync.workflow.setSyncStatus, {
          key: 'stortinget_sync',
          status: 'error',
          message: 'Sync crashed: Unknown error',
          lastFinishedAt: Date.now(),
        });
      }
      throw err;
    } finally {
      await workflow.cleanup(ctx, workflowId);
    }
  },
});

export const syncStortingetWorkflow = workflow.define({
  handler: async step => {
    // Sync cases from data.stortinget.no to database
    await step.runAction(internal.sync.cases.syncCases, {});
  },
});

// Internal mutation to set sync status
export const setSyncStatus = internalMutation({
  args: {
    key: v.string(),
    status: v.union(
      v.literal('idle'),
      v.literal('in_progress'),
      v.literal('success'),
      v.literal('error')
    ),
    message: v.optional(v.string()),
    lastFinishedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('sync')
      .withIndex('by_key', q => q.eq('key', args.key))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        message: args.message,
        lastFinishedAt: args.lastFinishedAt,
      });
    } else {
      await ctx.db.insert('sync', {
        key: args.key,
        status: args.status,
        message: args.message,
        lastFinishedAt: args.lastFinishedAt,
      });
    }
    return null;
  },
});

// Public query to get sync status
export const getSyncStatus = query({
  args: {},
  returns: v.object({
    status: v.union(
      v.literal('idle'),
      v.literal('in_progress'),
      v.literal('success'),
      v.literal('error')
    ),
    message: v.optional(v.string()),
    lastFinishedAt: v.number(),
  }),
  handler: async ctx => {
    const row = await ctx.db
      .query('sync')
      .withIndex('by_key', q => q.eq('key', 'stortinget_sync'))
      .unique();
    return {
      status: row?.status ?? 'idle',
      message: row?.message,
      lastFinishedAt: row?.lastFinishedAt ?? 0,
    };
  },
});
