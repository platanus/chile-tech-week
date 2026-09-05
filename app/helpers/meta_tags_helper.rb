# Server-rendered SEO + OpenGraph tags (meta-tags gem). Crawlers don't run JS, so these must
# be in the initial HTML, not Inertia's <Head>. A controller overrides by setting @title /
# @description (and @opengraph_image, a path under public/); the landing's own copy is the
# default.
module MetaTagsHelper
  def default_meta_tags
    title = @title.presence || HomeController::TITLE
    description = @description.presence || HomeController::DESCRIPTION
    image = @opengraph_image.presence && AppConfig.instance.site_url + @opengraph_image

    {
      title: title,
      description: description,
      canonical: AppConfig.instance.site_url + request.path,
      og: {title: title, description: description, type: "website", site_name: "Chile Tech Week", image: image}.compact,
      twitter: {card: image ? "summary_large_image" : "summary", title: title, description: description, image: image}.compact
    }
  end
end
