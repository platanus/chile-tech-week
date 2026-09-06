# The last outcome of each scheduled task (ScheduledTask), one row per task id: what the
# admin's "Tareas" page shows next to its "run now" button.
class TaskRun < ApplicationRecord
  STATUSES = %w[success error].freeze

  validates :task_id, presence: true, uniqueness: true
  validates :last_status, inclusion: {in: STATUSES}, allow_nil: true

  def self.record(task_id, error: nil)
    run = find_or_initialize_by(task_id: task_id)
    run.update!(
      last_executed_at: Time.current,
      last_status: error ? "error" : "success",
      last_error: error&.message&.truncate(2000),
      execution_count: run.execution_count + 1
    )
    run
  end
end
