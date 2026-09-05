require "rails_helper"

RSpec.describe CompanyLogo do
  describe ".shown_for" do
    it "lists the hosts and co-hosts of published events that agreed to show their logo, once per image" do
      shown = create(:event, :published, :logo_shown, edition: 2025, company_name: "Platanus", company_logo_url: "/25/logos/platanus.png")
      create(:event, :published, :logo_shown, edition: 2025, company_name: "Platanus again", company_logo_url: "/25/logos/platanus.png")
      create(:event, :published, edition: 2025, company_name: "Shy host", company_logo_url: "/25/logos/shy.png")
      create(:event, :logo_shown, edition: 2025, state: "rejected", company_name: "Rejected", company_logo_url: "/25/logos/rejected.png")
      create(:event, :published, :logo_shown, edition: 2026, company_name: "Next year", company_logo_url: "/25/logos/next.png")
      create(:cohost, event: shown, company_name: "BCI", company_logo_url: "/25/logos/bci.png", logo_shown_at: Time.current)
      create(:cohost, event: shown, company_name: "Quiet cohost", company_logo_url: "/25/logos/quiet.png", logo_shown_at: nil)
      create(:cohost, event: shown, company_name: "No logo", company_logo_url: nil, logo_shown_at: Time.current)

      expect(described_class.shown_for(2025)).to eq([
        described_class.new(company_name: "Platanus", logo_url: "/25/logos/platanus.png"),
        described_class.new(company_name: "BCI", logo_url: "/25/logos/bci.png")
      ])
    end
  end
end
