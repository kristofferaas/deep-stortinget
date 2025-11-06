"use node";

import { v } from "convex/values";
import { query, mutation, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Agent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { Id } from "./_generated/dataModel";

/**
 * Create a new chat thread with an initial user message
 */
export const createThread = mutation({
  args: {
    initialMessage: v.string(),
  },
  returns: v.id("chatThreads"),
  handler: async (ctx, args) => {
    // Create the thread
    const threadId: Id<"chatThreads"> = await ctx.db.insert("chatThreads", {
      title: args.initialMessage.slice(0, 100), // Use first 100 chars as title
    });

    // Add the initial user message
    await ctx.db.insert("chatMessages", {
      threadId,
      role: "user",
      content: args.initialMessage,
    });

    // Schedule AI response generation
    await ctx.scheduler.runAfter(0, internal.chat.generateResponse, {
      threadId,
    });

    return threadId;
  },
});

/**
 * Add a message to an existing thread
 */
export const addMessage = mutation({
  args: {
    threadId: v.id("chatThreads"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify thread exists
    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    // Add the user message
    await ctx.db.insert("chatMessages", {
      threadId: args.threadId,
      role: "user",
      content: args.content,
    });

    // Schedule AI response generation
    await ctx.scheduler.runAfter(0, internal.chat.generateResponse, {
      threadId: args.threadId,
    });

    return null;
  },
});

/**
 * Get all messages in a thread
 */
export const getMessages = query({
  args: {
    threadId: v.id("chatThreads"),
  },
  returns: v.array(
    v.object({
      _id: v.id("chatMessages"),
      _creationTime: v.number(),
      threadId: v.id("chatThreads"),
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
      .collect();

    return messages;
  },
});

/**
 * Get thread information
 */
export const getThread = query({
  args: {
    threadId: v.id("chatThreads"),
  },
  returns: v.union(
    v.object({
      _id: v.id("chatThreads"),
      _creationTime: v.number(),
      title: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    return thread;
  },
});

/**
 * Generate AI response for a thread (internal action)
 */
export const generateResponse = action({
  args: {
    threadId: v.id("chatThreads"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Load conversation context
    const messages = await ctx.runQuery(internal.chat.getMessages, {
      threadId: args.threadId,
    });

    // Convert to OpenAI format
    const openaiMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Create chat completion
    const model = openai("gpt-4o-mini");
    const response = await model.doGenerate({
      inputFormat: "messages",
      mode: {
        type: "regular" as const,
      },
      prompt: [
        {
          role: "system",
          content:
            "You are a helpful assistant for Deep Stortinget, a platform for exploring Norwegian parliamentary data. Help users understand cases, votes, and parliamentary proceedings. Be concise and informative.",
        },
        ...openaiMessages,
      ],
    });

    // Extract the text content
    let content = "";
    for (const part of response.response.messages[0].content) {
      if (part.type === "text") {
        content += part.text;
      }
    }

    // Save assistant response
    await ctx.runMutation(internal.chat.saveAssistantMessage, {
      threadId: args.threadId,
      content,
    });

    return null;
  },
});

/**
 * Save assistant message (internal mutation)
 */
export const saveAssistantMessage = internalMutation({
  args: {
    threadId: v.id("chatThreads"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("chatMessages", {
      threadId: args.threadId,
      role: "assistant",
      content: args.content,
    });

    return null;
  },
});
