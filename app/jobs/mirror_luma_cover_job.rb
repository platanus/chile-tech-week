require "net/http"

# Keeps our own copy of the cover a host set on Luma: the programme shows the mirrored image
# instead of hotlinking images.lumacdn.com, which may block us or move the file. Enqueued by
# Luma::Sync whenever an event's `luma_cover_url` changes. Failure is logged and dropped —
# `Event#cover_image_url` falls back to Luma's URL, so a missed mirror only costs the copy.
#
# Luma's covers are 2048-pixel PNGs of ~2 MB; the site shows them at 1200 pixels at most (the
# event page) and at ~100 in the programme. So two WebP copies are stored instead of the file:
# `cover` (the page) and `cover_thumb` (the programme's cards, at twice their size).
class MirrorLumaCoverJob < ApplicationJob
  COVER_SIZE = 1200
  THUMB_SIZE = 360
  WEBP_QUALITY = 80
  MAX_BYTES = 5.megabytes
  MAX_REDIRECTS = 3
  OPEN_TIMEOUT = 5
  READ_TIMEOUT = 20

  def perform(event_id, url)
    event = Event.find_by(id: event_id)
    return if event.nil? || url.blank?
    # A newer sync already pointed the event somewhere else; that run owns the mirror.
    return if event.luma_cover_url != url

    image = fetch(url)
    return if image.nil?

    attach(event, image, url)
    Rails.logger.info("Mirrored Luma cover for event #{event.id} (#{image[:body].bytesize} bytes)")
  end

  private

  # The two WebP copies; when the file cannot be resized (an odd format), the original is kept as
  # the cover and the programme falls back to it.
  def attach(event, image, url)
    name = File.basename(filename_for(url, image[:content_type]), ".*")
    event.cover.attach(io: StringIO.new(resized(image[:body], COVER_SIZE)), filename: "#{name}.webp", content_type: "image/webp")
    event.cover_thumb.attach(io: StringIO.new(resized(image[:body], THUMB_SIZE)), filename: "#{name}-thumb.webp", content_type: "image/webp")
  rescue Vips::Error => e
    log("could not resize #{url}: #{e.message.lines.first&.strip}")
    event.cover_thumb.purge if event.cover_thumb.attached?
    event.cover.attach(io: StringIO.new(image[:body]), filename: filename_for(url, image[:content_type]), content_type: image[:content_type])
  end

  # Fits the image inside `size` pixels without cropping or enlarging it, as WebP with no metadata.
  def resized(body, size)
    Vips::Image.thumbnail_buffer(body, size, height: size, size: :down).write_to_buffer(".webp", Q: WEBP_QUALITY, strip: true)
  end

  def fetch(url, redirects_left = MAX_REDIRECTS)
    uri = URI.parse(url)
    return log("not an http(s) URL: #{url}") unless uri.is_a?(URI::HTTP)

    response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https", open_timeout: OPEN_TIMEOUT, read_timeout: READ_TIMEOUT) do |http|
      http.request(Net::HTTP::Get.new(uri))
    end

    case response
    when Net::HTTPRedirection
      return log("too many redirects from #{url}") if redirects_left.zero?

      fetch(URI.join(url, response["location"].to_s).to_s, redirects_left - 1)
    when Net::HTTPSuccess
      body = response.body.to_s
      content_type = response["content-type"].to_s.split(";").first.to_s.strip
      return log("#{url} is #{content_type.presence || "untyped"}, not an image") unless content_type.start_with?("image/")
      return log("#{url} is #{body.bytesize} bytes, over the #{MAX_BYTES} cap") if body.bytesize > MAX_BYTES
      return log("#{url} answered an empty body") if body.empty?

      {body: body, content_type: content_type}
    else
      log("#{url} answered #{response.code}")
    end
  rescue Timeout::Error, SystemCallError, IOError, OpenSSL::SSL::SSLError, URI::InvalidURIError => e
    log("could not fetch #{url}: #{e.message}")
  end

  def filename_for(url, content_type)
    name = File.basename(URI.parse(url).path.presence || "").presence
    return name if name&.match?(/\.(png|jpe?g|webp|gif|avif)\z/i)

    "luma-cover.#{Rack::Mime::MIME_TYPES.key(content_type)&.delete(".") || "jpg"}"
  end

  def log(message)
    Rails.logger.warn("MirrorLumaCoverJob: #{message}")
    nil
  end
end
