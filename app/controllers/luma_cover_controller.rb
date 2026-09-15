# /luma-cover — a 3.5:1 brand cover, rendered as a stage to screenshot.
class LumaCoverController < InertiaController
  def show
    @title = "Portada Luma · Chile Tech Week 2026"
    @width = 1400
    @height = 400
    @dates = "16 — 22 nov"
    @site = "techweek.cl"
  end
end
