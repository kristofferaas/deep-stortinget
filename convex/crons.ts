import { cronJobs } from "convex/server";

const crons = cronJobs();

// Cron jobs are now managed dynamically via the @convex-dev/crons component.
// See convex/syncSettings.ts for the dynamic cron management.
// The nightly sync can be enabled/disabled from the UI at /sync.

export default crons;
