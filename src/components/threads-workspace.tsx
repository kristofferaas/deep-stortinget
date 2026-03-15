import {
  IconArrowUp,
  IconMessageCirclePlus,
  IconMessages,
  IconRobot,
  IconSparkles,
  IconUser,
} from "@tabler/icons-react";
import { FormEvent, RefObject, useMemo } from "react";

import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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
  composerPlaceholder,
  threads,
  activeThreadId,
  messages,
  prompt,
  error,
  isMessagesLoading,
  isCreatingThread,
  isSending,
  bottomRef,
  onCreateThread,
  onPromptChange,
  onSubmit,
}: ThreadsWorkspaceProps) {
  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, threads],
  );
  const canSend = Boolean(prompt.trim().length > 0 && !isSending);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/threads">Threads</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{activeThread?.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
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
    </>
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
