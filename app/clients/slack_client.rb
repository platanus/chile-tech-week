require "net/http"

# Slack's chat.postMessage as the bot (https://api.slack.com/methods/chat.postMessage).
# SlackNotifier writes the messages; this only carries them.
class SlackClient
  class Error < StandardError; end

  ENDPOINT = URI("https://slack.com/api/chat.postMessage")

  def initialize(bot_token)
    raise Error, "Slack bot token is not configured" if bot_token.blank?

    @bot_token = bot_token
  end

  def post_message(channel:, text:)
    req = Net::HTTP::Post.new(ENDPOINT)
    req["Content-Type"] = "application/json"
    req["Authorization"] = "Bearer #{@bot_token}"
    req.body = {channel: channel, text: text}.to_json
    response = Net::HTTP.start(ENDPOINT.host, ENDPOINT.port, use_ssl: true, open_timeout: 5, read_timeout: 10) { |http| http.request(req) }
    result = JSON.parse(response.body.presence || "{}")
    raise Error, "Slack API error: #{result["error"] || response.code}" unless result["ok"]

    true
  rescue Timeout::Error, SystemCallError, IOError, OpenSSL::SSL::SSLError, JSON::ParserError => e
    raise Error, "Slack request failed: #{e.message}"
  end
end
