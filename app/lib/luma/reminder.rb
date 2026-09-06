module Luma
  # Nudges the hosts whose approved event has sat unpublished for more than a day: the Luma
  # event exists, they were invited to edit it, and the programme is waiting.
  class Reminder
    def initialize(now: Time.current)
      @now = now
    end

    def call
      waiting = ::Event.waiting_luma_edit.where.not(luma_event_url: nil).where(waiting_luma_edit_at: ...(@now - 1.day))
      waiting.find_each do |event|
        days = ((@now - event.waiting_luma_edit_at) / 1.day).floor
        EventMailer.with(event: event, days_waiting: days).luma_reminder.deliver_later
      end
      waiting.count
    end
  end
end
