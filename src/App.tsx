import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import {
  Search, Plus, Inbox, Calendar as CalendarIcon, Clock, SlidersHorizontal,
  Archive, CheckCircle2, Circle, MoreVertical, Play, Menu, X, AlertTriangle
} from 'lucide-react';

// Types
interface Task {
  id: string;
  title: string;
  description: string;
  date: string;
  status: 'Pending' | 'Done';
  priority: 'High' | 'Medium' | 'Low';
}

// Mock Data Fallback
const MOCK_TASKS: Task[] = [
  { id: '1', title: 'Q4 Quarterly Review Presentation', description: 'Prepare the data visualization for the executive board meeting including revenue growth and retention metrics.', date: 'Oct 24, 2023', status: 'Pending', priority: 'High' },
  { id: '2', title: 'Update Team Handbook', description: 'Revise the remote work policy section to include new hybrid office hours.', date: 'Oct 22, 2023', status: 'Done', priority: 'Low' },
  { id: '3', title: 'Interview Design Lead Candidates', description: 'Conduct first-round interviews with the top three candidates from the portfolio review.', date: 'Oct 25, 2023', status: 'Pending', priority: 'Medium' }
];

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRhaZ_MaXxD0Pffxb6wmBSGEiFyWAaFYN-tFg9JxIE-vAtHt2-E_Lb91ON486rgjgoXW-fG1TAKGOBQ/pub?gid=0&single=true&output=csv';

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyt3T9XYfVAaiQpPzy6XVOi6NEaPzEy_PvY14j1Wy88CxDxCGXorEzvTxSBDuHOebtO/exec';

const syncWithSheet = async (action: 'add' | 'update' | 'delete', task: Partial<Task>) => {
  try {
    await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, task })
    });
  } catch (error) {
    console.error("Failed to sync with Google Sheets:", error);
  }
};

