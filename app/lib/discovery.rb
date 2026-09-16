# How crawlers and AI assistants find the site (ChatGPT search, Claude, Perplexity, Google):
# robots.txt, the sitemap, llms.txt, the Markdown twin of every public page and the
# schema.org graph in every page's <head>. All of it is rendered from the same rows the pages
# show, so an event is discoverable the moment it is published — nothing is written by hand.
#
#   /robots.txt, /sitemap.xml, /llms.txt, /llms-full.txt   DiscoveryController
#   /events.md, /<slug>.md (or Accept: text/markdown)      the page's own controller
#   <script type="application/ld+json">                     StructuredDataHelper
module Discovery
  SITE_NAME = "Chile Tech Week".freeze
  TAGLINE = "La semana descentralizada con los mejores eventos tech del país.".freeze

  # https://techweek.cl/events — every URL in these documents is absolute.
  def self.url(path = "")
    AppConfig.instance.site_url + path
  end

  def self.local(time)
    time.in_time_zone(Week::TIME_ZONE)
  end

  # "lunes 16 de noviembre de 2026, 17:00–19:00 (hora de Chile)", both days when it spans two.
  def self.schedule_label(starts_at, ends_at)
    from = local(starts_at)
    to = local(ends_at)
    long = "%A %-d de %B de %Y, %H:%M"
    ending = (from.to_date == to.to_date) ? "–#{to.strftime("%H:%M")}" : " – #{I18n.l(to, format: long)}"
    "#{I18n.l(from, format: long)}#{ending} (hora de Chile)"
  end

  # "lun 16 nov, 17:00"
  def self.short_label(time)
    I18n.l(local(time), format: "%a %-d %b, %H:%M")
  end

  # Changes with any published event, so the generated files can answer 304 until then.
  def self.etag
    scope = Event.published
    [scope.maximum(:updated_at), scope.count, AppConfig.instance.site_url]
  end
end
