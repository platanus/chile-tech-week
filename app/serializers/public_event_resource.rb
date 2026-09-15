class PublicEventResource < EventResource
  typelize_from Event
  attributes :edition, :slug, :luma_event_url

  typelize :string
  attribute :body_html do |event|
    # A nil body has not synced yet; an empty body was intentionally cleared on Luma.
    EventMarkdown.render(event.luma_description_md.nil? ? event.description : event.luma_description_md)
  end
end
