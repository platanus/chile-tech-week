require "rails_helper"

RSpec.describe Discovery do
  describe ".schedule_label" do
    it "spells one day once and two days twice, in Santiago time" do
      from = Time.zone.local(2026, 11, 18, 18)
      expect(described_class.schedule_label(from, from + 2.hours)).to eq("miércoles 18 de noviembre de 2026, 18:00–20:00 (hora de Chile)")
      expect(described_class.schedule_label(from, from + 16.hours))
        .to eq("miércoles 18 de noviembre de 2026, 18:00 – jueves 19 de noviembre de 2026, 10:00 (hora de Chile)")
    end
  end

  describe Discovery::EventDocument do
    it "lists the facts an agent can quote and the host's Luma description" do
      event = create(:event, :published, edition: 2026, title: "Demo Day", description: " Pitches. ", company_name: "Platanus",
        company_website: "https://platanus.cl", custom_url: "https://platanus.cl/demo-day", capacity: 120,
        luma_description_md: "## Agenda\n\n- 18:00 puertas\n", audiences: [create(:audience, name: "Investors")])
      create(:cohost, event: event, company_name: "Fintual")

      markdown = described_class.new(event).render

      expect(markdown).to start_with("# Demo Day\n\n> Pitches.\n\n")
      expect(markdown).to include("- **Organiza:** [Platanus](https://platanus.cl), Fintual\n")
      expect(markdown).to include("- **Audiencia:** Investors\n", "- **Capacidad:** 120 personas\n")
      expect(markdown).to include("- **Inscripción:** https://platanus.cl/demo-day\n", "- **Página:** https://techweek.cl/demo-day\n")
      expect(markdown).to include("- **Parte de:** [Chile Tech Week 2026](https://techweek.cl), 16 al 22 de noviembre de 2026\n")
      expect(markdown).not_to include("Temas")
      expect(markdown).to end_with("\n## Descripción\n\n## Agenda\n\n- 18:00 puertas\n")
      expect(markdown).not_to include(event.author_email)
    end
  end

  describe Discovery::Programme do
    it "says so when nothing is published yet" do
      markdown = described_class.new(Week.find(2026)).render
      expect(markdown).to include("> 0 eventos publicados del 16 al 22 de noviembre de 2026")
      expect(markdown).to include("Todavía no hay eventos publicados.")
    end
  end

  describe Discovery::StructuredData do
    it "maps a format to the closest schema.org Event type and keeps the private columns out" do
      event = create(:event, :published, edition: 2026, format: "hackathon", starts_at: Time.zone.local(2026, 11, 18, 18), latitude: -33.42, longitude: -70.61)

      node = described_class.event(event)

      expect(node).to include("@type" => "Hackathon", "startDate" => "2026-11-18T18:00:00-03:00", "endDate" => "2026-11-18T20:00:00-03:00")
      expect(node.dig("location", "geo")).to eq("@type" => "GeoCoordinates", "latitude" => -33.42, "longitude" => -70.61)
      expect(node.dig("superEvent", "name")).to eq("Chile Tech Week 2026")
      expect(node.to_json).not_to include(event.author_email, event.author_phone_number)
    end
  end
end
