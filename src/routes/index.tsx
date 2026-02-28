import { createFileRoute } from "@tanstack/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/")({
  component: Home,
});

function formatThreadTime(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function threadTitleFallback(): string {
  return `Chat ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date())}`;
}

function Home() {
  const createThread = useMutation(api.chat.createThread);
  const sendMessage = useAction(api.chat.sendMessage);
  const threads = useQuery(api.chat.listThreads);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const hasAttemptedBootstrapThread = useRef(false);

  useEffect(() => {
    if (!threads || typeof window === "undefined") {
      return;
    }

    const localKey = "deep-stortinget-thread-id";
    const storedThreadId = window.localStorage.getItem(localKey);

    if (threadId && threads.some((thread) => thread.id === threadId)) {
      return;
    }

    if (storedThreadId && threads.some((thread) => thread.id === storedThreadId)) {
      setThreadId(storedThreadId);
      return;
    }

    if (threads.length > 0) {
      setThreadId(threads[0].id);
      return;
    }

    if (hasAttemptedBootstrapThread.current) {
      return;
    }

    hasAttemptedBootstrapThread.current = true;
    setIsCreatingThread(true);
    setError(null);

    createThread({ title: threadTitleFallback() })
      .then((newThreadId) => {
        setThreadId(newThreadId);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to create thread.");
      })
      .finally(() => {
        setIsCreatingThread(false);
      });
  }, [createThread, threadId, threads]);

  useEffect(() => {
    if (!threadId || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("deep-stortinget-thread-id", threadId);
  }, [threadId]);

  const messages = useQuery(api.chat.listMessages, threadId ? { threadId } : "skip");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, threadId]);

  const canSend = useMemo(
    () => Boolean(threadId && prompt.trim().length > 0 && !isSending),
    [isSending, prompt, threadId],
  );

  async function onCreateThread() {
    if (isCreatingThread) {
      return;
    }

    setError(null);
    setIsCreatingThread(true);
    try {
      const newThreadId = await createThread({ title: threadTitleFallback() });
      setThreadId(newThreadId);
      setPrompt("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create thread.");
    } finally {
      setIsCreatingThread(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!threadId || !prompt.trim() || isSending) {
      return;
    }

    const message = prompt.trim();
    setPrompt("");
    setError(null);
    setIsSending(true);
    try {
      await sendMessage({ threadId, prompt: message });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="chat-shell">
      <style>{`
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
          padding: 10px;
          background: #fffdf8;
          cursor: pointer;
          color: var(--ink);
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
        }
      `}</style>

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
          {!threads && <div className="empty">Loading threads…</div>}
          {threads?.length === 0 && <div className="empty">No threads yet.</div>}
          {threads?.map((thread) => (
            <button
              key={thread.id}
              className={`thread-item ${thread.id === threadId ? "active" : ""}`}
              type="button"
              onClick={() => setThreadId(thread.id)}
            >
              <div className="thread-name">{thread.title}</div>
              <div className="thread-meta">{formatThreadTime(thread.createdAt)}</div>
            </button>
          ))}
        </div>
      </aside>

      <section className="chat-main">
        <header className="header">
          <h1 className="title">Deep Stortinget Chat</h1>
          <p className="subtitle">Convex Agents + OpenRouter</p>
        </header>

        <section className="messages" aria-live="polite">
          {!threadId && <div className="message assistant">Pick a thread or create a new one.</div>}
          {threadId && !messages && <div className="message assistant">Loading messages…</div>}
          {messages?.map((message) => (
            <article
              key={message.id}
              className={`message ${message.role === "user" ? "user" : "assistant"}`}
            >
              <div className="role">{message.role === "user" ? "You" : "Assistant"}</div>
              <div>{message.text}</div>
            </article>
          ))}
          <div ref={bottomRef} />
        </section>

        <form className="composer" onSubmit={onSubmit}>
          <input
            className="input"
            placeholder={threadId ? "Ask something…" : "Select a thread to begin"}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            disabled={!threadId || isSending}
          />
          <button className="send" type="submit" disabled={!canSend}>
            {isSending ? "Thinking…" : "Send"}
          </button>
          {error ? <div className="error">{error}</div> : null}
        </form>
      </section>
    </main>
  );
}
