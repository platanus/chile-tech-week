module Discovery
  # /sitemap.xml: the public pages and every published event, of every week. <lastmod> is
  # the row's real update time; changefreq and priority are left out (crawlers ignore them).
  # The bilingual pages (Localized) are listed in both languages, each naming the other with
  # <xhtml:link rel="alternate" hreflang>, Spanish being the default.
  class Sitemap
    include Rails.application.routes.url_helpers

    def self.render
      new.render
    end

    def render
      xml = +%(<?xml version="1.0" encoding="UTF-8"?>\n)
      xml << %(<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n)
      (bilingual_pages + events).each do |path, lastmod|
        alternates = {"es" => path, "en" => english(path), "x-default" => path}
        [path, english(path)].each { |loc| xml << entry(loc, lastmod, alternates) }
      end
      single_language_pages.each { |path, lastmod| xml << entry(path, lastmod) }
      xml << "</urlset>\n"
    end

    private

    def entry(path, lastmod, alternates = {})
      xml = "  <url><loc>#{CGI.escapeHTML(Discovery.url(path))}</loc>"
      xml << "<lastmod>#{lastmod.utc.iso8601}</lastmod>" if lastmod
      alternates.each do |lang, href|
        xml << %(<xhtml:link rel="alternate" hreflang="#{lang}" href="#{CGI.escapeHTML(Discovery.url(href))}"/>)
      end
      xml << "</url>\n"
    end

    def english(path)
      (path == "/") ? "/en" : "/en#{path}"
    end

    def bilingual_pages
      programme_changed = Week.current.events.published.maximum(:updated_at)
      [[root_path, nil], [events_path, programme_changed], [new_event_path, nil]]
    end

    def single_language_pages
      [[brand_path, nil], [edition2025_root_path, nil], [edition2025_events_path, nil]]
    end

    def events
      Event.published.where.not(slug: nil).order(:starts_at, :slug).pluck(:slug, :updated_at)
        .map { |slug, updated_at| [public_event_path(slug: slug), updated_at] }
    end
  end
end
