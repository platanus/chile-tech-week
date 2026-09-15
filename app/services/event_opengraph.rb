require "vips"

# Runtime image composition, without a browser or remote image requests.
class EventOpengraph
  VERSION = "7"
  WIDTH = 1200
  HEIGHT = 630
  FONT = Rails.root.join("app/assets/fonts/Unbounded.ttf").to_s
  BACKGROUND = Rails.root.join("app/assets/images/event-opengraph-base.png").to_s

  def initialize(event)
    @event = event
  end

  def version
    Digest::SHA256.hexdigest([VERSION, Digest::SHA256.file(BACKGROUND).hexdigest, @event.title, @event.starts_at.iso8601, @event.company_name, @event.cover.blob&.checksum].join("\0"))[0, 24]
  end

  def render
    Rails.cache.fetch(["event-opengraph", @event.id, version], expires_in: 7.days) do
      # Read fresh bytes: libvips caches file loaders by pathname, even after a rebuild.
      canvas = Vips::Image.new_from_buffer(File.binread(BACKGROUND), "")
      cover = if @event.cover.attached?
        Vips::Image.thumbnail_buffer(@event.cover.download, 460, height: 460, crop: :centre)
      else
        Vips::Image.thumbnail(Rails.public_path.join("brand/logo.png").to_s, 460, height: 460, crop: :centre)
      end
      canvas = canvas.composite2(cover, :over, x: 94, y: 85)
      title = title_image
      canvas = canvas.composite2(title, :over, x: 648, y: 175 + (210 - title.height) / 2)
      date = I18n.l(@event.starts_at.in_time_zone(Week::TIME_ZONE), format: "%-d %b %Y", locale: :es).upcase
      canvas = canvas.composite2(detail_image(date), :over, x: 648, y: 420)
      canvas = canvas.composite2(detail_image("POR #{@event.company_name.upcase}"), :over, x: 648, y: 454)
      canvas.pngsave_buffer
    end
  end

  private

  def detail_image(text)
    image = Vips::Image.text(%(<span foreground="#b3b3b3">#{CGI.escapeHTML(text)}</span>),
      font: "Unbounded Medium 16", fontfile: FONT, width: 488, wrap: :word_char,
      rgba: true).copy(interpretation: :srgb)
    (image.height > 24) ? image.resize(24.0 / image.height) : image
  end

  def title_image
    # Fit short and long titles into the same box; escape host-authored Pango markup.
    text = CGI.escapeHTML(@event.title.upcase)
    image = nil
    46.downto(12) do |size|
      image = Vips::Image.text(%(<span foreground="#ffffff">#{text}</span>),
        font: "Unbounded ExtraBold #{size}", fontfile: FONT, width: 488, wrap: :word_char,
        spacing: 5, rgba: true).copy(interpretation: :srgb)
      break if image.height <= 210
    end
    (image.height > 210) ? image.resize(210.0 / image.height) : image
  end
end
