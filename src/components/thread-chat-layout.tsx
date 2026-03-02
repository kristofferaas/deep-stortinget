import { FormEvent, KeyboardEvent, useEffect, useState } from "react";

export type ThreadListItem = { id: string; title: string; createdAt: number };

export type MessageListItem = {
  id: string;
  role: "user" | "assistant" | "tool" | "system";
  text: string;
};

export function formatThreadTime(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function threadTitleFallback(): string {
  return `Chat ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date())}`;
}

export function ThreadsSidebar({
  threads,
  activeThreadId,
  isCreatingThread,
  deletingThreadId,
  renamingThreadId,
  onCreateThread,
  onSelectThread,
  onDeleteThread,
  onRenameThread,
}: {
  threads: ThreadListItem[];
  activeThreadId: string | null;
  isCreatingThread: boolean;
  deletingThreadId: string | null;
  renamingThreadId: string | null;
  onCreateThread: () => void;
  onSelectThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onRenameThread: (threadId: string, title: string) => Promise<void>;
}) {
  return (
    <aside
      className="grid min-h-0 grid-rows-[auto_auto_1fr] gap-2.5 rounded-2xl border border-line/90 bg-paper/85 p-3 backdrop-blur-sm"
      aria-label="Threads panel"
    >
      <h2 className="m-0 font-display text-[1.05rem]">All Threads</h2>
      <button
        className="min-h-10 cursor-pointer rounded-xl border border-[#cdbf9f] bg-[#fffdf8] font-bold text-ink transition-colors hover:not-disabled:bg-[#faf5ea] disabled:cursor-not-allowed disabled:bg-[#ece7dc]"
        type="button"
        onClick={onCreateThread}
        disabled={isCreatingThread}
      >
        {isCreatingThread ? "Creating…" : "+ New Thread"}
      </button>
      <div className="flex min-h-0 flex-col gap-2 overflow-auto pr-0.5">
        {threads.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#d7cdb8] bg-[#f3efe6] px-3 py-2.5 text-sm">
            No threads yet.
          </div>
        )}
        {threads.map((thread) => (
          <ThreadItem
            key={thread.id}
            thread={thread}
            isActive={thread.id === activeThreadId}
            onSelect={onSelectThread}
            onDelete={onDeleteThread}
            onRename={onRenameThread}
            isDeleting={deletingThreadId === thread.id}
            isRenaming={renamingThreadId === thread.id}
            hasPendingRename={renamingThreadId !== null}
          />
        ))}
      </div>
    </aside>
  );
}

function ThreadItem({
  thread,
  isActive,
  onSelect,
  onDelete,
  onRename,
  isDeleting,
  isRenaming,
  hasPendingRename,
}: {
  thread: ThreadListItem;
  isActive: boolean;
  onSelect: (threadId: string) => void;
  onDelete: (threadId: string) => void;
  onRename: (threadId: string, title: string) => Promise<void>;
  isDeleting: boolean;
  isRenaming: boolean;
  hasPendingRename: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(thread.title);

  useEffect(() => {
    if (!isEditing) {
      setDraftTitle(thread.title);
    }
  }, [isEditing, thread.title]);

  const disableActions = isDeleting || hasPendingRename;
  const cardClassName = `w-full rounded-xl border px-2.5 py-2.5 pr-[4.625rem] text-left transition-colors ${
    isActive ? "border-line-strong bg-[#efe7d8]" : "border-line bg-[#fffdf8]"
  }`;

  async function onRenameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isDeleting || isRenaming) {
      return;
    }

    const nextTitle = draftTitle.trim();
    if (!nextTitle) {
      setDraftTitle(thread.title);
      return;
    }

    if (nextTitle === thread.title) {
      setIsEditing(false);
      return;
    }

    await onRename(thread.id, nextTitle);
    setIsEditing(false);
  }

  function onRenameInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setDraftTitle(thread.title);
      setIsEditing(false);
    }
  }

  return (
    <div className="group relative">
      {isEditing ? (
        <form className={`${cardClassName} cursor-default`} onSubmit={onRenameSubmit}>
          <input
            className="w-full rounded-lg border border-[#cdbf9f] bg-[#fffdf9] px-2.5 py-2 text-[0.98rem] font-bold text-ink transition-shadow outline-none focus:border-accent focus:shadow-[0_0_0_2px_rgba(29,106,82,0.12)]"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onKeyDown={onRenameInputKeyDown}
            aria-label={`Rename thread ${thread.title}`}
            autoFocus
            disabled={isRenaming}
          />
          <div className="mt-1 text-[0.84rem] text-[#5a554a]">
            {formatThreadTime(thread.createdAt)}
          </div>
        </form>
      ) : (
        <button
          className={`${cardClassName} cursor-pointer`}
          type="button"
          onClick={() => onSelect(thread.id)}
        >
          <div className="leading-tight font-bold">{thread.title}</div>
          <div className="mt-1 text-[0.84rem] text-[#5a554a]">
            {formatThreadTime(thread.createdAt)}
          </div>
        </button>
      )}

      <div className="pointer-events-none absolute top-1/2 right-2 flex -translate-y-1/2 gap-1.5 opacity-0 transition-opacity duration-150 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 max-sm:pointer-events-auto max-sm:opacity-100">
        <button
          className="size-6 cursor-pointer rounded-md border border-[#d8ccb4] bg-[#fff9f0] text-[0.95rem] leading-none text-[#3b4b67] transition-colors hover:not-disabled:border-[#9fb3d7] hover:not-disabled:bg-[#e8effd] disabled:cursor-not-allowed"
          type="button"
          aria-label={`Edit thread ${thread.title}`}
          title="Edit thread"
          disabled={disableActions || isEditing}
          onClick={() => setIsEditing(true)}
        >
          ✎
        </button>
        <button
          className="size-6 cursor-pointer rounded-md border border-[#d8ccb4] bg-[#fff9f0] text-[1rem] leading-none text-[#7e3a32] transition-colors hover:not-disabled:border-[#d09a8d] hover:not-disabled:bg-[#f8dfd9] disabled:cursor-not-allowed"
          type="button"
          aria-label={`Delete thread ${thread.title}`}
          title="Delete thread"
          disabled={isDeleting || hasPendingRename}
          onClick={() => onDelete(thread.id)}
        >
          {isDeleting ? "…" : "×"}
        </button>
      </div>
    </div>
  );
}

