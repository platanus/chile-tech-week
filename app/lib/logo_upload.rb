# Shared with the browser. Inspect the bytes before writing anything to Active Storage;
# dimensions are a resolution floor, not a promise that an upscaled image is sharp.
class LogoUpload
  POLICY = JSON.parse(Rails.root.join("config/logo_upload.json").read).freeze

  def self.error_for(file)
    return POLICY["errors"]["size"] if file.size > POLICY["maxBytes"]

    file.rewind
    bytes = file.read
    file.rewind
    type = Marcel::MimeType.for(StringIO.new(bytes))
    return POLICY["errors"]["type"] unless POLICY["types"].include?(type)

    image = Vips::Image.new_from_buffer(bytes, "", access: :sequential, fail_on: :warning)
    return POLICY["errors"]["large"] if image.width * image.height > POLICY["maxPixels"]
    return POLICY["errors"]["small"] if [image.width, image.height].max < POLICY["minLongSide"] || [image.width, image.height].min < POLICY["minShortSide"]

    # Vips is lazy: force decoding so a valid header with truncated pixels is rejected.
    image.avg
    nil
  rescue Vips::Error
    POLICY["errors"]["invalid"]
  end
end
