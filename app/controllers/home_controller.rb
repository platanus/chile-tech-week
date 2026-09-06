# The public landing: the outline logo over the condor flight, and the game behind it.
# Static — the page carries its own copy; the server only decides the document metadata
# and which terrain dataset to preload (TerrainAssets, read by the inertia layout).
class HomeController < InertiaController
  TITLE = "Chile Tech Week 2026 · 16 al 22 de noviembre"
  DESCRIPTION = "Chile Tech Week 2026. Una semana, cientos de eventos, toda la comunidad tech " \
    "de Chile. Santiago, 16 al 22 de noviembre."
  # The share card (1200×630): a capture of /opengraph, resized and palette-compressed.
  OPENGRAPH_IMAGE = "/opengraph.png"

  def show
    @title = TITLE
    @description = DESCRIPTION
    @terrain_preloads = TerrainAssets.preload_paths
  end
end
