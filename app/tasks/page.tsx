import { TaskList } from '@/components/tasks/task-list'

export default function TasksPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-headline-lg font-bold text-on-surface">Tareas</h1>
        <p className="text-on-surface-variant text-label-md mt-1">Gestiona tus actividades</p>
      </div>
      <TaskList />
    </div>
  )
}
