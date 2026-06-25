'use client'

import { useState } from 'react'
import { TaskList } from '@/components/tasks/task-list'
import { RemindersList } from '@/components/tasks/reminders-list'

type Tab = 'tasks' | 'reminders'

export default function TasksPage() {
  const [tab, setTab] = useState<Tab>('tasks')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-headline-lg font-bold text-on-surface">Tareas y recordatorios</h1>
        <p className="text-on-surface-variant text-label-md mt-1">Gestiona tus actividades y alertas</p>
      </div>

      <div className="flex gap-1 bg-surface-container rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('tasks')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-label-md transition-all ${
            tab === 'tasks'
              ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          Tareas
        </button>
        <button
          onClick={() => setTab('reminders')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-label-md transition-all ${
            tab === 'reminders'
              ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">notifications</span>
          Recordatorios
        </button>
      </div>

      {tab === 'tasks' ? <TaskList /> : <RemindersList />}
    </div>
  )
}
