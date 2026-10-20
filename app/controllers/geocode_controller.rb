# GET /geocode — the address field's search, relayed to Photon (PhotonClient). The browser never
# talks to Photon itself: the instance is private, and every query is cached for a day, so the
# repeats a form makes (the same street typed again, the same half-typed words) cost nothing.
class GeocodeController < ApplicationController
  CACHE_FOR = 1.day
  LAYERS = %w[house street].freeze

  rate_limit to: 120, within: 1.minute, by: -> { request.remote_ip }, with: -> { head :too_many_requests }

  def show
    query = params[:q].to_s.squish
    return head :bad_request unless query.length.between?(3, 120)

    body = Rails.cache.fetch(["geocode", search_params(query)], expires_in: CACHE_FOR) do
      PhotonClient.new(url: AppConfig.instance.photon_url).search(search_params(query))
    end
    expires_in 1.hour, public: true
    render json: body
  rescue PhotonClient::Error
    head :bad_gateway
  end

  private

  # Everything Photon is asked is fixed here but the words and the bias: the form cannot widen
  # the search, ask for more rows or reach a layer it does not show.
  def search_params(query)
    pairs = [["q", query], ["limit", "8"], ["countrycode", "CL"], ["lang", "default"]]
    pairs += [["lat", Float(params[:lat]).to_s], ["lon", Float(params[:lon]).to_s]] if params[:lat].present? && params[:lon].present?
    pairs + LAYERS.map { |layer| ["layer", layer] }
  rescue ArgumentError, TypeError
    pairs.first(4) + LAYERS.map { |layer| ["layer", layer] }
  end
end
