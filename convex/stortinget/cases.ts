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
    // Select the best index based on filters (Convex best practice: index before pagination)
    // For optimal performance, we use indexes with .eq() for single selections
    // Multiple selections require .filter() which is less efficient but necessary

    const singleType = args.types?.length === 1 ? args.types[0] : null;
    const singleStatus = args.statuses?.length === 1 ? args.statuses[0] : null;
    const hasMultipleTypes = args.types && args.types.length > 1;
    const hasMultipleStatuses = args.statuses && args.statuses.length > 1;

    let result;

    // Optimal case: Single type + single status
    if (singleType && singleStatus) {
      result = await ctx.db
        .query("cases")
        .withIndex("by_type_and_status_and_last_updated_date", (q) =>
          q.eq("type", singleType).eq("status", singleStatus),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }
    // Optimal case: Single type only
    else if (singleType && !args.statuses) {
      result = await ctx.db
        .query("cases")
        .withIndex("by_type_and_last_updated_date", (q) =>
          q.eq("type", singleType),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }
    // Optimal case: Single status only
    else if (singleStatus && !args.types) {
      result = await ctx.db
        .query("cases")
        .withIndex("by_status_and_last_updated_date", (q) =>
          q.eq("status", singleStatus),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }
    // Sub-optimal case: Multiple selections or mixed filters
    // Note: Using .filter() after index is less efficient for pagination
    // but necessary to support OR conditions with multiple values
    else if (singleType && hasMultipleStatuses) {
      // Use type index, filter statuses in memory
      result = await ctx.db
        .query("cases")
        .withIndex("by_type_and_last_updated_date", (q) =>
          q.eq("type", singleType),
        )
        .order("desc")
        .filter((q) => {
          const conditions = args.statuses!.map((status) =>
            q.eq(q.field("status"), status),
          );
          return conditions.reduce((acc, curr) => q.or(acc, curr));
        })
        .paginate(args.paginationOpts);
    }
    else if (singleStatus && hasMultipleTypes) {
      // Use status index, filter types in memory
      result = await ctx.db
        .query("cases")
        .withIndex("by_status_and_last_updated_date", (q) =>
          q.eq("status", singleStatus),
        )
        .order("desc")
        .filter((q) => {
          const conditions = args.types!.map((type) =>
            q.eq(q.field("type"), type),
          );
          return conditions.reduce((acc, curr) => q.or(acc, curr));
        })
        .paginate(args.paginationOpts);
    }
    // No filters or complex multi-value filters
    else {
      let query = ctx.db
        .query("cases")
        .withIndex("by_last_updated_date")
        .order("desc");

      // Apply filters if present
      if (args.types || args.statuses) {
        query = query.filter((q) => {
          const conditions = [];

          if (args.types && args.types.length > 0) {
            const typeConditions = args.types.map((type) =>
              q.eq(q.field("type"), type),
            );
            conditions.push(
              typeConditions.reduce((acc, curr) => q.or(acc, curr)),
            );
          }

          if (args.statuses && args.statuses.length > 0) {
            const statusConditions = args.statuses.map((status) =>
              q.eq(q.field("status"), status),
            );
            conditions.push(
              statusConditions.reduce((acc, curr) => q.or(acc, curr)),
            );
          }

          return conditions.reduce((acc, curr) => q.and(acc, curr));
        });
      }

      result = await query.paginate(args.paginationOpts);
    }

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
