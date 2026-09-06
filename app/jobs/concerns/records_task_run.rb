# A scheduled job (ScheduledTask) records its outcome in TaskRun, success or error, and
# re-raises so Solid Queue still sees the failure.
module RecordsTaskRun
  extend ActiveSupport::Concern

  included do
    around_perform do |job, block|
      block.call
      TaskRun.record(job.class::TASK_ID)
    rescue => e
      TaskRun.record(job.class::TASK_ID, error: e)
      raise
    end
  end
end
