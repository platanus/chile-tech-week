# Every 10 minutes: mirrors what hosts changed on Luma (title, dates, URL, cover and Markdown
# body) into the events awaiting edit or published, and takes down the ones cancelled there.
class SyncLumaEventsJob < ApplicationJob
  include RecordsTaskRun

  TASK_ID = "sync-luma-events".freeze

  def perform
    Luma::Sync.new.call
  end
end
