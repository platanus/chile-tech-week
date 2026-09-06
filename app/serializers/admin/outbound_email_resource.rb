module Admin
  class OutboundEmailResource < ApplicationResource
    typelize_from OutboundEmail
    typelize cc: "string[] | null", bcc: "string[] | null"
    attributes :id, :template_name, :to, :cc, :bcc, :subject, :status, :queued_at, :sent_at, :failure_reason,
      :external_message_id, :created_at
  end
end
