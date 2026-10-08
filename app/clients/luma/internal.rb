require "net/http"

module Luma
  # The calls Luma's own web app makes (https://api.luma.com), for what the public API does not
  # offer to a calendar key — chiefly the guests of an event whose host added the site's account.
  # There is no contract here: it signs in the way the website does, with the site's passkey
  # (Luma::Passkey), keeps the session cookie in memory, and signs in again when Luma stops
  # accepting it. Anything unexpected raises Luma::Error, for the caller to surface.
  class Internal
    BASE_URL = "https://api.luma.com".freeze
    SESSION_COOKIE = "luma.auth-session-key".freeze
    OPEN_TIMEOUT = 5
    READ_TIMEOUT = 20
    PAGE = 100

    def initialize(passkey:)
      @passkey = passkey
      @cookie = nil
      @lock = Mutex.new
    end

    # Every guest of the event (`evt-…`), as Luma lists them: email, name, approval status,
    # registration and check-in times. The site's account must be a host of the event.
    def guests(api_id)
      entries = []
      cursor = nil
      loop do
        page = get("/event/admin/get-guests", {event_api_id: api_id, pagination_limit: PAGE, pagination_cursor: cursor,
                                               query: "", sort_column: "registered_or_created_at", sort_direction: "desc"}.compact)
        entries.concat(page.fetch("entries"))
        cursor = page["next_cursor"]
        break unless page["has_more"] && cursor
      end
      entries
    rescue KeyError
      raise Error, "Luma devolvió una lista de invitados inválida."
    end

    private

    def get(path, params)
      sign_in unless @cookie
      response = fetch(path, params)
      if %w[401 403].include?(response.code)
        sign_in(stale: @cookie)
        response = fetch(path, params)
      end
      parse(response, path)
    end

    def fetch(path, params)
      uri = URI("#{BASE_URL}#{path}")
      uri.query = URI.encode_www_form(params)
      send_request(Net::HTTP::Get.new(uri, "Cookie" => "#{SESSION_COOKIE}=#{@cookie}"))
    end

    # One sign-in at a time; `stale` is the cookie that just failed, so a thread that waited on
    # the lock does not sign in again after another one already did.
    def sign_in(stale: nil)
      @lock.synchronize do
        next if @cookie && @cookie != stale

        @cookie = request_session
      end
    end

    def request_session
      options = parse(send_request(post("/auth/passkey/request-authentication-options", {})), "/auth/passkey/request-authentication-options")
      options = options["options_json"] || options
      response = sign_in_response(options)
      raise Error, "Luma rechazó el inicio de sesión con passkey (HTTP #{response.code})." unless response.is_a?(Net::HTTPSuccess)

      cookie = Array(response.get_fields("set-cookie")).filter_map { |value| value[/\A#{Regexp.escape(SESSION_COOKIE)}=([^;]+)/o, 1] }.first
      cookie || raise(Error, "Luma no devolvió una sesión al iniciar con passkey.")
    end

    # Two sign-ins in the same second share a counter, and Luma refuses the second: wait it out once.
    def sign_in_response(options)
      2.times do |attempt|
        body = {authentication_response_json: @passkey.assertion(options, counter: Time.now.to_i)}
        response = send_request(post("/auth/sign-in-with-passkey", body))
        return response unless response.code == "400" && attempt.zero?

        sleep 1.1
      end
    end

    def post(path, body)
      Net::HTTP::Post.new(URI("#{BASE_URL}#{path}"), "Content-Type" => "application/json").tap { |request| request.body = body.to_json }
    end

    def send_request(request)
      request["Origin"] = "https://luma.com"
      request["Referer"] = "https://luma.com/"
      Net::HTTP.start(request.uri.host, request.uri.port, use_ssl: true, open_timeout: OPEN_TIMEOUT, read_timeout: READ_TIMEOUT) do |http|
        http.request(request)
      end
    rescue Timeout::Error, SystemCallError, IOError, OpenSSL::SSL::SSLError => e
      raise Error, "Luma request to #{request.path} failed: #{e.message}"
    end

    def parse(response, path)
      raise Error, "Luma internal API error (#{response.code}) on #{path}" unless response.is_a?(Net::HTTPSuccess)

      response.body.present? ? JSON.parse(response.body) : {}
    rescue JSON::ParserError => e
      raise Error, "Luma answered with invalid JSON on #{path}: #{e.message}"
    end
  end
end