export function ChatHeader() {
  return (
    <header className="rounded-xl border border-line bg-white/45 px-3.5 py-3">
      <h1 className="m-0 font-display text-[clamp(1.05rem,2vw,1.3rem)]">Deep Stortinget Chat</h1>
      <p className="mt-1 text-sm text-[#4d4a43]">Convex Agents + OpenRouter</p>
    </header>
  );
}

export function MessagesPane({
  messages,
  bottomRef,
  emptyState,
}: {
  messages: MessageListItem[] | undefined;
  bottomRef?: React.RefObject<HTMLDivElement | null>;
  emptyState?: React.ReactNode;
}) {
  return (
    <section
      className="flex min-h-0 flex-col gap-3 overflow-auto rounded-xl border border-line bg-gradient-to-b from-white/70 to-[#fdfaf4]/75 p-3.5"
      aria-live="polite"
    >
      {messages && messages.length > 0
        ? messages.map((message) => <MessageBubble key={message.id} message={message} />)
        : emptyState}
      {bottomRef ? <div ref={bottomRef} /> : null}
    </section>
  );
}

function MessageBubble({ message }: { message: MessageListItem }) {
  const isUser = message.role === "user";
  const speaker = isUser ? "You" : message.role === "assistant" ? "Assistant" : "System";
  return (
    <article
      className={`max-w-[min(78ch,92%)] animate-in rounded-xl border px-3.5 py-3 text-[0.98rem] leading-relaxed whitespace-pre-wrap duration-150 zoom-in-95 fade-in max-sm:max-w-full ${
        isUser ? "ml-auto border-[#d7b98f] bg-[#efe2cf]" : "mr-auto border-[#b6d4ca] bg-[#eff6f3]"
      }`}
    >
      <div className="mb-1 font-display text-[0.76rem] tracking-[0.04em] uppercase opacity-75">
        {speaker}
      </div>
      <div>{message.text}</div>
    </article>
  );
}

export function Composer({
  prompt,
  isSending,
  canSend,
  error,
  placeholder,
  onSubmit,
  onPromptChange,
}: {
  prompt: string;
  isSending: boolean;
  canSend: boolean;
  error: string | null;
  placeholder: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPromptChange: (value: string) => void;
}) {
  return (
    <form
      className="grid grid-cols-[1fr_auto] gap-2.5 rounded-xl border border-line bg-paper/92 p-3 max-[640px]:grid-cols-1"
      onSubmit={onSubmit}
    >
      <input
        className="w-full rounded-xl border border-[#cdbf9f] bg-[#fffdf9] px-3 py-2.5 text-ink transition-shadow outline-none focus:border-accent focus:shadow-[0_0_0_2px_rgba(29,106,82,0.12)] disabled:cursor-not-allowed"
        placeholder={placeholder}
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        disabled={isSending}
      />
      <button
        className="min-h-[42px] cursor-pointer rounded-xl bg-linear-to-br from-accent to-[#14503f] px-4 font-bold text-[#f4fff9] transition-opacity hover:not-disabled:opacity-95 disabled:cursor-not-allowed disabled:bg-[#9ab3ab] max-[640px]:w-full"
        type="submit"
        disabled={!canSend}
      >
        {isSending ? "Thinking…" : "Send"}
      </button>
      {error ? (
        <div className="col-span-full rounded-xl border border-[#edbcbc] bg-[#fde4e4] px-3 py-2.5 text-sm text-[#8b2c2c]">
          {error}
        </div>
      ) : null}
    </form>
  );
}
