import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { vWorkflowId } from "@convex-dev/workflow";
import {
  caseValidator,
  hearingValidator,
  partyValidator,
  voteProposalValidator,
  voteValidator,
} from "./sync/validators";

export default defineSchema({
  hearings: defineTable(hearingValidator).index("by_hearing_id", ["id"]),
  cases: defineTable(caseValidator)
    .index("by_case_id", ["id"])
    .index("by_last_updated_date", ["sist_oppdatert_dato"]),
  votes: defineTable(voteValidator)
    .index("by_vote_id", ["votering_id"])
    .index("by_case_id", ["sak_id"]),
  voteProposals: defineTable(voteProposalValidator)
    .index("by_vote_proposal_id", ["forslag_id"])
    .index("by_vote_id", ["votering_id"]),
  parties: defineTable(partyValidator).index("by_party_id", ["id"]),
  // Sync runs history
  syncRuns: defineTable({
    workflowId: vWorkflowId,
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    message: v.optional(v.string()),
    status: v.union(
      v.literal("started"),
      v.literal("success"),
      v.literal("failed"),
      v.literal("canceled"),
    ),
    partiesCount: v.optional(v.number()),
    casesCount: v.optional(v.number()),
    votesCount: v.optional(v.number()),
    voteProposalsCount: v.optional(v.number()),
    partiesSkipped: v.optional(v.number()),
    casesSkipped: v.optional(v.number()),
    votesSkipped: v.optional(v.number()),
    voteProposalsSkipped: v.optional(v.number()),
  })
    .index("by_workflowId", ["workflowId"])
    .index("by_status", ["status"])
    .index("by_startedAt", ["startedAt"]),
  // Sync settings (e.g., nightly_sync_enabled toggle)
  syncSettings: defineTable({
    key: v.string(),
    value: v.union(v.boolean(), v.number()),
  }).index("by_key", ["key"]),
  // Sync cache for tracking external data and avoiding redundant updates
  syncCache: defineTable({
    checksum: v.string(), // SHA256 hash of the data
    table: v.string(), // Table name (e.g., "cases", "votes", "parties")
    externalId: v.union(v.string(), v.number()), // External ID from Stortinget API (string for parties, number for others)
    internalId: v.union(
      v.id("cases"),
      v.id("votes"),
      v.id("voteProposals"),
      v.id("parties"),
    ), // Convex _id reference to avoid lookups
  }).index("by_table_and_external_id", ["table", "externalId"]),
});
