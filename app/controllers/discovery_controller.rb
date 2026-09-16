# The files crawlers and AI agents ask for by name, none of them a page: robots.txt, the
# sitemap, llms.txt and llms-full.txt (app/lib/discovery). Every one is rendered from the
# published events, and answers 304 until one of them changes.
class DiscoveryController < ApplicationController
  before_action { fresh_when etag: Discovery.etag }

  def robots
    render plain: Discovery::Robots.render
  end

  def sitemap
    render xml: Discovery::Sitemap.render
  end

  def llms
    render plain: Discovery::Llms.new(Week.current).render
  end

  def llms_full
    render plain: Discovery::Llms.new(Week.current, full: true).render
  end
end
