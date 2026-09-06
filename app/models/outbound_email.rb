# Every email the app sent, or tried to: the rendered message, who it went to and what Resend
# answered. Written by OutboundEmail::Delivery (the Action Mailer delivery method); read by
# the admin's email log, which can resend any of them.
class OutboundEmail < ApplicationRecord
  STATUSES = %w[queued pending sent failed].freeze

  enum :status, STATUSES.index_by(&:itself), validate: true

  validates :template_name, :to, :subject, :html_content, presence: true

  scope :newest_first, -> { order(created_at: :desc) }
  # Every EventMailer message carries its event in template_data (the X-Template-Data
  # header); that event's `edition` is the Tech Week the message belongs to.
  scope :for_week, ->(week) {
    where("outbound_emails.template_data->>'event_id' IN (SELECT events.id::text FROM events WHERE events.edition = ?)", week.year)
  }
  scope :search, ->(query) {
    term = "%#{sanitize_sql_like(query.to_s.strip)}%"
    where("outbound_emails.to ILIKE :q OR subject ILIKE :q OR template_name ILIKE :q", q: term)
  }

  Stats = Data.define(:total, :sent, :failed) do
    def success_rate
      total.zero? ? 0 : (sent * 100.0 / total).round
    end
  end

  def self.stats
    counts = group(:status).count
    Stats.new(total: counts.values.sum, sent: counts.fetch("sent", 0), failed: counts.fetch("failed", 0))
  end

  def mark_sent!(external_message_id)
    update!(status: "sent", sent_at: Time.current, external_message_id: external_message_id, failure_reason: nil)
  end

  def mark_failed!(reason)
    update!(status: "failed", failure_reason: reason.to_s.truncate(2000))
  end

  # Sends the stored message again, as a new log entry (the original keeps its outcome).
  def resend!
    Delivery.send_stored(self)
  end
end
