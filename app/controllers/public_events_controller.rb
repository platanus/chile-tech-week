# Attendee-facing event pages. UUID organizer/status URLs remain under /events/:id.
class PublicEventsController < InertiaController
  def show
    @event = Event.published.includes(:themes, :audiences, :cohosts).with_attached_cover.find_by!(slug: params[:slug])
    @title = "#{@event.title} · Chile Tech Week #{@event.edition}"
    @description = @event.description
    @opengraph_image = public_event_opengraph_path(slug: @event.slug, v: EventOpengraph.new(@event).version)
    @opengraph_image_url = AppConfig.instance.site_url + @opengraph_image
  end
end
