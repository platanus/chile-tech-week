# The recurring jobs (config/recurring.yml runs them on the server through Solid Queue), as
# the admin's "Tareas" page lists them: id, schedule, the job, and its last outcome (TaskRun).
ScheduledTask = Data.define(:id, :schedule, :job_class, :description) do
  def self.all
    self::ALL
  end

  def self.find(id)
    self::ALL.find { |task| task.id == id } or raise ArgumentError, "unknown task #{id}"
  end

  # Runs the task now, in this process, recording the outcome like the schedule would.
  def self.run(id)
    task = find(id)
    task.job_class.constantize.perform_now
    TaskRun.find_by(task_id: id)
  end

  def run
    self.class.run(id)
  end

  def last_run
    TaskRun.find_by(task_id: id)
  end
end

ScheduledTask::ALL = [
  ScheduledTask.new(id: "sync-luma-events", schedule: "cada 10 minutos", job_class: "SyncLumaEventsJob",
    description: "Trae de Luma los cambios de título, fechas y URL de los eventos aprobados; da de baja los cancelados."),
  ScheduledTask.new(id: "luma-reminder", schedule: "todos los días a las 10:00", job_class: "LumaReminderJob",
    description: "Recuerda a los organizadores que llevan más de un día sin publicar su evento de Luma.")
].freeze
