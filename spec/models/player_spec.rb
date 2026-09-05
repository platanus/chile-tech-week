require "rails_helper"

RSpec.describe Player do
  it "generates a codename no other row has" do
    Player.create!(codename: "condor-andino-1", color: "#FFFFFF")
    allow(Flock::Codename).to receive(:build).and_return("condor-andino-1", "condor-andino-2")
    expect(Player.with_fresh_codename.codename).to eq("condor-andino-2")
  end

  it "validates the codename shape and the colour" do
    expect(Player.new(codename: "Bad Name", color: "#FFFFFF")).not_to be_valid
    expect(Player.new(codename: "puma-veloz-7", color: "#000001")).not_to be_valid
    expect(Player.new(codename: "puma-veloz-7", color: "#FFFFFF")).to be_valid
  end
end
