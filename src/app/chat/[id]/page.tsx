"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AsciiSpinner from "@/app/ascii-spinner";
import Link from "next/link";

export default function ChatPage() {
  const params = useParams();
  const threadId = params.id as Id<"chatThreads">;

  const thread = useQuery(api.chat.getThread, { threadId });
  const messages = useQuery(api.chat.getMessages, { threadId });
  const addMessage = useMutation(api.chat.addMessage);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const messageText = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      await addMessage({
        threadId,
        content: messageText,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (thread === undefined || messages === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AsciiSpinner />
      </div>
    );
  }

  if (thread === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Thread not found</p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/">
                <Button variant="ghost" size="sm">
                  ← Back
                </Button>
              </Link>
            </div>
            <h1 className="text-lg font-semibold truncate flex-1 text-center">
              {thread.title || "New Chat"}
            </h1>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message._id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <Card
                  className={`max-w-[80%] p-4 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <div className="text-sm font-medium mb-1">
                    {message.role === "user" ? "You" : "Assistant"}
                  </div>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </Card>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? "Sending..." : "Send"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
