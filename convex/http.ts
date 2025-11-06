"use node";

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, UIMessage } from "ai";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

/**
 * Stream chat responses using Vercel AI SDK
 */
http.route({
  path: "/chat",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = await req.json();
      const { messages, threadId } = body as {
        messages: UIMessage[];
        threadId?: string;
      };

      // Convert UI messages to model messages
      const modelMessages = convertToModelMessages(messages);

      // Stream the response
      const result = streamText({
        model: openai("gpt-4o-mini"),
        system:
          "You are a helpful assistant for Deep Stortinget, a platform for exploring Norwegian parliamentary data. Help users understand cases, votes, and parliamentary proceedings. Be concise and informative.",
        messages: modelMessages,
        async onFinish({ text }) {
          // Save the assistant's response to the database
          if (threadId) {
            await ctx.runMutation(internal.chat.saveAssistantMessage, {
              threadId: threadId as Id<"chatThreads">,
              content: text,
            });
          }
        },
      });

      return result.toDataStreamResponse();
    } catch (error) {
      console.error("Error in chat endpoint:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to process chat request",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

export default http;
