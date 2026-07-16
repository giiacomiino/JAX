'use client'

import { useState } from 'react'
import { TaskList } from '@/components/tasks/task-list'
import { RemindersList } from '@/components/tasks/reminders-list'

type Tab = 'tasks' | 'reminders'

export default function TasksPage() {
  const [tab, setTab] = useState<Tab>('tasks')

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-headline-lg font-bold text-on-surface">Tareas</h1>
          <p className="text-on-surface-variant text-label-sm sm:text-label-md mt-0.5 hidden sm:block">Gestiona tus actividades y alertas</p>
        </div>
        <div className="flex gap-1 bg-surface-container rounded-xl p-1">
          <button
            onClick={() => setTab('tasks')}
            className={`flex items-center gap-1.5 px-3 sm:px-5 py-2 rounded-lg text-label-md transition-all ${
              tab === 'tasks'
                ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span className="hidden sm:inline">Tareas</span>
          </button>
          <button
            onClick={() => setTab('reminders')}
            className={`flex items-center gap-1.5 px-3 sm:px-5 py-2 rounded-lg text-label-md transition-all ${
              tab === 'reminders'
                ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">notifications</span>
            <span className="hidden sm:inline">Recordatorios</span>
          </button>
        </div>
      </div>

      {tab === 'tasks' ? <TaskList /> : <RemindersList />}
    </div>
  )
}
