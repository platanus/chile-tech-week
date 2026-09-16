# Attendee-facing event pages. UUID organizer/status URLs remain under /events/:id.
# /<slug>.md (or `Accept: text/markdown`) is the same event as a Markdown document for agents.
class PublicEventsController < InertiaController
  def show
    @event = Event.published.includes(:themes, :audiences, :cohosts).with_attached_cover.find_by!(slug: params[:slug])
    @title = "#{@event.title} · Chile Tech Week #{@event.edition}"
    @description = @event.description

    respond_to do |format|
      format.html do
        @opengraph_image = public_event_opengraph_path(slug: @event.slug, v: EventOpengraph.new(@event).version)
        @opengraph_image_url = AppConfig.instance.site_url + @opengraph_image
        @markdown_alternate = public_event_path(slug: @event.slug, format: :md)
        @structured_data = [Discovery::StructuredData.event(@event)]
      end
      format.md { render plain: Discovery::EventDocument.new(@event).render, content_type: Mime[:md] }
    end
  end
end
