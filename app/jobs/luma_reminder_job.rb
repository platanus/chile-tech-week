# Daily at 10:00: nudges the hosts whose Luma event has waited more than a day for its edit.
class LumaReminderJob < ApplicationJob
  include RecordsTaskRun

  TASK_ID = "luma-reminder".freeze

  def perform
    Luma::Reminder.new.call
  end
end
