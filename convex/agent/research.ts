import { Agent, createTool } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

import { components, api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

const openRouterApiKey = process.env.OPENROUTER_API_KEY;

if (!openRouterApiKey || openRouterApiKey === "your_openrouter_key_here") {
  throw new Error("Missing OPENROUTER_API_KEY in Convex environment.");
}

const openRouter = createOpenRouter({
  apiKey: openRouterApiKey,
});

const getPeriodsTool = createTool({
  description: "Search the database for all Stortings periods",
  inputSchema: z.object({}).optional(),
  execute: async (
    ctx,
  ): Promise<
    {
      id: Id<"periods">;
      periodId: string;
      startDate: number;
      endDate: number;
      isCurrent: boolean;
      sourceResponseAt: number | undefined;
      sourceVersion: string | undefined;
      lastSyncedAt: number;
    }[]
  > => {
    // ctx has agent, userId, threadId, messageId
    // as well as ActionCtx properties like auth, storage, runMutation, and runAction
    return await ctx.runQuery(api.stortinget.periods.getPeriods);
  },
});

const model = "openai/gpt-oss-120b";

export const researchAgent = new Agent(components.agent, {
  name: "Research Agent",
  instructions: [
    "You are a concise, factual AI research assistant for the Norwegian parliment (Stortinget).",
    "Prefer direct answers and short explanations.",
  ].join("\n"),
  languageModel: openRouter.chat(model),
  tools: {
    getPeriodsTool,
  },
  maxSteps: 20,
});
