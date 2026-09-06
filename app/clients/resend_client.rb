require "net/http"

# Resend's send endpoint (https://resend.com/docs/api-reference/emails/send-email), the one
# call OutboundEmail::Delivery makes. Returns the message id; raises on anything but 2xx.
class ResendClient
  class Error < StandardError; end

  ENDPOINT = URI("https://api.resend.com/emails")

  def initialize(api_key)
    raise Error, "Resend API key is not configured" if api_key.blank?

    @api_key = api_key
  end

  def send_email(from:, to:, subject:, html:, text: nil, cc: nil, bcc: nil, reply_to: nil)
    req = Net::HTTP::Post.new(ENDPOINT)
    req["Content-Type"] = "application/json"
    req["Authorization"] = "Bearer #{@api_key}"
    req.body = {from: from, to: Array(to), cc: cc.presence, bcc: bcc.presence, reply_to: reply_to.presence,
                subject: subject, html: html, text: text.presence}.compact.to_json
    response = Net::HTTP.start(ENDPOINT.host, ENDPOINT.port, use_ssl: true, open_timeout: 5, read_timeout: 20) { |http| http.request(req) }
    body = JSON.parse(response.body.presence || "{}")
    unless response.is_a?(Net::HTTPSuccess)
      raise Error, "Resend API error (#{response.code}): #{body["name"] || "Unknown"} - #{body["message"] || response.body}"
    end
    body.fetch("id")
  rescue Timeout::Error, SystemCallError, IOError, OpenSSL::SSL::SSLError, JSON::ParserError => e
    raise Error, "Resend request failed: #{e.message}"
  end
end
