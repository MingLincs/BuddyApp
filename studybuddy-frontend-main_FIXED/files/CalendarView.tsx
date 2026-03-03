"use client";

import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/env";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  points: number | null;
  classes: { name: string; id: string } | null;
};

type CalendarDay = {
  date: Date;
  isCurrentMonth: boolean;
  assignments: Assignment[];
};

interface CalendarViewProps {
  assignments: Assignment[];
  onRefresh: () => void;
}

export default function CalendarView({ assignments, onRefresh }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  
  // Form state for new assignment
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    class_id: "",
    description: "",
    points: "",
  });

  useEffect(() => {
    generateCalendar();
  }, [currentDate, assignments]);

  useEffect(() => {
    loadClasses();
  }, []);

  async function loadClasses() {
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from("classes")
      .select("id, name")
      .order("name");
    setClasses(data || []);
  }

  function generateCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from Sunday before first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // End on Saturday after last day
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    
    const days: CalendarDay[] = [];
    const currentDay = new Date(startDate);
    
    while (currentDay <= endDate) {
      const dayAssignments = assignments.filter(a => {
        if (!a.due_date) return false;
        const assignmentDate = new Date(a.due_date);
        return (
          assignmentDate.getDate() === currentDay.getDate() &&
          assignmentDate.getMonth() === currentDay.getMonth() &&
          assignmentDate.getFullYear() === currentDay.getFullYear()
        );
      });
      
      days.push({
        date: new Date(currentDay),
        isCurrentMonth: currentDay.getMonth() === month,
        assignments: dayAssignments,
      });
      
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    setCalendarDays(days);
  }

  function previousMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  function handleDayClick(day: CalendarDay) {
    setSelectedDate(day.date);
    setShowAddModal(true);
  }

  async function handleAddAssignment() {
    if (!newAssignment.title || !newAssignment.class_id || !selectedDate) return;

    try {
      const supabase = getSupabaseBrowser();
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      if (!token) throw new Error("Not signed in");

      // Set due date to end of selected day
      const dueDate = new Date(selectedDate);
      dueDate.setHours(23, 59, 59);

      const res = await fetch(`${API_BASE}/calendar/assignments/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newAssignment.title,
          class_id: newAssignment.class_id,
          description: newAssignment.description || null,
          points: newAssignment.points ? parseInt(newAssignment.points) : null,
          due_date: dueDate.toISOString(),
        }),
      });

      if (!res.ok) throw new Error("Failed to create assignment");

      // Reset form
      setNewAssignment({ title: "", class_id: "", description: "", points: "" });
      setShowAddModal(false);
      setSelectedDate(null);
      onRefresh();
    } catch (error) {
      console.error("Error creating assignment:", error);
      alert("Failed to create assignment");
    }
  }

  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="calendar-view">
      {/* Calendar Header */}
      <div className="calendar-header">
        <div className="calendar-nav">
          <button onClick={goToToday} className="today-btn">
            Today
          </button>
          <button onClick={previousMonth} className="nav-btn">
            ←
          </button>
          <button onClick={nextMonth} className="nav-btn">
            →
          </button>
          <h2 className="month-year">{monthYear}</h2>
        </div>
      </div>

      {/* Day Headers */}
      <div className="calendar-grid">
        <div className="day-headers">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="day-header">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="calendar-days">
          {calendarDays.map((day, index) => {
            const isToday =
              day.date.getDate() === today.getDate() &&
              day.date.getMonth() === today.getMonth() &&
              day.date.getFullYear() === today.getFullYear();

            return (
              <div
                key={index}
                className={`calendar-day ${!day.isCurrentMonth ? "other-month" : ""} ${
                  isToday ? "today" : ""
                }`}
                onClick={() => handleDayClick(day)}
              >
                <div className="day-number">{day.date.getDate()}</div>
                <div className="day-assignments">
                  {day.assignments.slice(0, 3).map((assignment) => (
                    <div
                      key={assignment.id}
                      className={`assignment-chip ${assignment.completed ? "completed" : ""}`}
                      title={assignment.title}
                    >
                      <span className="assignment-time">
                        {assignment.classes?.name || "No Class"}
                      </span>
                      <span className="assignment-title">{assignment.title}</span>
                    </div>
                  ))}
                  {day.assignments.length > 3 && (
                    <div className="more-assignments">
                      +{day.assignments.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Assignment Modal */}
      {showAddModal && selectedDate && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">
              Add Assignment - {selectedDate.toLocaleDateString()}
            </h2>

            <div className="form-group">
              <label>Assignment Title *</label>
              <input
                type="text"
                placeholder="e.g., Chapter 5 Quiz"
                value={newAssignment.title}
                onChange={(e) =>
                  setNewAssignment({ ...newAssignment, title: e.target.value })
                }
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Class *</label>
              <select
                value={newAssignment.class_id}
                onChange={(e) =>
                  setNewAssignment({ ...newAssignment, class_id: e.target.value })
                }
                className="form-select"
              >
                <option value="">Select a class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Points (optional)</label>
              <input
                type="number"
                placeholder="e.g., 100"
                value={newAssignment.points}
                onChange={(e) =>
                  setNewAssignment({ ...newAssignment, points: e.target.value })
                }
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Description (optional)</label>
              <textarea
                placeholder="Assignment details..."
                value={newAssignment.description}
                onChange={(e) =>
                  setNewAssignment({ ...newAssignment, description: e.target.value })
                }
                className="form-textarea"
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button
                className="modal-btn modal-btn-secondary"
                onClick={() => {
                  setShowAddModal(false);
                  setNewAssignment({ title: "", class_id: "", description: "", points: "" });
                }}
              >
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-primary"
                onClick={handleAddAssignment}
                disabled={!newAssignment.title || !newAssignment.class_id}
              >
                Add Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .calendar-view {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .calendar-header {
          margin-bottom: 24px;
        }

        .calendar-nav {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .today-btn {
          padding: 8px 16px;
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          color: #475569;
          transition: all 0.2s;
        }

        .today-btn:hover {
          background: #e2e8f0;
        }

        .nav-btn {
          width: 36px;
          height: 36px;
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          font-size: 18px;
          cursor: pointer;
          color: #475569;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nav-btn:hover {
          background: #e2e8f0;
        }

        .month-year {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
        }

        .calendar-grid {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
        }

        .day-headers {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .day-header {
          padding: 12px;
          text-align: center;
          font-weight: 600;
          color: #64748b;
          font-size: 14px;
        }

        .calendar-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          grid-auto-rows: minmax(120px, auto);
        }

        .calendar-day {
          border-right: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
          padding: 8px;
          cursor: pointer;
          transition: background 0.2s;
          position: relative;
          min-height: 120px;
        }

        .calendar-day:hover {
          background: #f8fafc;
        }

        .calendar-day.other-month {
          background: #fafafa;
          opacity: 0.5;
        }

        .calendar-day.today {
          background: #eff6ff;
        }

        .calendar-day.today .day-number {
          background: #667eea;
          color: white;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .day-number {
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .day-assignments {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .assignment-chip {
          padding: 4px 8px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 4px;
          font-size: 11px;
          color: white;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .assignment-chip.completed {
          background: #94a3b8;
          text-decoration: line-through;
        }

        .assignment-time {
          font-weight: 600;
          display: block;
          font-size: 10px;
          opacity: 0.9;
        }

        .assignment-title {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .more-assignments {
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
          padding: 4px 8px;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: white;
          border-radius: 20px;
          padding: 32px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-title {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 24px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          color: #475569;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .form-input,
        .form-select,
        .form-textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 15px;
          transition: all 0.2s;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .form-textarea {
          resize: vertical;
          font-family: inherit;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        .modal-btn {
          flex: 1;
          padding: 14px 24px;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .modal-btn-secondary {
          background: #f1f5f9;
          color: #475569;
        }

        .modal-btn-secondary:hover {
          background: #e2e8f0;
        }

        .modal-btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .modal-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
        }

        .modal-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .calendar-days {
            grid-auto-rows: minmax(80px, auto);
          }

          .calendar-day {
            min-height: 80px;
            padding: 4px;
          }

          .day-number {
            font-size: 12px;
          }

          .assignment-chip {
            font-size: 10px;
            padding: 2px 6px;
          }
        }
      `}</style>
    </div>
  );
}
