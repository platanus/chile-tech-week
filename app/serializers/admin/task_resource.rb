module Admin
  # A ScheduledTask with its last TaskRun folded in.
  class TaskResource < ApplicationResource
    typelize id: :string, schedule: :string, description: :string, job_class: :string,
      last_executed_at: [:string, nullable: true], last_status: [:string, nullable: true],
      last_error: [:string, nullable: true], execution_count: :number
    attributes :id, :schedule, :description, :job_class
    attribute(:last_executed_at) { |task| task.last_run&.last_executed_at }
    attribute(:last_status) { |task| task.last_run&.last_status }
    attribute(:last_error) { |task| task.last_run&.last_error }
    attribute(:execution_count) { |task| task.last_run&.execution_count || 0 }
  end
end
