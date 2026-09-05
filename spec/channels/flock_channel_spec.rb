require "rails_helper"

RSpec.describe FlockChannel, type: :channel do
  let(:world) { Flock::World.new }

  before do
    allow(Flock::World).to receive(:instance).and_return(world)
    allow(world).to receive(:ensure_running)
  end

  it "lets anyone watch as a spectator" do
    stub_connection current_player_id: nil
    subscribe role: "spectator"
    expect(subscription).to be_confirmed
    expect(world.online_count).to eq(0)
  end

  it "rejects a pilot without a session cookie" do
    stub_connection current_player_id: nil
    subscribe
    expect(subscription).to be_rejected
  end

  it "puts a pilot in the flock, takes their moves, and pushes frames straight to the socket" do
    player = Player.with_fresh_codename
    stub_connection current_player_id: player.id
    subscribe
    expect(subscription).to be_confirmed
    expect(world.online_count).to eq(1)

    other = world.join_player(99, codename: "otro", color: "#FFFFFF", sink: ->(_f) {})
    world.move(other, {"x" => 10, "y" => 100, "z" => 0, "yaw" => 0, "pitch" => 0, "roll" => 0, "s" => 40})
    perform :move, x: 0, y: 100, z: 0, yaw: 0, pitch: 0, roll: 0, s: 40
    world.tick(Process.clock_gettime(Process::CLOCK_MONOTONIC) + 1)

    expect(transmissions.last["p"]).to eq([[99, 10.0, 100.0, 0.0, 0.0, 0.0, 0.0, 40.0]])
    expect(transmissions.last["j"]).to eq([[99, "otro", "#FFFFFF"]])

    expect(world.online_count).to eq(2)
    unsubscribe
    expect(world.online_count).to eq(1)
  end
end
