import { useThreadMessages } from "@convex-dev/agent/react";
import { convexQuery, useConvexAction, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FormEvent, useEffect, useRef, useState } from "react";

import { api } from "../../../convex/_generated/api";
import {
  normalizeMessageRole,
  ThreadsWorkspace,
  threadTitleFallback,
} from "../../components/threads-workspace";

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
  const { data: threads, isPending: isThreadsPending } = useQuery({
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

  const displayedMessages = messages
    .map((message) => ({
      id: message._id,
      role: normalizeMessageRole(message.message?.role),
      text: extractMessageText(message),
    }))
    .filter((message) => message.text.length > 0);

  const isSending = sendMessageMutation.isPending;
  const isCreatingThread = createThreadMutation.isPending;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [displayedMessages, threadId]);

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
    <ThreadsWorkspace
      mode="thread"
      headerTitle={threadRecord?.title ?? "Deep Stortinget Chat"}
      headerDescription="A fully rebuilt shadcn conversation workspace streaming from the active Convex thread."
      composerPlaceholder="Ask something…"
      threads={safeThreads}
      activeThreadId={threadId}
      messages={displayedMessages}
      prompt={prompt}
      error={error}
      isThreadsLoading={isThreadsPending}
      isMessagesLoading={isThreadRecordPending && displayedMessages.length === 0}
      isCreatingThread={isCreatingThread}
      isSending={isSending}
      deletingThreadId={
        deleteThreadMutation.isPending ? (deleteThreadMutation.variables?.threadId ?? null) : null
      }
      renamingThreadId={
        renameThreadMutation.isPending ? (renameThreadMutation.variables?.threadId ?? null) : null
      }
      bottomRef={bottomRef}
      onCreateThread={onCreateThread}
      onSelectThread={(nextThreadId) =>
        void navigate({ to: "/threads/$threadId", params: { threadId: nextThreadId } })
      }
      onDeleteThread={onDeleteThread}
      onRenameThread={onRenameThread}
      onPromptChange={setPrompt}
      onSubmit={onSubmit}
    />
  );
}
