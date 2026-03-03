"use client";

import { useEffect, useState } from "react";
import CalendarView from "@/components/CalendarView";
import { supabase } from "@/lib/supabase";
import { API_BASE } from "@/lib/env";

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

export default function CalendarPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);

  /* ================= LOAD ASSIGNMENTS ================= */
const getAccessToken = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
};
  const loadAssignments = async () => {
  try {
    const token = await getAccessToken();

    const res = await fetch(`${API_BASE}/calendar/assignments`, {
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : {},
    });

    if (!res.ok) {
      console.error("Assignments failed:", res.status);
      return;
    }

    const data = await res.json();
    setAssignments(data);
  } catch (err) {
    console.error("Assignments load error:", err);
  }
};
  /* ================= LOAD CLASSES ================= */

  const loadClasses = async () => {
  try {
    const token = await getAccessToken();

    const res = await fetch(`${API_BASE}/classes`, {
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : {},
    });

    if (!res.ok) {
      console.error("Classes failed:", res.status);
      return;
    }

    const data = await res.json();
    setClasses(data);
  } catch (err) {
    console.error("Classes load error:", err);
  }
};

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadAssignments(), loadClasses()]);
      setLoading(false);
    };

    init();
  }, []);

  /* ================= IMPORT HANDLER ================= */

 const handleImport = async (file: File) => {
  try {
    const token = await getAccessToken();

    if (!token) {
      console.error("No auth token found. User is not signed in.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/calendar/import`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Import failed: ${res.status} ${errText}`);
    }

    await loadAssignments();
    setShowImportModal(false);
  } catch (err) {
    console.error("Import error:", err);
  }
};

  /* ================= RENDER ================= */

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-2xl font-bold flex items-center gap-2">
            📅 Calendar & Assignments
          </div>
          <div className="text-sm text-gray-500">
            Track all your assignments and due dates
          </div>
        </div>

        <button
          onClick={() => setShowImportModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition"
        >
          Import from Canvas
        </button>
      </div>

      {/* Calendar */}
      {loading ? (
        <div className="bg-white p-10 rounded-xl shadow text-center">
          Loading...
        </div>
      ) : (
        <CalendarView
          assignments={assignments}
          classes={classes}
        />
      )}

      {/* ================= IMPORT MODAL ================= */}

      {showImportModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center"
          onClick={() => setShowImportModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-[400px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-semibold mb-4">
              Upload Canvas .ics File
            </div>

            <input
              type="file"
              accept=".ics"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleImport(e.target.files[0]);
                }
              }}
              className="mb-4"
            />

            <button
              onClick={() => setShowImportModal(false)}
              className="text-sm text-gray-500 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}