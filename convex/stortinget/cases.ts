import { v } from "convex/values";
import { query } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { caseValidator, voteValidator } from "../sync/validators";

export const paginatedCases = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
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
    // When search is provided, use full-text search index
    if (args.search) {
      // Parse offset from cursor (for search pagination)
      const offset = args.paginationOpts.cursor
        ? parseInt(args.paginationOpts.cursor, 10)
        : 0;

      // Search in both title fields and combine results
      // Fetch more than needed to account for deduplication and filtering
      const searchTitleResults = await ctx.db
        .query("cases")
        .withSearchIndex("search_title", (q) => {
          let searchQuery = q.search("tittel", args.search!);

          // Apply single filter values using .eq() if only one selected
          if (args.types && args.types.length === 1) {
            searchQuery = searchQuery.eq("type", args.types[0]);
          }
          if (args.statuses && args.statuses.length === 1) {
            searchQuery = searchQuery.eq("status", args.statuses[0]);
          }

          return searchQuery;
        })
        .take(100);

      const searchShortTitleResults = await ctx.db
        .query("cases")
        .withSearchIndex("search_short_title", (q) => {
          let searchQuery = q.search("korttittel", args.search!);

          if (args.types && args.types.length === 1) {
            searchQuery = searchQuery.eq("type", args.types[0]);
          }
          if (args.statuses && args.statuses.length === 1) {
            searchQuery = searchQuery.eq("status", args.statuses[0]);
          }

          return searchQuery;
        })
        .take(100);

      // Combine and deduplicate results by ID
      const allResults = [...searchTitleResults, ...searchShortTitleResults];
      const uniqueResults = Array.from(
        new Map(allResults.map((doc) => [doc.id, doc])).values(),
      );

      // Apply multi-select type and status filters in memory if needed
      let filteredResults = uniqueResults;

      if (args.types && args.types.length > 1) {
        filteredResults = filteredResults.filter((doc) =>
          args.types!.includes(doc.type as any),
        );
      }

      if (args.statuses && args.statuses.length > 1) {
        filteredResults = filteredResults.filter((doc) =>
          args.statuses!.includes(doc.status as any),
        );
      }

      // Sort by last updated date descending for consistent pagination
      filteredResults.sort((a, b) =>
        b.sist_oppdatert_dato.localeCompare(a.sist_oppdatert_dato),
      );

      // Implement offset-based pagination for search results
      const pageSize = args.paginationOpts.numItems;
      const startIndex = offset;
      const endIndex = startIndex + pageSize;
      const paginatedResults = filteredResults.slice(startIndex, endIndex);
      const isDone = endIndex >= filteredResults.length;
      const nextCursor = isDone ? null : endIndex.toString();

      const votesForCases = await Promise.all(
        paginatedResults.map((doc) =>
          ctx.db
            .query("votes")
            .withIndex("by_case_id", (q) => q.eq("sak_id", doc.id))
            .collect(),
        ),
      );

      const cases = paginatedResults.map((doc, index) => ({
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
        isDone,
        continueCursor: nextCursor,
      };
    }

    // When no search, use regular index-based pagination with filters
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
