import { vStreamArgs, vStreamMessagesReturnValue } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { components, internal } from "./_generated/api";
import { action, internalAction, mutation, query, type ActionCtx } from "./_generated/server";
import { chatAgent } from "./agent";

function extractText(message: unknown): string {
  if (!message || typeof message !== "object") {
    return "";
  }

  const doc = message as {
    text?: string;
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
      role?: string;
    };
  };

  if (typeof doc.text === "string" && doc.text.length > 0) {
    return doc.text;
  }

  if (typeof doc.message?.content === "string") {
    return doc.message.content;
  }

  if (Array.isArray(doc.message?.content)) {
    return doc.message.content
      .filter((part) => part?.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("\n")
      .trim();
  }

  return "";
}

function buildThreadTitle(prompt: string): string {
  const normalized = prompt.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "New chat";
  }

  if (normalized.length <= 80) {
    return normalized;
  }

  return `${normalized.slice(0, 77).trimEnd()}...`;
}

async function streamPromptToThread(
  ctx: ActionCtx,
  args: {
    prompt: string;
    threadId: string;
  },
) {
  const prompt = args.prompt.trim();
  if (!prompt) {
    return null;
  }

  const { thread } = await chatAgent.continueThread(ctx, {
    threadId: args.threadId,
  });

  await thread.streamText(
    {
      messages: [{ role: "user", content: prompt }],
    },
    { saveStreamDeltas: true },
  );

  return null;
}

export const listThreads = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      title: v.string(),
      summary: v.optional(v.string()),
      createdAt: v.number(),
      status: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const page = await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
      paginationOpts: { cursor: null, numItems: 200 },
      order: "desc",
    });

    return page.page.map((thread) => ({
      id: thread._id,
      title: thread.title ?? "Untitled chat",
      summary: thread.summary,
      createdAt: thread._creationTime,
      status: thread.status,
    }));
  },
});

export const getThread = query({
  args: { threadId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      id: v.string(),
      title: v.string(),
      summary: v.optional(v.string()),
      createdAt: v.number(),
      status: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });

    if (!thread) {
      return null;
    }

    return {
      id: thread._id,
      title: thread.title ?? "Untitled chat",
      summary: thread.summary,
      createdAt: thread._creationTime,
      status: thread.status,
    };
  },
});

export const listMessages = query({
  args: { threadId: v.string() },
  returns: v.array(
    v.object({
      id: v.string(),
      role: v.string(),
      text: v.string(),
      status: v.string(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const page = await chatAgent.listMessages(ctx, {
      threadId: args.threadId,
      paginationOpts: { cursor: null, numItems: 200 },
      excludeToolMessages: true,
    });

    return page.page
      .map((msg) => ({
        id: msg._id,
        role: msg.message?.role ?? "assistant",
        text: extractText(msg),
        status: msg.status,
        createdAt: msg._creationTime,
      }))
      .filter((msg) => msg.text.length > 0)
      .sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  returns: vStreamMessagesReturnValue,
  handler: async (ctx, args) => {
    const paginated = await chatAgent.listMessages(ctx, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
      excludeToolMessages: true,
      statuses: ["success", "failed", "pending"],
    });
    const streams = await chatAgent.syncStreams(ctx, {
      threadId: args.threadId,
      streamArgs: args.streamArgs,
    });

    return { ...paginated, streams };
  },
});

export const sendMessage = action({
  args: {
    threadId: v.string(),
    prompt: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await streamPromptToThread(ctx, args);
  },
});

export const createThread = action({
  args: {
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const prompt = args.prompt.trim();
    if (!prompt) {
      throw new Error("Message cannot be empty.");
    }

    const { threadId } = await chatAgent.createThread(ctx, {
      title: buildThreadTitle(prompt),
    });

    void ctx.runAction(internal.chat.startAgent, {
      threadId,
      prompt: args.prompt,
    });

    await ctx.scheduler.runAfter(0, internal.chat.startAgent, { threadId, prompt: args.prompt });

    return { threadId };
  },
});

export const startAgent = internalAction({
  args: {
    threadId: v.string(),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const prompt = args.prompt.trim();
    if (!prompt) {
      throw new Error("Message cannot be empty.");
    }

    await chatAgent.generateText(ctx, { threadId: args.threadId }, { prompt: args.prompt });
  },
});

export const renameThread = mutation({
  args: {
    threadId: v.string(),
    title: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const title = args.title.trim();
    if (!title) {
      throw new Error("Thread title cannot be empty.");
    }

    await ctx.runMutation(components.agent.threads.updateThread, {
      threadId: args.threadId,
      patch: { title },
    });

    return null;
  },
});

export const deleteThread = mutation({
  args: {
    threadId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await chatAgent.deleteThreadAsync(ctx, {
      threadId: args.threadId,
    });
    return null;
  },
});
