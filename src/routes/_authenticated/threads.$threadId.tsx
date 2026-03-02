import { useThreadMessages } from "@convex-dev/agent/react";
import { convexQuery, useConvexAction, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { api } from "../../../convex/_generated/api";
import {
  ChatHeader,
  Composer,
  MessagesPane,
  ThreadsSidebar,
  threadTitleFallback,
} from "../../components/thread-chat-layout";

export const Route = createFileRoute("/_authenticated/threads/$threadId")({
  component: ThreadPage,
});

function extractMessageText(message: unknown): string {
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

function ThreadPage() {
  const navigate = useNavigate();
  const { threadId } = Route.useParams();

  const createThreadFn = useConvexMutation(api.chat.createThread);
  const deleteThreadFn = useConvexMutation(api.chat.deleteThread);
  const renameThreadFn = useConvexMutation(api.chat.renameThread);
  const sendMessageFn = useConvexAction(api.chat.sendMessage);
  const createThreadMutation = useMutation({ mutationFn: createThreadFn });
  const deleteThreadMutation = useMutation({ mutationFn: deleteThreadFn });
  const renameThreadMutation = useMutation({ mutationFn: renameThreadFn });
  const sendMessageMutation = useMutation({ mutationFn: sendMessageFn });
  const { data: threads } = useQuery({
    ...convexQuery(api.chat.listThreads),
    placeholderData: [],
  });
  const { data: threadRecord, isPending: isThreadRecordPending } = useQuery(
    convexQuery(api.chat.getThread, { threadId }),
  );
  const safeThreads = threads ?? [];

  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isThreadRecordPending) {
      return;
    }

    if (threadRecord) {
      return;
    }

    if (safeThreads.length > 0) {
      void navigate({
        to: "/threads/$threadId",
        params: { threadId: safeThreads[0].id },
        replace: true,
      });
      return;
    }

    void navigate({ to: "/threads", replace: true });
  }, [isThreadRecordPending, navigate, safeThreads, threadRecord]);

  const { results: messages } = useThreadMessages(
    api.chat.listThreadMessages,
    { threadId },
    { initialNumItems: 200, stream: true },
  );

  const displayedMessages = useMemo(
    () =>
      messages
        .map((message) => {
          const text = extractMessageText(message);
          const role = message.message?.role ?? "assistant";
          return {
            id: message._id,
            role,
            text,
          };
        })
        .filter((message) => message.text.length > 0),
    [messages],
  );

  const isSending = sendMessageMutation.isPending;
  const isCreatingThread = createThreadMutation.isPending;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [displayedMessages, threadId]);

  const canSend = useMemo(
    () => Boolean(prompt.trim().length > 0 && !isSending),
    [isSending, prompt],
  );

  async function onCreateThread() {
    if (isCreatingThread) {
      return;
    }

    setError(null);
    try {
      const newThreadId = await createThreadMutation.mutateAsync({ title: threadTitleFallback() });
      setPrompt("");
      await navigate({ to: "/threads/$threadId", params: { threadId: newThreadId } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create thread.");
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim() || isSending) {
      return;
    }

    const message = prompt.trim();
    setPrompt("");
    setError(null);
    try {
      await sendMessageMutation.mutateAsync({ threadId, prompt: message });
    } catch (err: unknown) {
      setPrompt(message);
      setError(err instanceof Error ? err.message : "Failed to send message.");
    }
  }

  async function onDeleteThread(targetThreadId: string) {
    if (deleteThreadMutation.isPending) {
      return;
    }

    setError(null);
    try {
      await deleteThreadMutation.mutateAsync({ threadId: targetThreadId });

      if (targetThreadId === threadId) {
        await navigate({ to: "/threads", replace: true });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete thread.");
    }
  }

  async function onRenameThread(targetThreadId: string, title: string) {
    if (renameThreadMutation.isPending) {
      return;
    }

    setError(null);
    try {
      await renameThreadMutation.mutateAsync({ threadId: targetThreadId, title });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to rename thread.");
      throw err;
    }
  }

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-[1120px] grid-cols-1 gap-3.5 px-4 py-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <ThreadsSidebar
        threads={safeThreads}
        activeThreadId={threadId}
        isCreatingThread={isCreatingThread}
        deletingThreadId={
          deleteThreadMutation.isPending ? (deleteThreadMutation.variables?.threadId ?? null) : null
        }
        renamingThreadId={
          renameThreadMutation.isPending ? (renameThreadMutation.variables?.threadId ?? null) : null
        }
        onCreateThread={onCreateThread}
        onSelectThread={(nextThreadId) =>
          void navigate({ to: "/threads/$threadId", params: { threadId: nextThreadId } })
        }
        onDeleteThread={onDeleteThread}
        onRenameThread={onRenameThread}
      />
      <section className="grid min-h-0 grid-rows-[auto_1fr_auto] gap-3 rounded-2xl border border-line/90 bg-paper/85 p-3 backdrop-blur-sm">
        <ChatHeader />
        <MessagesPane messages={displayedMessages} bottomRef={bottomRef} />
        <Composer
          prompt={prompt}
          isSending={isSending}
          canSend={canSend}
          error={error}
          placeholder="Ask something…"
          onSubmit={onSubmit}
          onPromptChange={setPrompt}
        />
      </section>
    </main>
  );
}
