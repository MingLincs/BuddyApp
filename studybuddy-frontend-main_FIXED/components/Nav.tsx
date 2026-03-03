"use client";

import Link from "next/link";
import Image from "next/image";
import AuthGate from "@/components/AuthGate";

export default function Nav() {
  return (
    <div className="w-full px-7 py-3 flex items-center gap-4">
      {/* Left: logo + brand */}
      <Link href="/" className="flex items-center gap-0 shrink-0">
        <Image
          src="/studybuddy-mark.png"
          alt="StudyBuddy logo"
          width={40}
          height={28}
          priority
          className="rounded-md"
        />
        <span className="text-slate-900 font-semibold">StudyBuddy</span>
      </Link>

      {/* Right: auth button */}
      <div className="ml-auto">
        <AuthGate />
      </div>
    </div>
  );
}
