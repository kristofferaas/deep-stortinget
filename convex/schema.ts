import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  caseValidator,
  hearingValidator,
  partyValidator,
  syncStatusValidator,
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
  // Sync metadata table
  sync: defineTable(syncStatusValidator).index("by_key", ["key"]),
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
