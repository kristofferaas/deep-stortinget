import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useEffect, useRef } from "react";

import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/")({
  component: IndexRoute,
});

function IndexRoute() {
  return (
    <Suspense fallback={<main>Loading…</main>}>
      <ThreadBootstrapRedirect />
    </Suspense>
  );
}

function threadTitleFallback(): string {
  return `Chat ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date())}`;
}

function ThreadBootstrapRedirect() {
  const navigate = useNavigate();
  const createThreadFn = useConvexMutation(api.chat.createThread);
  const createThreadMutation = useMutation({ mutationFn: createThreadFn });
  const { data: threads } = useSuspenseQuery(convexQuery(api.chat.listThreads));
  const hasAttemptedCreate = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const localKey = "deep-stortinget-thread-id";
    const storedThreadId = window.localStorage.getItem(localKey);

    if (storedThreadId && threads.some((thread) => thread.id === storedThreadId)) {
      void navigate({
        to: "/threads/$threadId",
        params: { threadId: storedThreadId },
        replace: true,
      });
      return;
    }

    if (threads.length > 0) {
      void navigate({
        to: "/threads/$threadId",
        params: { threadId: threads[0].id },
        replace: true,
      });
      return;
    }

    if (hasAttemptedCreate.current) {
      return;
    }

    hasAttemptedCreate.current = true;
    createThreadMutation
      .mutateAsync({ title: threadTitleFallback() })
      .then((threadId) => {
        void navigate({ to: "/threads/$threadId", params: { threadId }, replace: true });
      })
      .catch(() => {
        hasAttemptedCreate.current = false;
      });
  }, [createThreadMutation, navigate, threads]);

  return <main>Loading…</main>;
}
