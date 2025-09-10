import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Run the Stortinget sync workflow every day at 03:00 UTC.
crons.cron(
  'stortinget daily sync',
  '0 3 * * *',
  internal.sync.workflow.startWorkflow,
  {}
);

export default crons;
