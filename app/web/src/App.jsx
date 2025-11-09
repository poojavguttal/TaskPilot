import { useState } from "react";
import { Calendar, Clock, CheckCircle, Plus, X, Sparkles } from "lucide-react";

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const addTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, newTask.trim()]);
      setNewTask("");
    }
  };

  const removeTask = (index) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addTask();
    }
  };

  const handleSubmit = async () => {
    if (tasks.length === 0) return;
    
    setLoading(true);
    setResult(null);

    const body = {
      tasks_text: tasks,
      created_iso: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      user_id: "demo-user"
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/api/prioritize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      alert("API Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return isoString;
    }
  };

  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (date.toDateString() === today.toDateString()) {
        return "Today";
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return "Tomorrow";
      }
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return "";
    }
  };

  const categoryNames = {
    urgent_important: "🔥 Urgent & Important",
    important_not_urgent: "⭐ Important (Not Urgent)",
    urgent_not_important: "⚡ Urgent (Not Important)",
    not_urgent_not_important: "📋 Low Priority"
  };

  const categoryColors = {
    urgent_important: "bg-red-50 border-red-200",
    important_not_urgent: "bg-blue-50 border-blue-200",
    urgent_not_important: "bg-yellow-50 border-yellow-200",
    not_urgent_not_important: "bg-gray-50 border-gray-200"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            TaskPilot
          </h1>
          <p className="text-gray-600">
            Add your tasks and let AI organize your day
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Add a task... (press Enter)"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button
              onClick={addTask}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              Add
            </button>
          </div>

          {/* Task List */}
          {tasks.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <CheckCircle size={18} />
                Your Tasks ({tasks.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {tasks.map((task, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 group hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-gray-700">{task}</span>
                    <button
                      onClick={() => removeTask(index)}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || tasks.length === 0}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Organizing your tasks...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Generate My Schedule
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-6 animate-fade-in">
            {/* Motivation Note */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg p-6">
              <p className="text-lg font-medium text-center">{result.note}</p>
            </div>

            {/* Schedule */}
            <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Calendar size={24} />
                Your Time-Blocked Schedule
              </h2>

              <div className="space-y-3">
                {result.schedule_plan && result.schedule_plan.length > 0 ? (
                  result.schedule_plan.map((item, idx) => {
                    const prevDate = idx > 0 ? formatDate(result.schedule_plan[idx - 1].start_iso) : null;
                    const currentDate = formatDate(item.start_iso);
                    const showDateHeader = prevDate !== currentDate;

                    return (
                      <div key={idx}>
                        {showDateHeader && (
                          <div className="font-semibold text-gray-600 text-sm mt-4 mb-2 flex items-center gap-2">
                            <Calendar size={16} />
                            {currentDate}
                          </div>
                        )}
                        <div className="flex items-start gap-4 bg-gradient-to-r from-gray-50 to-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                          <div className="flex flex-col items-center min-w-[80px] text-center">
                            <div className="text-indigo-600 font-bold text-lg">
                              {formatTime(item.start_iso)}
                            </div>
                            <div className="text-gray-400 text-xs">to</div>
                            <div className="text-purple-600 font-semibold">
                              {formatTime(item.end_iso)}
                            </div>
                          </div>
                          <div className="flex-1 pt-1">
                            <div className="font-medium text-gray-800 text-lg">
                              {item.task}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-center py-4">No schedule generated</p>
                )}
              </div>
            </div>

            {/* Eisenhower Matrix */}
            <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">Task Categories</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(categoryNames).map(([key, name]) => {
                  const tasks = result[key] || [];
                  if (tasks.length === 0) return null;
                  
                  return (
                    <div
                      key={key}
                      className={`rounded-lg p-4 border-2 ${categoryColors[key]}`}
                    >
                      <h3 className="font-semibold text-gray-700 mb-2">{name}</h3>
                      <ul className="space-y-1">
                        {tasks.map((task, idx) => (
                          <li key={idx} className="text-gray-600 text-sm flex items-start gap-2">
                            <span className="text-gray-400 mt-1">•</span>
                            <span>{task}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}