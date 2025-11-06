import { cronJobs } from "convex/server";

const crons = cronJobs();

// Static crons have been moved to runtime crons.
// The nightly sync can now be toggled on/off via the sync settings page.
// See convex/sync/settings.ts for the runtime cron management.

export default crons;
