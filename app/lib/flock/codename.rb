# Pre-generated Spanish codenames in the "zorro-andino-42" shape: a Chilean animal, an adjective
# that agrees with it, and a number. Also the rules for the names players type themselves.
module Flock
  module Codename
    # [noun, feminine?]
    NOUNS = [
      ["condor", false], ["zorro", false], ["puma", false], ["huemul", false], ["pudu", false],
      ["guanaco", false], ["vicuna", true], ["chinchilla", true], ["flamenco", false], ["pinguino", false],
      ["lobo", false], ["ballena", true], ["delfin", false], ["quirquincho", false], ["tucuquere", false],
      ["chucao", false], ["loica", true], ["tiuque", false], ["tricahue", false], ["colocolo", false],
      ["culpeo", false], ["chungungo", false], ["degu", false], ["vizcacha", true], ["taruca", true],
      ["nandu", false], ["bandurria", true], ["cisne", false], ["yeco", false], ["pelicano", false],
      ["piquero", false], ["albatros", false], ["petrel", false], ["cormoran", false], ["carancho", false],
      ["monito", false], ["gaviota", true], ["jote", false], ["picaflor", false], ["choroy", false]
    ].freeze
    # Adjectives ending in "o" take "a" for a feminine noun; the rest are invariant.
    ADJECTIVES = %w[
      andino austral veloz valiente nocturno silencioso feroz curioso salvaje altiplanico patagonico
      costero cordillerano rapido sereno bravo dorado plateado brillante errante viajero nortino
      sureno chilote atacameno magallanico antartico pascuense porteno capitalino chascon piola
      bacan seco filete tranquilo intrepido ligero lejano rebelde
    ].freeze

    MAX_LENGTH = 24
    MIN_LENGTH = 3
    # Lower-case letters (accents and ñ welcome), digits, single hyphens between parts.
    FORMAT = /\A[[:lower:][:digit:]]+(-[[:lower:][:digit:]]+)*\z/

    # Yields candidates until the block accepts one (or 50 tries pass, then the last one wins).
    def self.generate(rng: Random)
      50.times do
        name = build(rng)
        return name if !block_given? || yield(name)
      end
      build(rng)
    end

    def self.build(rng = Random)
      noun, feminine = NOUNS.sample(random: rng)
      adjective = ADJECTIVES.sample(random: rng)
      adjective = adjective.sub(/o\z/, "a") if feminine
      "#{noun}-#{adjective}-#{rng.rand(1..99)}"
    end

    # What a typed name becomes: trimmed, lower-cased, spaces turned into hyphens.
    def self.normalize(raw)
      raw.to_s.unicode_normalize(:nfc).strip.downcase.gsub(/[\s_]+/, "-").squeeze("-")
    end

    def self.valid?(name)
      name.length.between?(MIN_LENGTH, MAX_LENGTH) && FORMAT.match?(name)
    end

    # Two names are the same name if they differ only in accents or case.
    def self.key(name)
      name.to_s.unicode_normalize(:nfkd).gsub(/\p{Mn}/, "").downcase
    end
  end
end
