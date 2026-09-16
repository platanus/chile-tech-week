# The schema.org graph a page carries (StructuredDataHelper), parsed: `structured_data`
# is the @graph array, `structured_node("Event")` the first node of that type.
module StructuredDataSpecHelper
  def structured_data
    json = response.body[%r{<script type="application/ld\+json">(.*?)</script>}m, 1]
    expect(json).to be_present, "no JSON-LD script in the page"
    JSON.parse(json).fetch("@graph")
  end

  def structured_node(type)
    structured_data.find { |node| node["@type"] == type } || raise("no #{type} node in #{structured_data.map { |node| node["@type"] }}")
  end
end

RSpec.configure do |config|
  config.include StructuredDataSpecHelper, type: :request
end
