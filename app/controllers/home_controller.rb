# The public landing: the outline logo over the condor flight, and the game behind it.
# Static — the page carries its own copy; the server only decides the document metadata
# and which terrain dataset to preload (TerrainAssets, read by the inertia layout).
class HomeController < InertiaController
  include Localized

  # The share card (1200×630): a capture of /opengraph, resized and palette-compressed.
  OPENGRAPH_IMAGE = "/opengraph.png"

  def show
    @title = t("site.home.title")
    @description = t("site.home.description")
    @terrain_preloads = TerrainAssets.preload_paths
    current = week
    @structured_data = [Discovery::StructuredData.week(current)] if current
  end

  private

  # The week the schema.org graph describes. The landing must still render against an empty
  # database (see above), so without a week the graph just has no Event node.
  def week
    Week.current
  rescue ActiveRecord::ActiveRecordError
    nil
  end
end
