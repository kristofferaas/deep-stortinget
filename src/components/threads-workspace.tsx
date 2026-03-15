import {
  IconArrowUp,
  IconDots,
  IconMessageCirclePlus,
  IconMessages,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { FormEvent, RefObject, useEffect, useMemo, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";
import { SidebarTrigger } from "./ui/sidebar";

export type ThreadListItem = {
  id: string;
  title: string;
  createdAt: number;
};

export type MessageListItem = {
  id: string;
  role: "user" | "assistant" | "tool" | "system";
  text: string;
};

type ThreadsWorkspaceProps = {
  mode: "landing" | "thread";
  headerTitle: string;
  headerDescription: string;
  composerPlaceholder: string;
  threads: ThreadListItem[];
  activeThreadId: string | null;
  messages: MessageListItem[];
  prompt: string;
  error: string | null;
  isThreadsLoading: boolean;
  isMessagesLoading: boolean;
  isCreatingThread: boolean;
  isSending: boolean;
  deletingThreadId: string | null;
  renamingThreadId: string | null;
  bottomRef?: RefObject<HTMLDivElement | null>;
  onCreateThread: () => void;
  onDeleteThread: (threadId: string) => Promise<void> | void;
  onPromptChange: (value: string) => void;
  onRenameThread: (threadId: string, title: string) => Promise<void>;
  onSelectThread: (threadId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function threadTitleFallback(): string {
  return `Chat ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date())}`;
}

export function normalizeMessageRole(role?: string): MessageListItem["role"] {
  switch (role) {
    case "user":
    case "assistant":
    case "tool":
    case "system":
      return role;
    default:
      return "assistant";
  }
}

function getMessageMeta(role: MessageListItem["role"]) {
  switch (role) {
    case "user":
      return {
        label: "You",
      };
    case "assistant":
      return {
        label: "Deep Stortinget",
      };
    case "tool":
      return {
        label: "Tool",
      };
    case "system":
      return {
        label: "System",
      };
  }
}

export function ThreadsWorkspace({
  mode,
  composerPlaceholder,
  threads,
  activeThreadId,
  messages,
  prompt,
  error,
  isMessagesLoading,
  isCreatingThread,
  isSending,
  deletingThreadId,
  renamingThreadId,
  bottomRef,
  onCreateThread,
  onDeleteThread,
  onPromptChange,
  onRenameThread,
  onSubmit,
}: ThreadsWorkspaceProps) {
  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, threads],
  );
  const canSend = Boolean(prompt.trim().length > 0 && !isSending);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const isRenamingActiveThread = activeThreadId !== null && renamingThreadId === activeThreadId;
  const isDeletingActiveThread = activeThreadId !== null && deletingThreadId === activeThreadId;

  useEffect(() => {
    setRenameDraft(activeThread?.title ?? "");
  }, [activeThread?.title]);

  function startEditingTitle() {
    if (!activeThread || isRenamingActiveThread) {
      return;
    }

    setRenameDraft(activeThread.title);
    setIsEditingTitle(true);
  }

  function cancelEditingTitle() {
    setRenameDraft(activeThread?.title ?? "");
    setIsEditingTitle(false);
  }

  async function submitRename() {
    if (!activeThread) {
      return;
    }

    const nextTitle = renameDraft.trim();
    if (!nextTitle || nextTitle === activeThread.title) {
      cancelEditingTitle();
      return;
    }

    try {
      await onRenameThread(activeThread.id, nextTitle);
      setIsEditingTitle(false);
    } catch {
      // Route-level handler owns the error message.
    }
  }

  async function confirmDelete() {
    if (!activeThread) {
      return;
    }

    await onDeleteThread(activeThread.id);
    setIsDeleteDialogOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 rounded-t-[inherit] bg-background px-0">
        <div className="flex min-w-0 flex-1 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList className="min-w-0">
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/threads">Threads</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="min-w-0">
                {isEditingTitle && activeThread ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitRename();
                    }}
                  >
                    <Input
                      autoFocus
                      value={renameDraft}
                      disabled={isRenamingActiveThread}
                      className="h-8 w-[min(24rem,60vw)]"
                      onBlur={() => void submitRename()}
                      onChange={(event) => setRenameDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          event.preventDefault();
                          cancelEditingTitle();
                        }
                      }}
                    />
                  </form>
                ) : (
                  <button
                    type="button"
                    disabled={!activeThread || isRenamingActiveThread}
                    className="min-w-0 truncate text-left font-normal text-foreground outline-hidden transition-opacity hover:opacity-70 disabled:opacity-100"
                    onClick={startEditingTitle}
                  >
                    <BreadcrumbPage className="truncate">
                      {activeThread?.title ?? "New Thread"}
                    </BreadcrumbPage>
                  </button>
                )}
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {activeThread ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2 rounded-full"
                    disabled={isRenamingActiveThread || isDeletingActiveThread}
                  />
                }
              >
                <IconDots />
                <span className="sr-only">Manage thread</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-40" align="end" side="bottom">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    disabled={isRenamingActiveThread || isDeletingActiveThread}
                    onClick={startEditingTitle}
                  >
                    <IconPencil />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={isRenamingActiveThread || isDeletingActiveThread}
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <IconTrash />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </header>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex min-h-[420px] flex-col gap-3 px-4 py-4 pb-28">
          {isMessagesLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} size="sm" className="max-w-3xl bg-background/70">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-8 rounded-full" />
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                  </CardContent>
                </Card>
              ))
            : null}
          {!isMessagesLoading && messages.length > 0
            ? messages.map((message) => <MessageCard key={message.id} message={message} />)
            : null}
          {!isMessagesLoading && messages.length === 0 ? (
            <ConversationEmptyState
              mode={mode}
              onCreateThread={onCreateThread}
              isCreatingThread={isCreatingThread}
            />
          ) : null}
          {bottomRef ? <div ref={bottomRef} /> : null}
        </div>
      </ScrollArea>

      <form onSubmit={onSubmit} className="sticky bottom-0 z-10 px-4 py-4">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
          <div className="relative">
            <Textarea
              id="thread-prompt"
              rows={3}
              placeholder={composerPlaceholder}
              value={prompt}
              aria-invalid={error ? true : undefined}
              disabled={isSending}
              className="min-h-24 resize-none rounded-3xl border bg-background px-4 py-3 pr-16 pb-14 shadow-sm focus-visible:ring-0"
              onChange={(event) => onPromptChange(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!canSend}
              className="absolute right-3 bottom-3 rounded-full"
            >
              <IconArrowUp data-icon="inline-start" />
            </Button>
          </div>
          {error ? <p className="px-1 text-sm text-destructive">{error}</p> : null}
        </div>
      </form>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <IconTrash />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete thread</AlertDialogTitle>
            <AlertDialogDescription>
              {activeThread
                ? `This removes "${activeThread.title}" and its message history.`
                : "This removes the selected thread and its message history."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingActiveThread}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeletingActiveThread}
              onClick={() => void confirmDelete()}
            >
              {isDeletingActiveThread ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MessageCard({ message }: { message: MessageListItem }) {
  const isUser = message.role === "user";
  const meta = getMessageMeta(message.role);
  const bubbleClassName = isUser
    ? "ml-auto bg-primary text-primary-foreground"
    : message.role === "assistant"
      ? "mr-auto bg-secondary text-secondary-foreground"
      : "mr-auto bg-muted text-foreground";

  return (
    <div
      className={cn("flex max-w-[min(74ch,100%)] flex-col gap-1", isUser ? "ml-auto" : "mr-auto")}
    >
      <span
        className={cn(
          "px-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase",
          isUser && "text-right",
        )}
      >
        {meta.label}
      </span>
      <div
        className={cn(
          "rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
          bubbleClassName,
        )}
      >
        {message.text}
      </div>
    </div>
  );
}

function ConversationEmptyState({
  mode,
  onCreateThread,
  isCreatingThread,
}: {
  mode: "landing" | "thread";
  onCreateThread: () => void;
  isCreatingThread: boolean;
}) {
  if (mode === "landing") {
    return (
      <Empty className="min-h-[360px] border border-dashed bg-muted/20">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconMessageCirclePlus />
          </EmptyMedia>
          <EmptyTitle>Start with a question</EmptyTitle>
          <EmptyDescription>Type below to create a new thread instantly.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onCreateThread} disabled={isCreatingThread}>
            <IconMessageCirclePlus data-icon="inline-start" />
            {isCreatingThread ? "Creating…" : "Start Thread"}
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Empty className="min-h-[360px] border border-dashed bg-muted/20">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconMessages />
        </EmptyMedia>
        <EmptyTitle>No messages yet</EmptyTitle>
        <EmptyDescription>
          This thread is ready. Send a prompt below to begin the conversation.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
