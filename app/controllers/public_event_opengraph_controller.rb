class PublicEventOpengraphController < ApplicationController
  include Localized

  def show
    event = Event.published.with_attached_cover.find_by!(slug: params[:slug])
    image = EventOpengraph.new(event, locale: I18n.locale)
    return unless stale?(etag: image.version, public: true)

    expires_in 1.hour, public: true
    send_data image.render, type: "image/png", disposition: "inline"
  end
end
