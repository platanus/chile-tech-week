require "net/http"

module Luma
  # The configured cover may live on our site; event/create only accepts Luma's CDN.
  # Cache by bytes (not URL) so replacing an image at the same URL uploads the new cover.
  class CoverUpload
    MAX_BYTES = 5.megabytes
    MAX_REDIRECTS = 3
    CONTENT_TYPES = %w[image/png image/jpeg].freeze

    def initialize(client: Luma.client, config: AppConfig.instance, cache: Rails.cache)
      @client = client
      @config = config
      @cache = cache
    end

    def call
      url = @config.luma_cover_url.presence
      return if url.nil?
      return url if url.start_with?("https://images.lumacdn.com/")

      body, content_type = fetch(url)
      key = ["luma-cover-upload", Digest::SHA256.hexdigest(@config.luma_api_key), content_type, Digest::SHA256.hexdigest(body)]
      @cache.fetch(key, expires_in: 30.days) do
        @client.upload_image(body: body, content_type: content_type)
      end
    end

    private

    def fetch(url, redirects_left = MAX_REDIRECTS)
      uri = URI.parse(url)
      unless uri.is_a?(URI::HTTPS) && uri.host.present? && uri.userinfo.nil?
        raise Error, "La portada de Luma debe tener una URL HTTPS válida."
      end

      body = +"".b
      content_type = nil
      redirect = nil
      Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: Client::OPEN_TIMEOUT, read_timeout: Client::READ_TIMEOUT) do |http|
        http.request(Net::HTTP::Get.new(uri)) do |response|
          case response
          when Net::HTTPRedirection
            raise Error, "La portada de Luma tiene demasiadas redirecciones." if redirects_left.zero?
            raise Error, "La redirección de la portada de Luma no tiene destino." if response["location"].blank?

            redirect = URI.join(url, response["location"]).to_s
          when Net::HTTPSuccess
            content_type = response["content-type"].to_s.split(";").first.to_s.strip.downcase
            raise Error, "La portada de Luma debe ser PNG o JPEG." unless CONTENT_TYPES.include?(content_type)
            raise Error, "La portada de Luma supera los 5 MB." if response["content-length"].to_i > MAX_BYTES

            response.read_body do |chunk|
              body << chunk
              raise Error, "La portada de Luma supera los 5 MB." if body.bytesize > MAX_BYTES
            end
          else
            raise Error, "No se pudo descargar la portada de Luma (HTTP #{response.code})."
          end
        end
      end
      return fetch(redirect, redirects_left - 1) if redirect
      raise Error, "La portada de Luma está vacía." if body.empty?

      [body, content_type]
    rescue Timeout::Error, SystemCallError, IOError, OpenSSL::SSL::SSLError, URI::InvalidURIError
      raise Error, "No se pudo descargar la portada de Luma."
    end
  end
end
