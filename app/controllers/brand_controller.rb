# /brand — the 2026 brand kit: the marks (stacked logo, horizontal logo, icon) in their
# variants, the type, the colours and the wireframe. /brand/icon previews the icon at its
# real sizes; /brand/wireframe-gen generates wireframe assets in the browser. The mark files
# are static under public/brand, written by `npm run brand:marks` (scripts/brand/build-marks.ts);
# the pages carry the kit's content themselves (app/frontend/brand/kit.ts) — the server only
# names the documents.
class BrandController < InertiaController
  ICON_SIZE = 1024
  ICON_SVG = "/brand/icon.svg"
  ICON_PNG = "/brand/icon.png"
  DOWNLOAD_NAME = "chile-tech-week-2026-icon"

  def show
    @title = "Marca · Chile Tech Week 2026"
    @description = "El kit de marca de Chile Tech Week 2026: logos, ícono, tipografías, " \
      "colores y el wireframe, listos para descargar."
  end

  def icon
    @title = "Ícono 2026 · Chile Tech Week"
    @description = "El ícono de Chile Tech Week 2026 en PNG y SVG: CLTW sobre 2026, " \
      "para favicon, perfiles y calendarios."
    @size = ICON_SIZE
    @svg_path = ICON_SVG
    @png_path = ICON_PNG
    @download_name = DOWNLOAD_NAME
  end

  def wireframe
    @title = "Wireframe · Chile Tech Week 2026"
    @description = "Genera fondos, franjas y marcas con el relieve low-poly de Chile Tech Week " \
      "2026, en SVG y PNG."
  end
end
