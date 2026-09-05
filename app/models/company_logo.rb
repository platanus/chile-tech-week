# One logo on an edition's "participating companies" wall: the hosts and co-hosts of its
# published events that agreed to be shown (logo_shown_at), one entry per distinct image.
CompanyLogo = Data.define(:company_name, :logo_url) do
  def self.shown_for(edition)
    published = Event.for_edition(edition).published

    hosts = published.logo_shown.chronological.pluck(:company_name, :company_logo_url)
    cohosts = Cohost.logo_shown.joins(:event).merge(published).order(:created_at)
      .where.not(company_logo_url: nil).pluck(:company_name, :company_logo_url)

    (hosts + cohosts).uniq(&:last).map { |name, url| new(company_name: name, logo_url: url) }
  end
end
