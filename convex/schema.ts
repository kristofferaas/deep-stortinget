import { defineSchema, defineTable } from "convex/server";
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
});
