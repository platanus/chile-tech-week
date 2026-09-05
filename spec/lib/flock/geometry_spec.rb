require "rails_helper"

RSpec.describe Flock::Geometry do
  let(:length) { described_class.length }

  it "reads the strip from the terrain index the scene streams" do
    expect(length).to eq(68 * 64 * 20)
    expect(described_class.half_width).to eq(256 * 20)
  end

  describe ".fold" do
    it "is the identity inside the first copy" do
      expect(described_class.fold(1234.5)).to be_within(1e-6).of(1234.5)
    end

    it "mirrors past the south end and behind the north end" do
      expect(described_class.fold(length + 100)).to be_within(1e-6).of(length - 100)
      expect(described_class.fold(-100)).to be_within(1e-6).of(100)
    end

    it "repeats every two lengths" do
      expect(described_class.fold(2 * length + 42)).to be_within(1e-6).of(42)
    end
  end

  describe ".distance" do
    it "treats the two sides of a fold as the same ground" do
      expect(described_class.distance(0, 0, length - 10, 0, 0, length + 10)).to eq(0)
    end

    it "is euclidean otherwise" do
      expect(described_class.distance(0, 0, 0, 3, 4, 0)).to eq(5)
    end
  end
end
