"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { useScrollVisibility } from "@/hooks/use-scroll-visibility";

export function AiChatInput() {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isVisible = useScrollVisibility();

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = "auto";
      // Set height to scrollHeight, capped at a maximum
      const newHeight = Math.min(textarea.scrollHeight, 200); // Max height of 200px
      textarea.style.height = `${newHeight}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // TODO: Handle message submission (e.g., send to API)
    console.log("Message submitted:", message);

    // Clear the input
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 flex justify-center p-4 transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl backdrop-blur-md bg-background/80 border border-border rounded-full shadow-lg flex items-end gap-3 p-3 pr-2"
      >
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything..."
          rows={1}
          className="flex-1 bg-transparent border-none outline-none resize-none px-4 py-2 text-foreground placeholder:text-muted-foreground focus:ring-0 min-h-[40px] max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          style={{
            scrollbarWidth: "thin",
          }}
        />
        <button
          type="submit"
          disabled={!message.trim()}
          className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg disabled:shadow-none"
          aria-label="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
