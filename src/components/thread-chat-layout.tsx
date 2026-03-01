import { FormEvent } from "react";

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

export function ChatStyles() {
  return <style>{CHAT_STYLES}</style>;
}

export function ThreadsSidebar({
  threads,
  activeThreadId,
  isCreatingThread,
  deletingThreadId,
  onCreateThread,
  onSelectThread,
  onDeleteThread,
}: {
  threads: ThreadListItem[];
  activeThreadId: string | null;
  isCreatingThread: boolean;
  deletingThreadId: string | null;
  onCreateThread: () => void;
  onSelectThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
}) {
  return (
    <aside className="panel" aria-label="Threads panel">
      <h2 className="sidebar-title">All Threads</h2>
      <button
        className="new-thread"
        type="button"
        onClick={onCreateThread}
        disabled={isCreatingThread}
      >
        {isCreatingThread ? "Creating…" : "+ New Thread"}
      </button>
      <div className="thread-list">
        {threads.length === 0 && <div className="empty">No threads yet.</div>}
        {threads.map((thread) => (
          <ThreadItem
            key={thread.id}
            thread={thread}
            isActive={thread.id === activeThreadId}
            onSelect={onSelectThread}
            onDelete={onDeleteThread}
            isDeleting={deletingThreadId === thread.id}
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
  isDeleting,
}: {
  thread: ThreadListItem;
  isActive: boolean;
  onSelect: (threadId: string) => void;
  onDelete: (threadId: string) => void;
  isDeleting: boolean;
}) {
  return (
    <div className="thread-item-wrap">
      <button
        className={`thread-item ${isActive ? "active" : ""}`}
        type="button"
        onClick={() => onSelect(thread.id)}
      >
        <div className="thread-name">{thread.title}</div>
        <div className="thread-meta">{formatThreadTime(thread.createdAt)}</div>
      </button>
      <button
        className="thread-delete"
        type="button"
        aria-label={`Delete thread ${thread.title}`}
        title="Delete thread"
        disabled={isDeleting}
        onClick={() => onDelete(thread.id)}
      >
        {isDeleting ? "…" : "×"}
      </button>
    </div>
  );
}

export function ChatHeader() {
  return (
    <header className="header">
      <h1 className="title">Deep Stortinget Chat</h1>
      <p className="subtitle">Convex Agents + OpenRouter</p>
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
    <section className="messages" aria-live="polite">
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
    <article className={`message ${isUser ? "user" : "assistant"}`}>
      <div className="role">{speaker}</div>
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
    <form className="composer" onSubmit={onSubmit}>
      <input
        className="input"
        placeholder={placeholder}
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        disabled={isSending}
      />
      <button className="send" type="submit" disabled={!canSend}>
        {isSending ? "Thinking…" : "Send"}
      </button>
      {error ? <div className="error">{error}</div> : null}
    </form>
  );
}

const CHAT_STYLES = `
  @import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Syne:wght@600;700&display=swap");

  :root {
    --ink: #1a1a17;
    --paper: #f8f5ee;
    --sand: #ece4d2;
    --accent: #1d6a52;
    --line: #d2c7ae;
    --line-strong: #baac8e;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    color: var(--ink);
    background:
      radial-gradient(circle at 18% 20%, #efe7d5 0%, transparent 40%),
      radial-gradient(circle at 80% 10%, #e8d9bc 0%, transparent 48%),
      linear-gradient(160deg, #f8f5ee 0%, #f1eadb 100%);
    font-family: "DM Sans", sans-serif;
  }

  .chat-shell {
    max-width: 1120px;
    margin: 0 auto;
    min-height: 100dvh;
    padding: 20px 16px;
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 14px;
  }

  .panel,
  .chat-main {
    border: 1px solid var(--line);
    border-radius: 14px;
    background: rgba(248, 245, 238, 0.86);
    backdrop-filter: blur(4px);
    min-height: 0;
  }

  .panel {
    display: grid;
    grid-template-rows: auto auto 1fr;
    padding: 12px;
    gap: 10px;
  }

  .sidebar-title {
    margin: 0;
    font-family: "Syne", sans-serif;
    font-size: 1.05rem;
  }

  .new-thread {
    border: 1px solid #cdbf9f;
    border-radius: 10px;
    min-height: 40px;
    background: #fffdf8;
    color: var(--ink);
    font-weight: 700;
    cursor: pointer;
  }

  .new-thread:disabled {
    cursor: not-allowed;
    background: #ece7dc;
  }

  .thread-list {
    min-height: 0;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-right: 2px;
  }

  .thread-item {
    width: 100%;
    text-align: left;
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 10px 40px 10px 10px;
    background: #fffdf8;
    cursor: pointer;
    color: var(--ink);
  }

  .thread-item-wrap {
    position: relative;
  }

  .thread-delete {
    position: absolute;
    top: 50%;
    right: 8px;
    transform: translateY(-50%);
    width: 24px;
    height: 24px;
    border-radius: 6px;
    border: 1px solid #d8ccb4;
    background: #fff9f0;
    color: #7e3a32;
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transition: opacity .15s ease-out, background .15s ease-out;
  }

  .thread-item-wrap:hover .thread-delete,
  .thread-item-wrap:focus-within .thread-delete {
    opacity: 1;
    pointer-events: auto;
  }

  .thread-delete:disabled {
    cursor: not-allowed;
    opacity: 1;
    pointer-events: auto;
  }

  .thread-delete:not(:disabled):hover {
    background: #f8dfd9;
    border-color: #d09a8d;
  }

  .thread-item.active {
    border-color: var(--line-strong);
    background: #efe7d8;
  }

  .thread-name {
    font-weight: 700;
    line-height: 1.25;
  }

  .thread-meta {
    margin-top: 4px;
    font-size: 0.84rem;
    color: #5a554a;
  }

  .chat-main {
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 12px;
    padding: 12px;
  }

  .header {
    border: 1px solid var(--line);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.45);
    padding: 12px 14px;
  }

  .title {
    margin: 0;
    font-family: "Syne", sans-serif;
    font-size: clamp(1.05rem, 2vw, 1.3rem);
  }

  .subtitle {
    margin: 4px 0 0;
    font-size: 0.9rem;
    color: #4d4a43;
  }

  .messages {
    min-height: 0;
    overflow: auto;
    border-radius: 12px;
    border: 1px solid var(--line);
    background: linear-gradient(180deg, rgba(255,255,255,0.72), rgba(253,250,244,0.75));
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .message {
    max-width: min(78ch, 92%);
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid var(--line);
    white-space: pre-wrap;
    line-height: 1.45;
    font-size: 0.98rem;
    animation: reveal .15s ease-out;
  }

  .message.user {
    margin-left: auto;
    background: #efe2cf;
    border-color: #d7b98f;
  }

  .message.assistant {
    margin-right: auto;
    background: #eff6f3;
    border-color: #b6d4ca;
  }

  .role {
    font-family: "Syne", sans-serif;
    font-size: 0.76rem;
    letter-spacing: .04em;
    text-transform: uppercase;
    margin-bottom: 4px;
    opacity: 0.75;
  }

  .composer {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid var(--line);
    background: rgba(248, 245, 238, 0.92);
  }

  .input {
    width: 100%;
    border: 1px solid #cdbf9f;
    border-radius: 10px;
    background: #fffdf9;
    padding: 11px 12px;
    color: var(--ink);
    outline: none;
    font: inherit;
  }

  .input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(29, 106, 82, 0.12);
  }

  .send {
    border: none;
    border-radius: 10px;
    padding: 0 16px;
    min-height: 42px;
    background: linear-gradient(160deg, var(--accent), #14503f);
    color: #f4fff9;
    font-weight: 700;
    cursor: pointer;
  }

  .send:disabled {
    cursor: not-allowed;
    background: #9ab3ab;
  }

  .empty,
  .error {
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 0.9rem;
  }

  .empty {
    background: #f3efe6;
    border: 1px dashed #d7cdb8;
  }

  .error {
    color: #8b2c2c;
    background: #fde4e4;
    border: 1px solid #edbcbc;
  }

  @keyframes reveal {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 900px) {
    .chat-shell {
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr;
    }

    .panel {
      max-height: 38dvh;
    }
  }

  @media (max-width: 640px) {
    .composer { grid-template-columns: 1fr; }
    .send { width: 100%; }
    .message { max-width: 100%; }
    .thread-delete {
      opacity: 1;
      pointer-events: auto;
    }
  }
`;
