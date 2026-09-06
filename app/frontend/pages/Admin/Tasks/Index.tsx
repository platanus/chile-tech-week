import { Head, router } from '@inertiajs/react';
import { CheckCircle2, Clock, Play, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Field, Flash, formatDateTime, PageTitle } from '@/components/admin/ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { admin_task_run_path } from '@/routes';
import type { AdminTask, AdminTasksIndex } from '@/types';

function StatusBadge({ task }: { task: AdminTask }) {
  if (!task.lastStatus) return <Badge variant="outline" className="rounded-sm font-mono text-[11px] uppercase tracking-wider">Nunca</Badge>;
  if (task.lastStatus === 'success') {
    return <Badge variant="outline" className="rounded-sm border-emerald-300 bg-emerald-50 font-mono text-[11px] uppercase tracking-wider text-emerald-800"><CheckCircle2 /> Éxito</Badge>;
  }
  return <Badge variant="outline" className="rounded-sm border-red-200 bg-red-50 font-mono text-[11px] uppercase tracking-wider text-red-700"><XCircle /> Error</Badge>;
}

// /admin/tasks — the scheduled tasks, their last run, and a button to run one now.
export default function Index({ tasks }: AdminTasksIndex) {
  const [running, setRunning] = useState<string | null>(null);
  const run = (task: AdminTask) => router.post(admin_task_run_path(task.id), {}, { onStart: () => setRunning(task.id), onFinish: () => setRunning(null) });

  return (
    <>
      <Head>
        <title>Tareas · Admin</title>
      </Head>
      <Flash />
      <PageTitle title="Tareas" subtitle="Lo que corre solo en el servidor, y cómo le fue la última vez." action={<div className="font-mono text-xs text-muted-foreground">Total: {tasks.length} tareas</div>} />
      <ul className="flex flex-col gap-3">
        {tasks.map((task) => (
          <li key={task.id} className="flex flex-wrap items-start justify-between gap-4 rounded-sm border border-border p-5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-mono font-bold">{task.id}</h2>
                <StatusBadge task={task} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Field label="Programación"><span className="flex items-center gap-1.5"><Clock className="size-3.5 text-muted-foreground" />{task.schedule}</span></Field>
                <Field label="Última ejecución"><span className="font-mono">{formatDateTime(task.lastExecutedAt, true)}</span></Field>
                <Field label="Ejecuciones"><span className="font-mono">{task.executionCount}</span></Field>
                {task.lastError && <Field label="Último error" className="sm:col-span-3"><p className="font-mono text-xs text-primary">{task.lastError}</p></Field>}
              </div>
            </div>
            <Button variant="outline" onClick={() => run(task)} disabled={running !== null}>
              {running === task.id ? <><Clock className="animate-spin" /> Ejecutando…</> : <><Play /> Ejecutar ahora</>}
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}
