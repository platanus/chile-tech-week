require "rails_helper"

RSpec.describe "uploaded logo quality" do
  def upload(width: 400, height: 400, format: ".png", alpha: false)
    image = Vips::Image.black(width, height, bands: alpha ? 4 : 3)
    Rack::Test::UploadedFile.new(StringIO.new(image.write_to_buffer(format)), "image/#{format.delete_prefix(".")}", original_filename: "logo#{format}")
  end

  [Event, Cohost].each do |model|
    context "for #{model}" do
      let(:record) { build(model.name.underscore.to_sym) }

      it "rejects a small image before storing a blob" do
        expect { record.logo_upload = upload(width: 319, height: 200) }.not_to change(ActiveStorage::Blob, :count)
        expect(record).not_to be_valid
        expect(record.errors[:logo].join).to include("320 px")
      end

      it "rejects a very thin image even with a large width" do
        record.logo_upload = upload(width: 800, height: 63)
        expect(record).not_to be_valid
        expect(record.errors[:logo].join).to include("64 px")
      end

      it "accepts a horizontal opaque logo and a transparent logo" do
        [false, true].each do |alpha|
          record.logo_upload = upload(width: 320, height: 64, alpha: alpha)
          expect(record).to be_valid
          expect(record.logo).to be_attached
        end
      end

      it "preserves the existing attachment and URL when a replacement fails" do
        record.logo_upload = upload
        record.save!
        old_blob = record.logo.blob
        old_url = record.company_logo_url
        expect(record.update(logo_upload: upload(width: 32, height: 32))).to be(false)
        expect(record.reload.logo.blob).to eq(old_blob)
        expect(record.company_logo_url).to eq(old_url)
      end
    end
  end

  it "accepts JPEG and WebP without requiring transparency" do
    %w[.jpg .webp].each { |format| expect(LogoUpload.error_for(upload(format: format))).to be_nil }
  end

  it "checks actual bytes rather than trusting the filename or declared type" do
    fake = Rack::Test::UploadedFile.new(StringIO.new("<svg xmlns='http://www.w3.org/2000/svg'></svg>"), "image/png", original_filename: "logo.png")
    expect(LogoUpload.error_for(fake)).to eq(LogoUpload::POLICY["errors"]["type"])
  end

  it "rejects corrupt images even when their PNG signature is present" do
    fake = Rack::Test::UploadedFile.new(StringIO.new("\x89PNG\r\n\x1a\n" + "x" * 64), "image/png", original_filename: "logo.png")
    expect(LogoUpload.error_for(fake)).to eq(LogoUpload::POLICY["errors"]["invalid"])
  end

  it "decodes the pixels instead of trusting a valid header" do
    file = upload
    bytes = file.read
    truncated = Rack::Test::UploadedFile.new(StringIO.new(bytes[0, bytes.size / 2]), "image/png", original_filename: "logo.png")
    expect(LogoUpload.error_for(truncated)).to eq(LogoUpload::POLICY["errors"]["invalid"])
  end

  it "rejects oversized files before attempting to decode them" do
    file = upload
    allow(file).to receive(:size).and_return(2.megabytes + 1)
    expect(file).not_to receive(:read)
    expect(LogoUpload.error_for(file)).to eq(LogoUpload::POLICY["errors"]["size"])
  end

  it "rejects excessive pixel counts before decoding pixels" do
    expect(LogoUpload.error_for(upload(width: 5000, height: 4001))).to eq(LogoUpload::POLICY["errors"]["large"])
  end
end
