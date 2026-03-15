import { useConvexAction } from "@convex-dev/react-query";
import { IconArrowUp, IconMessageCirclePlus } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FormEvent, useState } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "~/components/ui/breadcrumb";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { Textarea } from "~/components/ui/textarea";

import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/_authenticated/threads/")({
  component: ThreadsIndexPage,
});

function ThreadsIndexPage() {
  const navigate = useNavigate();
  const createThreadFromMessageFn = useConvexAction(api.chat.createThread);
  const createThreadFromMessageMutation = useMutation({
    mutationFn: createThreadFromMessageFn,
  });

  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isSubmitting = createThreadFromMessageMutation.isPending;
  const canSubmit = prompt.trim().length > 0 && !isSubmitting;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setError(null);

    try {
      const { threadId } = await createThreadFromMessageMutation.mutateAsync({
        prompt: prompt.trim(),
      });

      await navigate({
        to: "/threads/$threadId",
        params: { threadId },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start a new thread.");
    }
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>New Thread</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center p-4 pt-0">
        <Card className="w-full max-w-3xl shadow-sm">
          <CardHeader className="gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl border bg-muted/40">
              <IconMessageCirclePlus className="size-6" />
            </div>
            <div className="space-y-1">
              <CardTitle>Start a thread with the first message</CardTitle>
              <CardDescription>
                Nothing is created until you send. The backend will create the thread, run the
                agent, and then redirect you to the saved conversation.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <Textarea
                id="thread-prompt"
                rows={8}
                placeholder="Ask something about the Storting, a debate, or a representative..."
                value={prompt}
                aria-invalid={error ? true : undefined}
                disabled={isSubmitting}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">Press Cmd/Ctrl + Enter to send.</p>
                  {error ? <p className="text-destructive">{error}</p> : null}
                </div>
                <Button type="submit" disabled={!canSubmit}>
                  <IconArrowUp data-icon="inline-start" />
                  {isSubmitting ? "Starting..." : "Start thread"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
