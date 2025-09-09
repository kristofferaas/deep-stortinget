import { WorkflowManager } from '@convex-dev/workflow';
import { components, internal } from '../_generated/api';
import { internalAction } from '../_generated/server';

export const workflow = new WorkflowManager(components.workflow);

export const startWorkflow = internalAction({
  handler: async ctx => {
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
        break;
      }
    } finally {
      await workflow.cleanup(ctx, workflowId);
    }
  },
});

export const syncStortingetWorkflow = workflow.define({
  handler: async (step): Promise<string> => {
    // Sync cases from data.stortinget.no to database

    // 1st step: Get cases from data.stortinget.no
    const cases = await step.runAction(internal.sync.cases.syncCases, {});

    // Sync votes for each case
    for (const caseId of cases.syncedCases) {
      console.log(`Syncing votes for case ${caseId}`);
      const result = await step.runAction(
        internal.sync.votes.syncVotesForCase,
        {
          caseId,
        }
      );
      console.log(
        `Inserted ${result.insertedVotes.length} votes for case ${caseId}`
      );
    }

    return 'Synced cases from data.stortinget.no to database';
  },
});
