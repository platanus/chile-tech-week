# Mail the site receives, not sends: Cloudflare Email Routing hands every message to the
# `workers/inbound-email` Worker, which posts it to InboundEmailsController. The Router offers it
# to each handler in turn; the first that recognises it consumes it, and everything else is
# dropped without being stored (the Worker then forwards it to a human inbox).
module InboundEmails
  # One received message, as the Worker parsed it. `from` and `to` are bare addresses.
  Message = Data.define(:from, :to, :subject, :text, :message_id) do
    def self.from_params(params)
      new(from: params[:from].to_s.strip.downcase, to: params[:to].to_s.strip.downcase,
        subject: params[:subject].to_s, text: params[:text].to_s, message_id: params[:message_id].to_s)
    end

    def sender_domain
      from.split("@").last.to_s
    end
  end
end
