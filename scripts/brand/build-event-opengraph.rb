# Run with: PANGOCAIRO_BACKEND=fc bundle exec ruby scripts/brand/build-event-opengraph.rb
# Build the static brand layer. Only the event title and cover are composed at runtime.
require "vips"

root = File.expand_path("../..", __dir__)
font = File.join(root, "app/assets/fonts/Unbounded.ttf")
canvas = Vips::Image.new_from_file(File.join(root, "public/brand/event-opengraph-background.png"))
logo = Vips::Image.thumbnail(File.join(root, "public/brand/logo-horizontal-transparent.png"), 320)
canvas = canvas.composite2(logo, :over, x: 648, y: 64)
canvas = canvas.draw_rect([238, 43, 43, 255], 648, 497, 246, 56, fill: true)
label = Vips::Image.text('<span foreground="#ffffff">INSCRIBIRSE ↗</span>',
  font: "Unbounded ExtraBold 16", fontfile: font, rgba: true)
canvas = canvas.copy(interpretation: :srgb).composite2(label.copy(interpretation: :srgb), :over, x: 648 + (246 - label.width) / 2, y: 497 + (56 - label.height) / 2)
canvas = canvas.draw_rect([38, 38, 38, 255], 93, 84, 462, 462, fill: false)
canvas.pngsave(File.join(root, "app/assets/images/event-opengraph-base.png"))
