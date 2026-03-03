import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "./ClientLayout";
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: "StudyBuddy - AI-Powered Study Assistant",
  description: "Upload slides → instant flashcards, concept maps, and study guides powered by AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-50 text-slate-900 antialiased font-sans">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
