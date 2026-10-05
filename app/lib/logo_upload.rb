# Shared with the browser. Inspect the bytes before writing anything to Active Storage;
# dimensions are a resolution floor, not a promise that an upscaled image is sharp.
class LogoUpload
  POLICY = JSON.parse(Rails.root.join("config/logo_upload.json").read).freeze

  # The messages in the request's language: {"type" => …, "size" => …}.
  def self.errors
    POLICY.fetch(I18n.locale.to_s, POLICY["es"])["errors"]
  end

  def self.error_for(file)
    return errors["size"] if file.size > POLICY["maxBytes"]

    file.rewind
    bytes = file.read
    file.rewind
    type = Marcel::MimeType.for(StringIO.new(bytes))
    return errors["type"] unless POLICY["types"].include?(type)

    image = Vips::Image.new_from_buffer(bytes, "", access: :sequential, fail_on: :warning)
    return errors["large"] if image.width * image.height > POLICY["maxPixels"]
    return errors["small"] if [image.width, image.height].max < POLICY["minLongSide"] || [image.width, image.height].min < POLICY["minShortSide"]

    # Vips is lazy: force decoding so a valid header with truncated pixels is rejected.
    image.avg
    nil
  rescue Vips::Error
    errors["invalid"]
  end
end
