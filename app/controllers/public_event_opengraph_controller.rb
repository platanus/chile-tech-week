class PublicEventOpengraphController < ApplicationController
  def show
    event = Event.published.with_attached_cover.find_by!(slug: params[:slug])
    image = EventOpengraph.new(event)
    return unless stale?(etag: image.version, public: true)

    expires_in 1.hour, public: true
    send_data image.render, type: "image/png", disposition: "inline"
  end
end
