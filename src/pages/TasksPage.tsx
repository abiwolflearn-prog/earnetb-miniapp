import React, { useState } from 'react';
import { Task, TaskCategory } from '../types';
import { useTranslation } from '../i18n/useTranslation';
import { Search, CheckCircle2, Zap, MessageSquare, Video, FileText, HelpCircle, Calendar, Sparkles, Filter, ChevronRight } from 'lucide-react';

interface TasksPageProps {
  tasks: Task[];
  completedTaskIds: string[];
  onOpenTaskModal: (task: Task) => void;
  onOpenQuizModal: (task: Task) => void;
  onOpenCheckIn: () => void;
}

export const TasksPage: React.FC<TasksPageProps> = ({
  tasks,
  completedTaskIds,
  onOpenTaskModal,
  onOpenQuizModal,
  onOpenCheckIn
}) => {
  const { t, formatCurrency } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'available' | 'completed'>('available');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories: Array<{ id: TaskCategory | 'all'; label: string; icon: any }> = [
    { id: 'all', label: t('tasks.categories_all'), icon: Zap },
    { id: 'social', label: t('tasks.categories_social'), icon: MessageSquare },
    { id: 'engagement', label: t('tasks.categories_engagement'), icon: Sparkles },
    { id: 'video', label: t('tasks.categories_video'), icon: Video },
    { id: 'article', label: t('tasks.categories_article'), icon: FileText },
    { id: 'quiz', label: t('tasks.categories_quiz'), icon: HelpCircle },
    { id: 'daily', label: t('tasks.categories_daily'), icon: Calendar }
  ];

  const filteredTasks = tasks.filter((task) => {
    const isCompleted = completedTaskIds.includes(task.id);

    if (selectedCategory !== 'all' && task.category !== selectedCategory) {
      return false;
    }

    if (selectedStatus === 'available' && isCompleted) return false;
    if (selectedStatus === 'completed' && !isCompleted) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return task.title.toLowerCase().includes(q) || task.description.toLowerCase().includes(q);
    }

    return true;
  });

  const handleTaskClick = (task: Task) => {
    if (task.category === 'daily') {
      onOpenCheckIn();
    } else if (task.verificationType === 'quiz') {
      onOpenQuizModal(task);
    } else {
      onOpenTaskModal(task);
    }
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-black text-white">{t('tasks.center_title')}</h2>
        <p className="text-xs text-slate-400">{t('tasks.center_subtitle')}</p>
      </div>

      {/* Search Bar & Status Filter */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('tasks.search_placeholder')}
            className="w-full bg-[#0f0f15] border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500/80 transition-all placeholder:text-slate-500"
          />
        </div>

        {/* Status Toggle Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedStatus('available')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              selectedStatus === 'available'
                ? 'bg-indigo-500/20 border border-indigo-500/50 text-indigo-300'
                : 'bg-[#0f0f15] border border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('tasks.available_tasks', { count: tasks.filter(t => !completedTaskIds.includes(t.id)).length })}
          </button>
          <button
            onClick={() => setSelectedStatus('completed')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              selectedStatus === 'completed'
                ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                : 'bg-[#0f0f15] border border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('tasks.completed_tasks', { count: completedTaskIds.length })}
          </button>
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              selectedStatus === 'all'
                ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300'
                : 'bg-[#0f0f15] border border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('tasks.all_tasks', { count: tasks.length })}
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-[#0f0f15] border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.map((task) => {
          const isCompleted = completedTaskIds.includes(task.id);

          return (
            <div
              key={task.id}
              onClick={() => !isCompleted && handleTaskClick(task)}
              className={`p-4 rounded-2xl border transition-all ${
                isCompleted
                  ? 'bg-white/[0.02] border-white/5 opacity-60'
                  : 'bg-white/5 border-white/10 hover:bg-white/[0.08] cursor-pointer'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      {task.category}
                    </span>
                    {task.verificationType === 'quiz' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {t('tasks.quiz_badge')}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-white">{task.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{task.description}</p>
                </div>

                <div className="text-right flex-shrink-0 space-y-2">
                  <div>
                    <span className="text-base font-extrabold text-indigo-400 block">+{formatCurrency(task.rewardBirr)}</span>
                    <span className="text-[10px] text-slate-500">+{task.rewardPoints} {t('home.pts')}</span>
                  </div>

                  {isCompleted ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {t('tasks.done')}
                    </span>
                  ) : (
                    <button className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1">
                      <span>{t('home.start')}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div className="p-10 rounded-3xl bg-[#0f0f15] border border-white/5 text-center space-y-2">
            <Filter className="w-10 h-10 text-slate-500 mx-auto" />
            <h4 className="text-sm font-semibold text-white">{t('tasks.no_tasks_match')}</h4>
            <p className="text-xs text-slate-400">{t('tasks.no_tasks_match_desc')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

