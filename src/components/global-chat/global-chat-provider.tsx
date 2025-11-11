"use client";

import dynamic from "next/dynamic";

const ChatInput = dynamic(() => import("./chat-input"), { ssr: false });

export function GloablChatProvider(props: { children: React.ReactNode }) {
  return (
    <>
      {props.children}
      <ChatInput />
    </>
  );
}
