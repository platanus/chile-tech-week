# The page's schema.org graph as one JSON-LD script (Discovery::StructuredData): the
# organization and the site always, plus whatever the controller put in @structured_data
# (the week, the programme, an event). Server-rendered for the same reason the meta tags
# are: crawlers don't run JS.
module StructuredDataHelper
  def structured_data_tag
    graph = Discovery::StructuredData.site + Array(@structured_data)
    json = JSON.generate({"@context" => "https://schema.org", "@graph" => graph})
    # json_escape turns <, > and & into \u escapes, so no content can close the script.
    content_tag(:script, ERB::Util.json_escape(json).html_safe, type: "application/ld+json")
  end
end
