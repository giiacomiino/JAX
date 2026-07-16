'use client'

import { format, isPast, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Task } from '@/types'

const priorityColors = {
  high: 'bg-error/10 text-error border-error/20',
  medium: 'bg-secondary-container/30 text-secondary border-secondary-container/40',
  low: 'bg-surface-container-high text-on-surface-variant border-outline-variant',
}

const priorityLabels = { high: 'Alta', medium: 'Media', low: 'Baja' }
const categoryLabels = { work: 'Trabajo', personal: 'Personal', finance: 'Finanzas', other: 'Otro' }

interface TaskCardProps {
  task: Task
  onComplete: (id: string) => void
  onDelete: (id: string) => void
}

export function TaskCard({ task, onComplete, onDelete }: TaskCardProps) {
  const isCompleted = task.status === 'completed'
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isCompleted
  const isDueToday = task.due_date && isToday(new Date(task.due_date))

  const completedAt = isCompleted && task.updated_at
    ? format(new Date(task.updated_at), "d 'de' MMM", { locale: es })
    : null

  return (
    <div className={`p-4 rounded-xl border transition-all ${
      isCompleted
        ? 'bg-surface border-outline-variant'
        : isOverdue
        ? 'bg-error-container/30 border-error/30'
        : 'bg-surface-container-lowest border-outline-variant hover:shadow-sm'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {isCompleted && (
            <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[13px] text-primary" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}>check</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className={`text-body-md font-medium ${isCompleted ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-on-surface-variant text-label-md mt-1">{task.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {!isCompleted && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-label-sm border ${priorityColors[task.priority]}`}>
                  {priorityLabels[task.priority]}
                </span>
              )}
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-label-sm bg-surface-container border border-outline-variant text-on-surface-variant">
                {categoryLabels[task.category]}
              </span>
              {task.due_date && (
                <span className={`text-label-sm flex items-center gap-1 ${
                  isCompleted ? 'text-on-surface-variant' :
                  isOverdue ? 'text-error font-semibold' :
                  isDueToday ? 'text-secondary font-semibold' :
                  'text-on-surface-variant'
                }`}>
                  <span className="material-symbols-outlined text-[11px]">
                    {isCompleted ? 'event' : isOverdue ? 'warning' : 'calendar_today'}
                  </span>
                  {!isCompleted && (isOverdue ? 'Vencida · ' : isDueToday ? 'Hoy · ' : '')}
                  {isCompleted ? 'Objetivo: ' : ''}
                  {format(new Date(task.due_date), "d MMM", { locale: es })}
                </span>
              )}
              {completedAt && (
                <span className="text-label-sm text-primary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[11px]">check_circle</span>
                  Completada {completedAt}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {!isCompleted && (
            <button
              onClick={() => onComplete(task.id)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors"
              title="Completar"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
            </button>
          )}
          <button
            onClick={() => onDelete(task.id)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors"
            title="Eliminar"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>
    </div>
  )
}
