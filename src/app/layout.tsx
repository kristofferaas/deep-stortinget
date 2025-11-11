import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "./convex-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AppHeader } from "@/components/app-header";
import { GloablChatProvider } from "@/components/global-chat/global-chat-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Deep Stortinget",
  description: "Deep Stortinget (WIP)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-dvh`}
      >
        <ConvexClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <GloablChatProvider>
              <AppHeader />
              <main>
                <div className="h-14" />
                {children}
              </main>
            </GloablChatProvider>
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
