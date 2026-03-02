import { convexQuery, useConvexAction, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FormEvent, useMemo, useState } from "react";

import { api } from "../../../convex/_generated/api";
import {
  ChatHeader,
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

  async function onRenameThread(threadId: string, title: string) {
    if (renameThreadMutation.isPending) {
      return;
    }

    setError(null);
    try {
      await renameThreadMutation.mutateAsync({ threadId, title });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to rename thread.");
      throw err;
    }
  }

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-[1120px] grid-cols-1 gap-3.5 px-4 py-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <ThreadsSidebar
        threads={threads ?? []}
        activeThreadId={null}
        isCreatingThread={createThreadMutation.isPending}
        deletingThreadId={
          deleteThreadMutation.isPending ? (deleteThreadMutation.variables?.threadId ?? null) : null
        }
        renamingThreadId={
          renameThreadMutation.isPending ? (renameThreadMutation.variables?.threadId ?? null) : null
        }
        onCreateThread={onCreateThread}
        onSelectThread={(threadId) =>
          void navigate({ to: "/threads/$threadId", params: { threadId } })
        }
        onDeleteThread={onDeleteThread}
        onRenameThread={onRenameThread}
      />
      <section className="grid min-h-0 grid-rows-[auto_1fr_auto] gap-3 rounded-2xl border border-line/90 bg-paper/85 p-3 backdrop-blur-sm">
        <ChatHeader />
        <MessagesPane
          messages={undefined}
          emptyState={
            <div className="mr-auto max-w-[min(78ch,92%)] rounded-xl border border-[#b6d4ca] bg-[#eff6f3] px-3.5 py-3 text-[0.98rem] leading-relaxed max-sm:max-w-full">
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