const Sidebar: React.FC<{ 
  isOpen: boolean; 
  setIsOpen: (v: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tasks: Task[];
}> = ({ isOpen, setIsOpen, activeTab, setActiveTab, tasks }) => {
  const navItems = [
    { icon: Inbox, label: 'Inbox' },
    { icon: CalendarIcon, label: 'Today' },
    { icon: Clock, label: 'Upcoming' },
    { icon: AlertTriangle, label: 'Delayed' },
    { icon: SlidersHorizontal, label: 'Filters' },
    { icon: Archive, label: 'Archive' },
  ];

  const pendingCount = tasks.filter(t => t.status === 'Pending').length;
  const totalCount = tasks.length || 1;
  const completedCount = tasks.filter(t => t.status === 'Done').length;
  const progressPercentage = Math.round((completedCount / totalCount) * 100);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setIsOpen(false)} />
      )}
      
      {/* Sidebar Container */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-[#f2f4f7] flex flex-col
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Profile */}
        <div className="p-6 flex items-center gap-3">
          <div>
            <h2 className="font-display font-bold text-[#191c1e]">Varun</h2>
            <p className="text-xs text-[#424752]">Focus: Deep Work</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setIsOpen(false)}>
            <X size={20} className="text-[#424752]" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 space-y-1">
          {navItems.map((item, idx) => {
            const isActive = activeTab === item.label;
            return (
              <button 
                key={idx} 
                onClick={() => {
                  setActiveTab(item.label);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors
                  ${isActive ? 'bg-white text-[#00488d] shadow-sm' : 'text-[#424752] hover:bg-white/50 hover:text-[#191c1e]'}
                `}
              >
                <item.icon size={18} className={isActive ? 'text-[#00488d]' : 'text-[#424752]'} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Bottom Progress */}
        <div className="p-6">
          <div className="bg-[#e6e8eb] rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-[#191c1e]">{pendingCount} Tasks Left</span>
            </div>
            <div className="h-1.5 w-full bg-white rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#00488d] rounded-full transition-all duration-500" 
                style={{ width: `${progressPercentage}%` }} 
              />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

const MetricCard: React.FC<{ title: string, value: string | number, valueColor?: string }> = ({ title, value, valueColor = 'text-[#191c1e]' }) => (
  <div className="bg-white rounded-2xl p-6 shadow-[0_12px_32px_rgba(25,28,30,0.02)] flex-1 min-w-[150px]">
    <h3 className="text-sm font-medium text-[#424752] mb-2">{title}</h3>
    <p className={`font-display font-bold text-4xl ${valueColor}`}>{value}</p>
  </div>
);

const TaskItem: React.FC<{
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}> = ({ task, onToggle, onEdit, onDelete }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isDone = task.status === 'Done';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const taskDate = new Date(task.date);
  taskDate.setHours(0, 0, 0, 0);
  const isOverdue = !isDone && task.date !== 'No Date' && !isNaN(taskDate.getTime()) && taskDate.getTime() < today.getTime();
  
  const priorityStyles = {
    High: { badge: 'bg-[#feb246]/20 text-[#2a1800]', border: 'border-[#feb246]' },
    Medium: { badge: 'bg-[#00488d]/10 text-[#00488d]', border: 'border-[#00488d]' },
    Low: { badge: 'bg-gray-100 text-gray-600', border: 'border-transparent' }
  };

  const style = priorityStyles[task.priority] || priorityStyles.Low;

  return (
    <div className={`
      bg-white rounded-2xl p-5 flex gap-4 transition-all duration-200
      shadow-[0_12px_32px_rgba(25,28,30,0.02)] hover:shadow-[0_12px_32px_rgba(25,28,30,0.06)]
      border-l-4 ${isDone ? 'border-transparent opacity-75' : style.border}
    `}>
      <button onClick={() => onToggle(task.id)} className="mt-1 flex-shrink-0">
        {isDone ? (
          <CheckCircle2 className="text-[#007021] fill-[#007021]/10" size={24} />
        ) : (
          <Circle className="text-gray-300 hover:text-[#00488d] transition-colors" size={24} />
        )}
      </button>
      
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
          <h4 className={`font-semibold text-lg truncate ${isDone ? 'line-through text-gray-400' : 'text-[#191c1e]'}`}>
            {task.title}
          </h4>
          <span className={`
            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap
            ${style.badge}
          `}>
            {task.priority}
          </span>
        </div>
        
        <p className={`text-sm mb-4 line-clamp-2 ${isDone ? 'text-gray-400' : 'text-[#424752]'}`}>
          {task.description}
        </p>
        
        <div className="flex items-center gap-3">
          <span className={`text-xs flex items-center gap-1.5 px-2 py-1 rounded-md ${isOverdue ? 'bg-red-50 text-red-600' : 'bg-[#f2f4f7] text-[#424752]'}`}>
            <CalendarIcon size={14} /> {task.date}
          </span>
          {isDone ? (
            <span className="text-xs px-2 py-1 rounded-md bg-[#007021]/10 text-[#002105] flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={14} /> Done
            </span>
          ) : isOverdue ? (
            <span className="text-xs px-2 py-1 rounded-md bg-red-100 text-red-700 flex items-center gap-1.5 font-medium">
              <AlertTriangle size={14} /> Delayed
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-md bg-[#feb246]/20 text-[#2a1800] flex items-center gap-1.5 font-medium">
              <Clock size={14} /> Pending
            </span>
          )}
        </div>
      </div>
      
      <div className="flex flex-col items-end justify-between ml-2 relative">
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="text-gray-400 hover:text-[#191c1e] transition-colors p-1 rounded-md hover:bg-gray-100"
        >
          <MoreVertical size={20} />
        </button>
        
        {isMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
            <div className="absolute top-8 right-0 w-32 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1 overflow-hidden">
              <button
                onClick={() => { onEdit(task); setIsMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-[#191c1e] hover:bg-gray-50 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => { onDelete(task.id); setIsMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const RightSidebar: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const completed = tasks.filter(t => t.status === 'Done').length;
  const total = tasks.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const strokeDasharray = `${percentage}, 100`;

  return (
    <aside className="hidden xl:flex flex-col w-80 p-8 space-y-8 bg-[#f7f9fc] h-screen sticky top-0 overflow-y-auto">
      {/* Daily Progress */}
      <div>
        <h3 className="font-display font-bold text-lg text-[#191c1e] mb-4">Daily Progress</h3>
        <div className="bg-white rounded-2xl p-6 shadow-[0_12px_32px_rgba(25,28,30,0.02)] flex flex-col items-center text-center">
          <div className="relative w-32 h-32 mb-4">
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              {/* Background Circle */}
              <path
                className="text-[#f2f4f7]"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />
              {/* Progress Circle */}
              <path
                className="text-[#00488d] transition-all duration-1000 ease-out"
                strokeDasharray={strokeDasharray}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display font-bold text-2xl text-[#191c1e]">{percentage}%</span>
            </div>
          </div>
          <h4 className="font-semibold text-[#191c1e] mb-1">Great Start, Varun!</h4>
          <p className="text-sm text-[#424752]">
            {total > 0 
              ? `Finish ${total - completed} more tasks to reach your daily goal of ${total} tasks.`
              : "You have no tasks yet. Add some to get started!"}
          </p>
        </div>
      </div>
    </aside>
  );
};

const TaskModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id' | 'status'>) => void;
  initialData?: Task | null;
}> = ({ isOpen, onClose, onSave, initialData }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Low');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description);
      
      // Try to format date for input type="date"
      let formattedDate = initialData.date;
      try {
        const d = new Date(initialData.date);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toISOString().split('T')[0];
        }
      } catch (e) {}
      
      setDate(formattedDate);
      setPriority(initialData.priority);
    } else {
      setTitle('');
      setDescription('');
      setDate('');
      setPriority('Low');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ title, description, date, priority });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-display font-bold text-[#191c1e]">
            {initialData ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#191c1e] mb-1">Task Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00488d]/20"
              placeholder="e.g. Update Team Handbook"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#191c1e] mb-1">Description</label>
            <textarea
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00488d]/20 resize-none h-24"
              placeholder="Add details about this task..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#191c1e] mb-1">Due Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00488d]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#191c1e] mb-1">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00488d]/20 bg-white"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-[#424752] hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#00488d] hover:bg-[#005fb8] rounded-xl transition-colors shadow-sm"
            >
              Save Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Inbox');

  useEffect(() => {
    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const parsedTasks = results.data.map((row: any, index: number) => ({
            id: row.id || row.Id || String(index + 1),
            title: row.title || row.Title || row['Task Name'] || 'Untitled Task',
            description: row.description || row.Description || row.Desc || '',
            date: row.date || row.Date || row['Due Date'] || 'No Date',
            status: (row.status === 'Done' || row.Status === 'Done' ? 'Done' : 'Pending') as 'Pending' | 'Done',
            priority: (row.priority || row.Priority || 'Low') as 'High' | 'Medium' | 'Low',
          }));
          setTasks(parsedTasks);
        } else {
          setTasks(MOCK_TASKS);
        }
        setLoading(false);
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        setTasks(MOCK_TASKS);
        setLoading(false);
      }
    });
  }, []);

  const toggleTaskStatus = (id: string) => {
    setTasks(prevTasks => {
      const taskIndex = prevTasks.findIndex(t => t.id === id);
      if (taskIndex === -1) return prevTasks;
      
      const newTasks = [...prevTasks];
      const updatedTask = { 
        ...newTasks[taskIndex], 
        status: newTasks[taskIndex].status === 'Done' ? 'Pending' : 'Done' as const 
      };
      newTasks[taskIndex] = updatedTask;
      
      // Sync with Google Sheets
      syncWithSheet('update', updatedTask);
      
      return newTasks;
    });
  };

  const handleSaveTask = (taskData: Omit<Task, 'id' | 'status'>) => {
    if (editingTask) {
      const updatedTask = { ...editingTask, ...taskData };
      setTasks(prev => prev.map(t => t.id === editingTask.id ? updatedTask : t));
      syncWithSheet('update', updatedTask);
    } else {
      const newTask: Task = {
        ...taskData,
        id: Date.now().toString(),
        status: 'Pending'
      };
      setTasks(prev => [newTask, ...prev]);
      syncWithSheet('add', newTask);
    }
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    syncWithSheet('delete', { id });
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleNewTask = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const completedToday = tasks.filter(t => t.status === 'Done').length;
  const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
  const efficiencyScore = tasks.length > 0 ? Math.round((completedToday / tasks.length) * 100) : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = (dateString: string) => {
    if (dateString === 'No Date') return false;
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return false;
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  };

  const isFuture = (dateString: string) => {
    if (dateString === 'No Date') return false;
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return false;
    d.setHours(0, 0, 0, 0);
    return d.getTime() > today.getTime();
  };

  const isOverdueTask = (dateString: string, status: string) => {
    if (status === 'Done') return false;
    if (dateString === 'No Date') return false;
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return false;
    d.setHours(0, 0, 0, 0);
    return d.getTime() < today.getTime();
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'Inbox') return true;
    if (activeTab === 'Today') return isToday(task.date);
    if (activeTab === 'Upcoming') return isFuture(task.date);
    if (activeTab === 'Delayed') return isOverdueTask(task.date, task.status);
    if (activeTab === 'Archive') return task.status === 'Done';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-[#191c1e] font-sans flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white p-4 flex items-center justify-between shadow-sm z-30 relative">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-[#424752]">
            <Menu size={24} />
          </button>
          <h1 className="font-display font-bold text-xl">My Tasks</h1>
        </div>
      </header>

      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tasks={tasks}
      />

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto w-full max-w-5xl mx-auto">
        
        {/* Top Bar (Desktop) */}
        <div className="hidden lg:flex items-center justify-between mb-8">
          <h1 className="font-display font-bold text-2xl">My Tasks</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..." 
                className="pl-10 pr-4 py-2.5 bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-[#00488d]/20 outline-none w-64 shadow-[0_2px_8px_rgba(25,28,30,0.04)]"
              />
            </div>
            <button 
              onClick={handleNewTask}
              className="bg-gradient-to-br from-[#00488d] to-[#005fb8] text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:shadow-md transition-shadow"
            >
              <Plus size={18} /> New Task
            </button>
          </div>
        </div>

        {/* Mobile Search & Add */}
        <div className="lg:hidden flex gap-2 mb-6">
           <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..." 
                className="w-full pl-10 pr-4 py-3 bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-[#00488d]/20 outline-none shadow-[0_2px_8px_rgba(25,28,30,0.04)]"
              />
            </div>
            <button 
              onClick={handleNewTask}
              className="bg-[#00488d] text-white p-3 rounded-xl flex-shrink-0 shadow-sm"
            >
              <Plus size={20} />
            </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <MetricCard title="Completed Today" value={completedToday} valueColor="text-[#007021]" />
          <MetricCard title="Pending Tasks" value={pendingTasks} valueColor="text-[#feb246]" />
          <MetricCard title="Efficiency Score" value={`${efficiencyScore}%`} valueColor="text-[#00488d]" />
        </div>

        {/* Task List Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-bold text-xl text-[#191c1e]">{activeTab}</h2>
            <button className="text-sm font-semibold text-[#00488d] hover:underline">View All</button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00488d]"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  onToggle={toggleTaskStatus}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                />
              ))}
              {filteredTasks.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                  <p className="text-[#424752]">
                    {searchQuery ? 'No tasks match your search.' : 'No active tasks found.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <RightSidebar tasks={tasks} />
      
      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        initialData={editingTask}
      />
    </div>
  );
}
