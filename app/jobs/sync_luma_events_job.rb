# Every 10 minutes: mirrors what hosts changed on Luma (title, dates, URL) into the events
# awaiting edit or published, and takes down the ones cancelled there. Filled in by the
# main session; this is the contract the admin's task page runs.
class SyncLumaEventsJob < ApplicationJob
  include RecordsTaskRun

  TASK_ID = "sync-luma-events".freeze

  def perform
    Luma::Sync.new.call
  end
end
