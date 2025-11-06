import { v } from "convex/values";
import { query } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { caseValidator, voteValidator } from "../sync/validators";

export const paginatedCases = query({
  args: {
    paginationOpts: paginationOptsValidator,
    types: v.optional(
      v.array(
        v.union(
          v.literal("budsjett"),
          v.literal("lovsak"),
          v.literal("alminneligsak"),
        ),
      ),
    ),
    statuses: v.optional(
      v.array(
        v.union(
          v.literal("varslet"),
          v.literal("mottatt"),
          v.literal("til_behandling"),
          v.literal("behandlet"),
          v.literal("trukket"),
          v.literal("bortfalt"),
        ),
      ),
    ),
  },
  returns: v.object({
    page: v.array(
      v.object({
        id: v.number(),
        type: v.string(),
        tittel: v.string(),
        korttittel: v.string(),
        status: v.string(),
        dokumentgruppe: v.string(),
        sist_oppdatert_dato: v.string(),
        sak_fremmet_id: v.number(),
        henvisning: v.optional(v.string()),
        votes: v.number(),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    // Use index-based pagination with type and status filters
    let query = ctx.db
      .query("cases")
      .withIndex("by_last_updated_date")
      .order("desc");

    // Apply type and status filters using Convex filter
    if (args.types || args.statuses) {
      query = query.filter((q) => {
        let conditions = [];

        // Type filter
        if (args.types && args.types.length > 0) {
          const typeConditions = args.types.map((type) =>
            q.eq(q.field("type"), type),
          );
          conditions.push(
            typeConditions.reduce((acc, curr) => q.or(acc, curr)),
          );
        }

        // Status filter
        if (args.statuses && args.statuses.length > 0) {
          const statusConditions = args.statuses.map((status) =>
            q.eq(q.field("status"), status),
          );
          conditions.push(
            statusConditions.reduce((acc, curr) => q.or(acc, curr)),
          );
        }

        return conditions.length > 0
          ? conditions.reduce((acc, curr) => q.and(acc, curr))
          : q.eq(true, true);
      });
    }

    const result = await query.paginate(args.paginationOpts);

    const votesForCases = await Promise.all(
      result.page.map((doc) =>
        ctx.db
          .query("votes")
          .withIndex("by_case_id", (q) => q.eq("sak_id", doc.id))
          .collect(),
      ),
    );

    const cases = result.page.map((doc, index) => ({
      id: doc.id,
      type: doc.type,
      tittel: doc.tittel,
      korttittel: doc.korttittel,
      status: doc.status,
      dokumentgruppe: doc.dokumentgruppe,
      sist_oppdatert_dato: doc.sist_oppdatert_dato,
      sak_fremmet_id: doc.sak_fremmet_id,
      henvisning: doc.henvisning,
      votes: votesForCases[index]?.length ?? 0,
    }));

    return {
      page: cases,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const getCaseById = query({
  args: { id: v.number() },
  returns: v.union(
    v.object({
      case: caseValidator,
      votes: v.array(voteValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("cases")
      .withIndex("by_case_id", (q) => q.eq("id", args.id))
      .unique();

    if (!doc) return null;

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_case_id", (q) => q.eq("sak_id", args.id))
      .collect();

    const serializedCase = {
      id: doc.id,
      type: doc.type,
      tittel: doc.tittel,
      korttittel: doc.korttittel,
      status: doc.status,
      dokumentgruppe: doc.dokumentgruppe,
      sist_oppdatert_dato: doc.sist_oppdatert_dato,
      sak_fremmet_id: doc.sak_fremmet_id,
      henvisning: doc.henvisning,
    };

    const serializedVotes = votes.map((v) => ({
      sak_id: v.sak_id,
      vedtatt: v.vedtatt,
      votering_id: v.votering_id,
      votering_resultat_type: v.votering_resultat_type,
      votering_resultat_type_tekst: v.votering_resultat_type_tekst,
      votering_tema: v.votering_tema,
      votering_tid: v.votering_tid,
    }));

    return {
      case: serializedCase,
      votes: serializedVotes,
    };
  },
});
