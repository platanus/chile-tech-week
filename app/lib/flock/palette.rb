# The colours a pilot can pick for their HUD name and tag. The bird itself stays the brand
# condor; only the label carries the colour, so the set is chosen to read over the dark red relief
# and next to the white peak labels without fighting the brand red.
module Flock
  module Palette
    COLORS = %w[#F5C542 #4FD1C5 #7AE582 #B794F6 #63B3ED #F687B3 #FF8C42 #FFFFFF].freeze
    NAMES = %w[ámbar turquesa menta lila celeste rosa naranjo blanco].freeze

    def self.random = COLORS.sample
    def self.valid?(color) = COLORS.include?(color)
  end
end
