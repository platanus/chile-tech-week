require "rails_helper"

RSpec.describe Luma::Description do
  it "starts the Luma event in the host's language, the publish link on their side of the site" do
    spanish = create(:event)
    english = create(:event, locale: "en")

    expect(described_class.new(spanish).to_md).to include("RECUERDA EDITAR", "https://techweek.cl/events/#{spanish.id}?publish=true")
    expect(described_class.new(english).to_md).to include("REMEMBER TO EDIT", "https://techweek.cl/en/events/#{english.id}?publish=true")
  end
end
