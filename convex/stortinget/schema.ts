import { defineTable } from "convex/server";
import { v } from "convex/values";

export const periodsTable = defineTable({
  periodId: v.string(),
  startDate: v.number(),
  endDate: v.number(),
  isCurrent: v.boolean(),
  sourceResponseAt: v.optional(v.number()),
  sourceVersion: v.optional(v.string()),
  lastSyncedAt: v.number(),
})
  .index("by_periodId", ["periodId"])
  .index("by_startDate", ["startDate"])
  .index("by_isCurrent", ["isCurrent"]);
