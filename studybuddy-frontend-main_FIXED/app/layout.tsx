import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import ClientLayout from "./ClientLayout";
import "katex/dist/katex.min.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StudyBuddy - AI-Powered Study Assistant",
  description: "Upload slides → instant flashcards, concept maps, and study guides powered by AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-slate-50 text-slate-900 antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
