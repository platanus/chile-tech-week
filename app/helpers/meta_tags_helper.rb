# Server-rendered SEO + OpenGraph tags (meta-tags gem). Crawlers don't run JS, so these must
# be in the initial HTML, not Inertia's <Head>. A controller overrides by setting @title /
# @description; the landing's own copy is the default.
module MetaTagsHelper
  def default_meta_tags
    title = @title.presence || HomeController::TITLE
    description = @description.presence || HomeController::DESCRIPTION

    {
      title: title,
      description: description,
      canonical: AppConfig.instance.site_url + request.path,
      og: {title: title, description: description, type: "website", site_name: "Chile Tech Week"},
      twitter: {card: "summary", title: title, description: description}
    }
  end
end
