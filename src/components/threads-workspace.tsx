import {
  IconArrowUp,
  IconClockHour4,
  IconDots,
  IconMessageCirclePlus,
  IconMessages,
  IconPencil,
  IconRobot,
  IconSparkles,
  IconTrash,
  IconUser,
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
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "~/components/ui/item";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

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

function formatThreadTime(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function getInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "DS"
  );
}

function getMessageMeta(role: MessageListItem["role"]) {
  switch (role) {
    case "user":
      return {
        badgeVariant: "secondary" as const,
        description: "Prompt",
        icon: IconUser,
        label: "You",
      };
    case "assistant":
      return {
        badgeVariant: "default" as const,
        description: "Response",
        icon: IconRobot,
        label: "Deep Stortinget",
      };
    case "tool":
      return {
        badgeVariant: "outline" as const,
        description: "Context",
        icon: IconSparkles,
        label: "Tool",
      };
    case "system":
      return {
        badgeVariant: "outline" as const,
        description: "Instruction",
        icon: IconSparkles,
        label: "System",
      };
  }
}

export function ThreadsWorkspace({
  mode,
  headerTitle,
  headerDescription,
  composerPlaceholder,
  threads,
  activeThreadId,
  messages,
  prompt,
  error,
  isThreadsLoading,
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
  onSelectThread,
  onSubmit,
}: ThreadsWorkspaceProps) {
  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, threads],
  );
  const canSend = Boolean(prompt.trim().length > 0 && !isSending);

  const [renameThread, setRenameThread] = useState<ThreadListItem | null>(null);
  const [deleteThread, setDeleteThread] = useState<ThreadListItem | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  useEffect(() => {
    setRenameDraft(renameThread?.title ?? "");
  }, [renameThread]);

  async function handleRenameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!renameThread || renamingThreadId) {
      return;
    }

    const nextTitle = renameDraft.trim();
    if (!nextTitle || nextTitle === renameThread.title) {
      setRenameThread(null);
      return;
    }

    await onRenameThread(renameThread.id, nextTitle);
    setRenameThread(null);
  }

  async function handleDeleteConfirm() {
    if (!deleteThread || deletingThreadId) {
      return;
    }

    await onDeleteThread(deleteThread.id);
    setDeleteThread(null);
  }

  return (
    <>
      <main className="mx-auto grid min-h-dvh w-full max-w-[1280px] grid-cols-1 gap-4 px-4 py-5">
        <Card className="bg-background/80 shadow-sm backdrop-blur-sm">
          <CardHeader className="border-b">
            <div>
              <CardTitle>{headerTitle}</CardTitle>
              <CardDescription>{headerDescription}</CardDescription>
            </div>
            <CardAction className="flex items-center gap-2">
              <Badge variant="outline">{threads.length} threads</Badge>
              <Badge variant="secondary">{messages.length} messages</Badge>
              <Button onClick={onCreateThread} disabled={isCreatingThread}>
                <IconMessageCirclePlus data-icon="inline-start" />
                {isCreatingThread ? "Creating…" : "New Thread"}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Badge variant={mode === "landing" ? "outline" : "default"}>
              {mode === "landing" ? "Start a conversation" : "Live thread"}
            </Badge>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <IconClockHour4 />
              <span>
                {activeThread
                  ? `Opened ${formatThreadTime(activeThread.createdAt)}`
                  : "Ready when you are"}
              </span>
            </div>
          </CardContent>
        </Card>

        <section className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="min-h-0 bg-background/80 shadow-sm backdrop-blur-sm">
            <CardHeader className="border-b">
              <div>
                <CardTitle>All Threads</CardTitle>
                <CardDescription>Browse, rename, and remove stored conversations.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 px-0">
              <ScrollArea className="h-[calc(100dvh-18rem)] min-h-0 lg:h-[calc(100dvh-13.5rem)]">
                <div className="px-4 py-4">
                  {isThreadsLoading ? (
                    <ItemGroup>
                      {Array.from({ length: 6 }).map((_, index) => (
                        <Item key={index} variant="outline" className="bg-background/70">
                          <ItemMedia>
                            <Skeleton className="size-8 rounded-full" />
                          </ItemMedia>
                          <ItemContent>
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-3 w-1/3" />
                          </ItemContent>
                        </Item>
                      ))}
                    </ItemGroup>
                  ) : threads.length === 0 ? (
                    <Empty className="min-h-[280px] border border-dashed bg-muted/20">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <IconMessages />
                        </EmptyMedia>
                        <EmptyTitle>No threads yet</EmptyTitle>
                        <EmptyDescription>
                          Your first message will turn into a saved conversation.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <ItemGroup>
                      {threads.map((thread) => (
                        <ThreadNavigationItem
                          key={thread.id}
                          thread={thread}
                          isActive={thread.id === activeThreadId}
                          isDeleting={deletingThreadId === thread.id}
                          isRenaming={renamingThreadId === thread.id}
                          isBusy={Boolean(renamingThreadId && renamingThreadId !== thread.id)}
                          onDelete={() => setDeleteThread(thread)}
                          onRename={() => setRenameThread(thread)}
                          onSelect={() => onSelectThread(thread.id)}
                        />
                      ))}
                    </ItemGroup>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-4">
            <Card className="min-h-0 bg-background/80 shadow-sm backdrop-blur-sm">
              <CardHeader className="border-b">
                <div>
                  <CardTitle>{activeThread?.title ?? "Conversation Workspace"}</CardTitle>
                  <CardDescription>
                    {mode === "landing"
                      ? "Use the composer below to create a thread from your first prompt."
                      : "Messages stream from the active Convex Agent thread in real time."}
                  </CardDescription>
                </div>
                <CardAction className="flex items-center gap-2">
                  {activeThread ? <Badge>{messages.length} messages</Badge> : null}
                  <Badge variant="outline">{mode === "landing" ? "Draft" : "Connected"}</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col px-0">
                <ScrollArea className="min-h-0 flex-1">
                  <div className="flex min-h-[420px] flex-col gap-3 px-4 py-4">
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
                      ? messages.map((message) => (
                          <MessageCard key={message.id} message={message} />
                        ))
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
              </CardContent>
            </Card>

            <form onSubmit={onSubmit}>
              <Card className="bg-background/80 shadow-sm backdrop-blur-sm">
                <CardContent>
                  <FieldGroup>
                    <Field data-invalid={error ? true : undefined}>
                      <FieldLabel htmlFor="thread-prompt">Message</FieldLabel>
                      <FieldContent>
                        <Textarea
                          id="thread-prompt"
                          rows={4}
                          placeholder={composerPlaceholder}
                          value={prompt}
                          aria-invalid={error ? true : undefined}
                          disabled={isSending}
                          onChange={(event) => onPromptChange(event.target.value)}
                          onKeyDown={(event) => {
                            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                              event.preventDefault();
                              event.currentTarget.form?.requestSubmit();
                            }
                          }}
                        />
                        <FieldDescription>
                          {mode === "landing"
                            ? "The first send creates a new thread automatically."
                            : "The prompt will be sent to the currently selected thread."}
                        </FieldDescription>
                        <FieldError>{error}</FieldError>
                      </FieldContent>
                    </Field>
                  </FieldGroup>
                </CardContent>
                <CardFooter className="justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">Cmd/Ctrl + Enter</Badge>
                    <Separator orientation="vertical" className="h-4" />
                    <span>Send from the keyboard</span>
                  </div>
                  <Button type="submit" disabled={!canSend}>
                    <IconArrowUp data-icon="inline-start" />
                    {isSending ? "Thinking…" : "Send"}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </div>
        </section>
      </main>

      <Dialog open={Boolean(renameThread)} onOpenChange={(open) => !open && setRenameThread(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename thread</DialogTitle>
            <DialogDescription>
              Give the conversation a clearer title in the sidebar.
            </DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={handleRenameSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="rename-thread-title">Thread title</FieldLabel>
                <FieldContent>
                  <Input
                    id="rename-thread-title"
                    autoFocus
                    value={renameDraft}
                    disabled={Boolean(renamingThreadId)}
                    onChange={(event) => setRenameDraft(event.target.value)}
                  />
                  <FieldDescription>Keep it short and descriptive.</FieldDescription>
                </FieldContent>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenameThread(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!renameDraft.trim() || Boolean(renamingThreadId)}>
                {renamingThreadId ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteThread)}
        onOpenChange={(open) => !open && setDeleteThread(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <IconTrash />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete thread</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteThread
                ? `This removes "${deleteThread.title}" and its message history.`
                : "This removes the selected thread and its message history."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingThreadId)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={Boolean(deletingThreadId)}
              onClick={() => void handleDeleteConfirm()}
            >
              {deletingThreadId ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ThreadNavigationItem({
  thread,
  isActive,
  isDeleting,
  isRenaming,
  isBusy,
  onDelete,
  onRename,
  onSelect,
}: {
  thread: ThreadListItem;
  isActive: boolean;
  isDeleting: boolean;
  isRenaming: boolean;
  isBusy: boolean;
  onDelete: () => void;
  onRename: () => void;
  onSelect: () => void;
}) {
  const actionDisabled = isDeleting || isRenaming || isBusy;

  return (
    <Item
      variant={isActive ? "muted" : "outline"}
      className={cn("bg-background/70", isActive && "border-primary/20 bg-primary/5")}
    >
      <ItemMedia>
        <Avatar size="sm">
          <AvatarFallback>{getInitials(thread.title)}</AvatarFallback>
        </Avatar>
      </ItemMedia>
      <button
        className="min-w-0 flex-1 cursor-pointer text-left outline-none"
        type="button"
        onClick={onSelect}
      >
        <ItemContent>
          <ItemTitle>{thread.title}</ItemTitle>
          <ItemDescription>{formatThreadTime(thread.createdAt)}</ItemDescription>
        </ItemContent>
      </button>
      <ItemActions>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Manage thread ${thread.title}`}
                disabled={actionDisabled}
              />
            }
          >
            <IconDots />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem disabled={actionDisabled} onClick={onRename}>
                <IconPencil />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" disabled={actionDisabled} onClick={onDelete}>
                <IconTrash />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </ItemActions>
      <ItemFooter className="pl-10">
        <Badge variant={isActive ? "default" : "outline"}>{isActive ? "Open" : "Stored"}</Badge>
        <span className="truncate text-xs text-muted-foreground">
          {isDeleting ? "Removing thread…" : isRenaming ? "Saving title…" : "Ready"}
        </span>
      </ItemFooter>
    </Item>
  );
}

function MessageCard({ message }: { message: MessageListItem }) {
  const isUser = message.role === "user";
  const meta = getMessageMeta(message.role);
  const Icon = meta.icon;

  return (
    <Card
      size="sm"
      className={cn(
        "max-w-[min(74ch,100%)] shadow-sm",
        isUser ? "ml-auto bg-secondary/80 ring-secondary/70" : "mr-auto bg-background/90",
      )}
    >
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <Avatar size="sm">
            <AvatarFallback>
              <Icon />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm">{meta.label}</CardTitle>
            <CardDescription>{meta.description}</CardDescription>
          </div>
          <Badge variant={meta.badgeVariant}>{message.role}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</div>
      </CardContent>
    </Card>
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
          <EmptyDescription>
            Type below to create a new thread instantly, or open an empty thread first.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onCreateThread} disabled={isCreatingThread}>
            <IconMessageCirclePlus data-icon="inline-start" />
            {isCreatingThread ? "Creating…" : "Create Empty Thread"}
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
