require "net/http"

# wpp-server's REST API (https://wpp.rafafdz.dev, `POST /api/v1/messages`): it queues the
# message and delivers it at a human pace, so a 202 means "accepted", not "sent".
# WhatsappNotifier writes the messages; this only carries them.
class WppClient
  class Error < StandardError; end

  def initialize(api_url:, api_key:)
    raise Error, "wpp-server API key is not configured" if api_key.blank?

    @endpoint = URI.join(api_url, "/api/v1/messages")
    @api_key = api_key
  end

  # `file` is {data: <base64>, filename:, mimetype:} or {url: "https://…"}; the text becomes
  # its caption. The idempotency key makes a retried job a no-op on wpp-server's side.
  def send_message(to:, text:, file: nil, idempotency_key: nil)
    req = Net::HTTP::Post.new(@endpoint)
    req["Content-Type"] = "application/json"
    req["Authorization"] = "Bearer #{@api_key}"
    req["Idempotency-Key"] = idempotency_key if idempotency_key
    req.body = {to: to, text: text, file: file}.compact.to_json
    response = Net::HTTP.start(@endpoint.host, @endpoint.port, use_ssl: @endpoint.scheme == "https", open_timeout: 5, read_timeout: 30) { |http| http.request(req) }
    result = JSON.parse(response.body.presence || "{}")
    raise Error, "wpp-server answered #{response.code}: #{result["error"] || response.body.to_s.first(200)}" unless response.is_a?(Net::HTTPSuccess)

    result
  rescue Timeout::Error, SystemCallError, IOError, OpenSSL::SSL::SSLError, JSON::ParserError => e
    raise Error, "wpp-server request failed: #{e.message}"
  end
end
