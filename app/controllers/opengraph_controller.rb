# /opengraph — the share image as a page: a 1200×630 stage at the top-left corner with the
# stacked logo, the dates and the relief, nothing else in that box, so a 1200×630 viewport
# screenshot is the image.
class OpengraphController < InertiaController
  WIDTH = 1200
  HEIGHT = 630

  def show
    @title = "OpenGraph · Chile Tech Week 2026"
    @width = WIDTH
    @height = HEIGHT
    @dates = "16 — 22 nov"
    @site = "techweek.cl"
  end
end
