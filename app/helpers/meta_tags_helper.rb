# Server-rendered SEO + OpenGraph tags (meta-tags gem). Crawlers don't run JS, so these must
# be in the initial HTML, not Inertia's <Head>. A controller overrides by setting @title /
# @description (and @opengraph_image, a path under public/); the landing's own copy and its
# share image are the defaults. @noindex keeps a private page (a host's status page) out of
# every index; @markdown_alternate is the page's Markdown twin, linked for agents. A page of
# the bilingual public site (Localized) also names its twin in the other language (hreflang),
# with Spanish as the default for everyone else.
module MetaTagsHelper
  OPENGRAPH_LOCALES = {"es" => "es_CL", "en" => "en_US"}.freeze

  def default_meta_tags
    title = @title.presence || t("site.home.title")
    description = @description.presence || t("site.home.description")
    image = AppConfig.instance.site_url + (@opengraph_image.presence || HomeController::OPENGRAPH_IMAGE)

    {
      title: title,
      description: description,
      canonical: AppConfig.instance.site_url + request.path,
      noindex: @noindex.present?,
      alternate: [{href: @markdown_alternate.presence && AppConfig.instance.site_url + @markdown_alternate, type: "text/markdown"}, *language_alternates],
      og: {title: title, description: description, type: "website", site_name: "Chile Tech Week", image: image,
           locale: {_: OPENGRAPH_LOCALES.fetch(I18n.locale.to_s, "es_CL"), alternate: language_alternates.any? ? OPENGRAPH_LOCALES.except(I18n.locale.to_s, "x-default").values : []}},
      twitter: {card: "summary_large_image", title: title, description: description, image: image}
    }
  end

  def language_alternates
    return [] unless controller.is_a?(Localized)

    alternates = controller.locale_alternates.transform_values { |path| AppConfig.instance.site_url + path }
    [*alternates.map { |lang, href| {href: href, hreflang: lang} }, {href: alternates["es"], hreflang: "x-default"}]
  end
end
