require "net/http"

module Luma
  # The calls the site makes. Every method returns parsed JSON (or a Luma::Event) and raises
  # Luma::Error on anything but 2xx (Luma::NotFound on 404).
  class Client
    BASE_URL = "https://public-api.luma.com/v1".freeze
    OPEN_TIMEOUT = 5
    READ_TIMEOUT = 20

    def initialize(api_key)
      raise Error, "Luma API key is not configured" if api_key.blank?

      @api_key = api_key
    end

    def get_self
      get("/user/get-self")
    end

    # The event Luma holds, cover included. The endpoint answers `{"event": {...}}`; newer
    # documented shapes return the event itself, so both are accepted.
    def get_event(api_id)
      body = get("/event/get", api_id: api_id)
      Event.from_api(body["event"] || body)
    end

    # name, start_at, end_at (ISO 8601), timezone, description_md, cover_url, visibility
    # (public / private / member-only), location, geo_address_json, capacity, tint_color.
    # Luma only accepts a cover_url it hosts itself (https://images.lumacdn.com/…).
    def create_event(attributes)
      Event.from_api(post("/event/create", attributes))
    end

    # The signed PUT goes directly to storage; never send the Luma API key there.
    def upload_image(body:, content_type:)
      upload = post("/images/create-upload-url", content_type: content_type)
      uri = URI.parse(upload.fetch("upload_url"))
      file_url = upload.fetch("file_url")
      unless uri.is_a?(URI::HTTPS) && uri.host.present? && uri.userinfo.nil? && file_url.is_a?(String) && file_url.start_with?("https://images.lumacdn.com/")
        raise Error, "Luma devolvió una URL de carga inválida."
      end

      req = Net::HTTP::Put.new(uri)
      req["Content-Type"] = content_type
      req.body = body
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: OPEN_TIMEOUT, read_timeout: READ_TIMEOUT) do |http|
        http.request(req)
      end
      # Do not expose the signed URL or storage response in logs or admin errors.
      raise Error, "No se pudo subir la portada a Luma (HTTP #{response.code})." unless response.is_a?(Net::HTTPSuccess)

      file_url
    rescue KeyError, TypeError, URI::InvalidURIError
      raise Error, "Luma devolvió una respuesta de carga inválida."
    rescue Timeout::Error, SystemCallError, IOError, OpenSSL::SSL::SSLError
      raise Error, "No se pudo subir la portada a Luma."
    end

    def update_event(api_id, attributes)
      post("/event/update", {event_api_id: api_id}.merge(attributes))
    end

    def add_host(api_id, email)
      post("/event/add-host", event_api_id: api_id, email: email)
    end

    private

    def get(path, params = {})
      uri = URI("#{BASE_URL}#{path}")
      uri.query = URI.encode_www_form(params) if params.any?
      request(Net::HTTP::Get.new(uri), uri)
    end

    def post(path, body)
      uri = URI("#{BASE_URL}#{path}")
      req = Net::HTTP::Post.new(uri)
      req.body = body.compact.to_json
      request(req, uri)
    end

    def request(req, uri)
      req["Content-Type"] = "application/json"
      req["x-luma-api-key"] = @api_key
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: OPEN_TIMEOUT, read_timeout: READ_TIMEOUT) do |http|
        http.request(req)
      end
      parse(response, uri.path)
    rescue Timeout::Error, SystemCallError, IOError, OpenSSL::SSL::SSLError => e
      raise Error, "Luma request to #{uri.path} failed: #{e.message}"
    end

    def parse(response, path)
      body = response.body.to_s
      unless response.is_a?(Net::HTTPSuccess)
        message = "Luma API error (#{response.code}) on #{path}: #{body.presence || "Unknown error"}"
        raise (response.code == "404") ? NotFound.new(message) : Error.new(message)
      end
      body.present? ? JSON.parse(body) : {}
    rescue JSON::ParserError => e
      raise Error, "Luma answered with invalid JSON on #{path}: #{e.message}"
    end
  end
end
