# Both the public form and admin replacements use the same check. Existing/imported
# logos are left alone; a rejected replacement cannot overwrite the previous image.
module HasUploadedLogo
  extend ActiveSupport::Concern

  included do
    validate :uploaded_logo_quality
  end

  def logo_upload=(file)
    return if file.blank?

    @logo_upload_error = LogoUpload.error_for(file)
    return if @logo_upload_error

    blob = ActiveStorage::Blob.create_and_upload!(io: file, filename: file.original_filename, content_type: file.content_type)
    self.logo = blob
    self.company_logo_url = Rails.application.routes.url_helpers.rails_blob_path(blob, only_path: true)
  end

  private

  def uploaded_logo_quality
    return unless @logo_upload_error

    errors.add(:logo, @logo_upload_error.delete_prefix("El logo ").sub("No pudimos leer la imagen.", "no se pudo leer."))
  end
end
