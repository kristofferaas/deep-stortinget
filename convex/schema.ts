import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  cases: defineTable({
    slug: v.string(),
    title: v.string(),
    status: v.optional(v.string()),
    session: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_updatedAt", ["updatedAt"]),
  hearings: defineTable({
    slug: v.string(),
    title: v.string(),
    status: v.optional(v.string()),
    session: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_updatedAt", ["updatedAt"]),
});
