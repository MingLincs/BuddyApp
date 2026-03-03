"use client";

import { useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";

type Assignment = {
  id: string;
  title: string;
  due_date: string;
  class_id: string;
};

type ClassRow = {
  id: string;
  name: string;
};

interface Props {
  assignments?: Assignment[];
  classes?: ClassRow[];
}

/* ---------- Color System ---------- */

const CLASS_COLORS = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-teal-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-lime-500",
];

function hashToIndex(str: string, mod: number) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h % mod;
}

function cleanTitle(title: string) {
  return (title || "")
    .replace(/\[.*?\]/g, "")
    .replace(/\d{4}SP-.*?\]/g, "")
    .trim();
}

export default function CalendarView({
  assignments = [],
  classes = [],
}: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  /* ---------- Build Class → Color Map ---------- */

  const classColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (!Array.isArray(classes)) return map;

    for (const cls of classes) {
      const idx = hashToIndex(cls.id, CLASS_COLORS.length);
      map[cls.id] = CLASS_COLORS[idx];
    }

    return map;
  }, [classes]);

  /* ---------- Calendar Range ---------- */

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  /* ---------- Assignments Grouped By Date ---------- */

  const assignmentsByDate = useMemo(() => {
    const map: Record<string, Assignment[]> = {};
    for (const a of assignments) {
      const key = format(new Date(a.due_date), "yyyy-MM-dd");
      (map[key] ||= []).push(a);
    }
    return map;
  }, [assignments]);

  return (
    <div className="flex gap-8">
      {/* ================= LEFT SIDE CALENDAR ================= */}

      <div className="flex-1 bg-white rounded-2xl shadow-sm p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-xl font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
              className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
            >
              ←
            </button>

            <button
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
            >
              Today
            </button>

            <button
              onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
              className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
            >
              →
            </button>
          </div>
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 text-xs font-semibold text-gray-500 border-b pb-2 mb-2">
          {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
            <div key={d} className="text-center">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
          {days.map((date, i) => {
            const key = format(date, "yyyy-MM-dd");
            const dayAssignments = assignmentsByDate[key] || [];

            return (
              <div
                key={i}
                className={`bg-white min-h-[130px] max-h-[130px] p-2 flex flex-col ${
                  !isSameMonth(date, monthStart) ? "opacity-40" : ""
                }`}
              >
                {/* Day Number */}
                <div className="mb-1">
                  <div
                    className={`text-xs font-semibold ${
                      isToday(date)
                        ? "bg-indigo-600 text-white w-6 h-6 flex items-center justify-center rounded-full"
                        : "text-gray-600"
                    }`}
                  >
                    {format(date, "d")}
                  </div>
                </div>

                {/* Assignments */}
                <div className="flex-1 overflow-y-auto space-y-1">
                  {dayAssignments.map((a) => {
                    const color =
                      classColorMap[a.class_id] || "bg-gray-500";

                    return (
                      <div
                        key={a.id}
                        className={`${color} text-white text-xs px-2 py-1 rounded-md truncate`}
                      >
                        {cleanTitle(a.title)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= RIGHT SIDE LEGEND ================= */}

      <div className="w-64 bg-white rounded-2xl shadow-sm p-6">
        <div className="text-sm font-semibold mb-4 text-gray-700">
          Classes
        </div>

        <div className="space-y-3">
          {classes.map((cls) => {
            const color =
              classColorMap[cls.id] || "bg-gray-500";

            return (
              <div key={cls.id} className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded ${color}`} />
                <div className="text-sm text-gray-700 truncate">
                  {cls.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}