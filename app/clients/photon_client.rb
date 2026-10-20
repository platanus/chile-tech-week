require "net/http"

# Photon's search API (https://github.com/komoot/photon): the geocoder behind the submission
# form's address field. Production runs its own instance (the `photon` service, a Chile-only
# index); development falls back to komoot's public one. GeocodeController is its only caller.
class PhotonClient
  class Error < StandardError; end

  def initialize(url:)
    @endpoint = URI.join(url.end_with?("/") ? url : "#{url}/", "api")
  end

  # `params` is a list of [name, value] pairs, `layer` repeating. Returns the raw JSON body.
  def search(params)
    uri = @endpoint.dup
    uri.query = URI.encode_www_form(params)
    response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https", open_timeout: 3, read_timeout: 10) do |http|
      http.request(Net::HTTP::Get.new(uri, "User-Agent" => "techweek.cl"))
    end
    raise Error, "Photon answered #{response.code}" unless response.is_a?(Net::HTTPSuccess)

    response.body
  rescue Timeout::Error, SocketError, SystemCallError, IOError, OpenSSL::SSL::SSLError => e
    raise Error, "Photon request failed: #{e.message}"
  end
end
