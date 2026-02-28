import { Agent } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

import { components } from "./_generated/api";

const openRouterApiKey = process.env.OPENROUTER_API_KEY;

if (!openRouterApiKey || openRouterApiKey === "your_openrouter_key_here") {
  throw new Error("Missing OPENROUTER_API_KEY in Convex environment.");
}

const openRouter = createOpenRouter({
  apiKey: openRouterApiKey,
});

const model = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";

export const chatAgent = new Agent(components.agent, {
  name: "Deep Stortinget Assistant",
  instructions:
    "You are a concise, factual AI assistant. Prefer direct answers and short explanations.",
  languageModel: openRouter.chat(model),
});
