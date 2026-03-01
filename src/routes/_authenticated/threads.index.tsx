import { convexQuery, useConvexAction, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FormEvent, useMemo, useState } from "react";

import { api } from "../../../convex/_generated/api";
import {
  ChatHeader,
  ChatStyles,
  Composer,
  MessagesPane,
  ThreadsSidebar,
  threadTitleFallback,
} from "../../components/thread-chat-layout";

export const Route = createFileRoute("/_authenticated/threads/")({
  component: ThreadsIndexPage,
});

function ThreadsIndexPage() {
  const navigate = useNavigate();
  const createThreadFn = useConvexMutation(api.chat.createThread);
  const deleteThreadFn = useConvexMutation(api.chat.deleteThread);
  const sendMessageFn = useConvexAction(api.chat.sendMessage);

  const createThreadMutation = useMutation({ mutationFn: createThreadFn });
  const deleteThreadMutation = useMutation({ mutationFn: deleteThreadFn });
  const sendMessageMutation = useMutation({ mutationFn: sendMessageFn });
  const { data: threads } = useQuery({
    ...convexQuery(api.chat.listThreads),
    placeholderData: [],
  });

  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isStartingThread = createThreadMutation.isPending;

  const canSend = useMemo(
    () => Boolean(prompt.trim().length > 0 && !isStartingThread),
    [isStartingThread, prompt],
  );

  async function onCreateThread() {
    if (createThreadMutation.isPending) {
      return;
    }

    setError(null);
    try {
      const newThreadId = await createThreadMutation.mutateAsync({ title: threadTitleFallback() });
      await navigate({ to: "/threads/$threadId", params: { threadId: newThreadId } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create thread.");
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim() || isStartingThread) {
      return;
    }

    const message = prompt.trim();
    setPrompt("");
    setError(null);

    try {
      const threadId = await createThreadMutation.mutateAsync({ title: threadTitleFallback() });
      await navigate({ to: "/threads/$threadId", params: { threadId } });

      void sendMessageMutation
        .mutateAsync({ threadId, prompt: message })
        .catch((sendError: unknown) => {
          console.error("Failed to send initial message:", sendError);
        });
    } catch (err: unknown) {
      setPrompt(message);
      setError(err instanceof Error ? err.message : "Failed to start a new thread.");
    }
  }

  async function onDeleteThread(threadId: string) {
    if (deleteThreadMutation.isPending) {
      return;
    }
    setError(null);
    try {
      await deleteThreadMutation.mutateAsync({ threadId });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete thread.");
    }
  }

  return (
    <main className="chat-shell">
      <ChatStyles />
      <ThreadsSidebar
        threads={threads ?? []}
        activeThreadId={null}
        isCreatingThread={createThreadMutation.isPending}
        deletingThreadId={
          deleteThreadMutation.isPending ? (deleteThreadMutation.variables?.threadId ?? null) : null
        }
        onCreateThread={onCreateThread}
        onSelectThread={(threadId) =>
          void navigate({ to: "/threads/$threadId", params: { threadId } })
        }
        onDeleteThread={onDeleteThread}
      />
      <section className="chat-main">
        <ChatHeader />
        <MessagesPane
          messages={undefined}
          emptyState={
            <div className="message assistant">
              Ask your first question to create a new chat thread.
            </div>
          }
        />
        <Composer
          prompt={prompt}
          isSending={isStartingThread}
          canSend={canSend}
          error={error}
          placeholder="Ask something to start a new chat…"
          onSubmit={onSubmit}
          onPromptChange={setPrompt}
        />
      </section>
    </main>
  );
}
