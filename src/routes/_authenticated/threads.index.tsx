import { convexQuery, useConvexAction, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FormEvent, useState } from "react";

import { api } from "../../../convex/_generated/api";
import { ThreadsWorkspace, threadTitleFallback } from "../../components/threads-workspace";

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
  const { data: threads, isPending: isThreadsPending } = useQuery({
    ...convexQuery(api.chat.listThreads),
    placeholderData: [],
  });

  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isStartingThread = createThreadMutation.isPending;

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
    <ThreadsWorkspace
      mode="landing"
      headerTitle="Deep Stortinget Chat"
      headerDescription="A fresh shadcn workspace for starting and managing parliamentary chat threads."
      composerPlaceholder="Ask something to start a new chat…"
      threads={threads ?? []}
      activeThreadId={null}
      messages={[]}
      prompt={prompt}
      error={error}
      isThreadsLoading={isThreadsPending}
      isMessagesLoading={false}
      isCreatingThread={createThreadMutation.isPending}
      isSending={isStartingThread}
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
      onPromptChange={setPrompt}
      onSubmit={onSubmit}
    />
  );
}
