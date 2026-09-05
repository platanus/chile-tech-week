require "rails_helper"

RSpec.describe Flock::Codename do
  describe ".build" do
    it "is animal-adjective-number" do
      expect(described_class.build).to match(/\A[a-z]+-[a-z]+-\d{1,2}\z/)
    end

    it "makes the adjective agree with a feminine animal" do
      rng = Random.new(1)
      names = Array.new(300) { described_class.build(rng) }
      feminine = described_class::NOUNS.select(&:last).map(&:first)
      names.select { |n| feminine.include?(n.split("-").first) }.each do |name|
        expect(name.split("-")[1]).not_to end_with("o"), name
      end
      expect(names.map { |n| n.split("-").first }).to include("vicuna")
    end
  end

  describe ".generate" do
    it "keeps trying until the block accepts a name" do
      seen = []
      name = described_class.generate { |n|
        seen << n
        seen.size >= 3
      }
      expect(seen.size).to eq(3)
      expect(name).to eq(seen.last)
    end
  end

  describe ".normalize / .valid?" do
    it "turns what people type into the slug shape" do
      expect(described_class.normalize("  Zorro  Andino 42 ")).to eq("zorro-andino-42")
      expect(described_class.normalize("puma__veloz")).to eq("puma-veloz")
    end

    it "accepts accents and ñ, rejects punctuation, hyphen edges and bad lengths" do
      expect(described_class.valid?("ñandú-austral")).to be true
      expect(described_class.valid?("rafa!")).to be false
      expect(described_class.valid?("-rafa")).to be false
      expect(described_class.valid?("ab")).to be false
      expect(described_class.valid?("a" * 25)).to be false
    end
  end

  describe ".key" do
    it "folds accents and case so look-alikes collide" do
      expect(described_class.key("Ñandú")).to eq(described_class.key("nandu"))
    end
  end
end
