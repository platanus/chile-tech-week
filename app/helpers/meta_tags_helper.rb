# Server-rendered SEO + OpenGraph tags (meta-tags gem). Crawlers don't run JS, so these must
# be in the initial HTML, not Inertia's <Head>. A controller overrides by setting @title /
# @description (and @opengraph_image, a path under public/); the landing's own copy and its
# share image are the defaults.
module MetaTagsHelper
  def default_meta_tags
    title = @title.presence || HomeController::TITLE
    description = @description.presence || HomeController::DESCRIPTION
    image = AppConfig.instance.site_url + (@opengraph_image.presence || HomeController::OPENGRAPH_IMAGE)

    {
      title: title,
      description: description,
      canonical: AppConfig.instance.site_url + request.path,
      og: {title: title, description: description, type: "website", site_name: "Chile Tech Week", image: image},
      twitter: {card: "summary_large_image", title: title, description: description, image: image}
    }
  end
end
