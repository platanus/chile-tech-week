module Admin
  # POST /admin/tasks/:task_id/run — runs the task now, in the request, and reports.
  class TaskRunsController < BaseController
    def create
      task = ScheduledTask.find(params[:task_id])
      ScheduledTask.run(task.id)
      redirect_to admin_tasks_path, notice: "Tarea #{task.id} ejecutada."
    rescue ArgumentError
      redirect_to admin_tasks_path, alert: "Tarea desconocida."
    rescue => e
      redirect_to admin_tasks_path, alert: "La tarea #{params[:task_id]} falló: #{e.message}"
    end
  end
end
