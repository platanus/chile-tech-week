# The terrain dataset the landing streams lives in public/terrain/cl-<hash>/ (immutable,
# content-hashed; built by scripts/terrain/*.ts). The frontend addresses it through the
# generated app/frontend/terrain/terrain-url.ts; the layout's <link rel=preload> tags must
# name the same directory, so this reads that one-line file rather than keeping a second
# copy of the hash that the scripts would have to update too.
module TerrainAssets
  URL_FILE = Rails.root.join("app/frontend/terrain/terrain-url.ts")

  # "/terrain/cl-172c8f90"
  def self.base
    if Rails.env.production?
      @base ||= read_base
    else
      read_base
    end
  end

  # The two files the scene needs before its first frame (index + 2 km overview).
  def self.preload_paths
    ["#{base}/index.json", "#{base}/overview.bin"]
  end

  def self.read_base
    File.read(URL_FILE)[%r{export default '(/terrain/cl-[0-9a-f]+)'}, 1] or
      raise "#{URL_FILE} does not export a /terrain/cl-<hash> path — run npm run terrain:fetch"
  end
  private_class_method :read_base
end
