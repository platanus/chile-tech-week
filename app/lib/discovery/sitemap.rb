module Discovery
  # /sitemap.xml: the public pages and every published event, of every week. <lastmod> is
  # the row's real update time; changefreq and priority are left out (crawlers ignore them).
  class Sitemap
    include Rails.application.routes.url_helpers

    def self.render
      new.render
    end

    def render
      xml = +%(<?xml version="1.0" encoding="UTF-8"?>\n)
      xml << %(<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n)
      (pages + events).each do |path, lastmod|
        xml << "  <url><loc>#{CGI.escapeHTML(Discovery.url(path))}</loc>"
        xml << "<lastmod>#{lastmod.utc.iso8601}</lastmod>" if lastmod
        xml << "</url>\n"
      end
      xml << "</urlset>\n"
    end

    private

    def pages
      programme_changed = Week.current.events.published.maximum(:updated_at)
      [[root_path, nil], [events_path, programme_changed], [new_event_path, nil], [brand_path, nil],
        [edition2025_root_path, nil], [edition2025_events_path, nil]]
    end

    def events
      Event.published.where.not(slug: nil).order(:starts_at, :slug).pluck(:slug, :updated_at)
        .map { |slug, updated_at| [public_event_path(slug: slug), updated_at] }
    end
  end
end
