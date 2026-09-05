# The scene's world is a strip the width of the terrain corridor that repeats along z by
# mirroring: fold(z) is the position along the real relief (0..length), and two players whose
# folds coincide are over the same ground even if their raw z differ by copies. Distances for
# interest management use the fold, so the flock is the same in every copy.
module Flock
  module Geometry
    UNITS_PER_KM = 20.0 # scene.ts DEFAULTS.unitsPerKm

    # Strip length and half-width in world units, from the same dataset index the scene streams.
    def self.length = dims[:length]

    def self.half_width = dims[:half_width]

    def self.fold(z, length = self.length)
      t = ((z / length) % 2.0 + 2.0) % 2.0
      ((t <= 1) ? t : 2 - t) * length
    end

    def self.distance(ax, ay, az, bx, by, bz)
      Math.sqrt((ax - bx)**2 + (ay - by)**2 + (fold(az) - fold(bz))**2)
    end

    def self.dims
      @dims ||= begin
        index = JSON.parse(Rails.public_path.join(TerrainAssets.base.delete_prefix("/"), "index.json").read)
        tile_km = index.fetch("tile") * index.fetch("kmPerSample")
        {length: index.fetch("tilesY") * tile_km * UNITS_PER_KM, half_width: index.fetch("tilesX") * tile_km * UNITS_PER_KM / 2}
      end
    end
  end
end
