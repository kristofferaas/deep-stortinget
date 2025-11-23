import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Run the Stortinget sync workflow every day at 03:00 UTC.
crons.cron(
  "stortinget daily sync",
  "0 3 * * *",
  api.sync.workflow.startWorkflow,
  {},
);

export default crons;
