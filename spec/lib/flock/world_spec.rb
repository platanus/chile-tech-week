require "rails_helper"

RSpec.describe Flock::World do
  # A world driven by hand: fake clock, no ticker thread, every frame captured per member.
  let(:clock) { {t: 1000.0} }
  let(:world) { described_class.new(clock: -> { clock[:t] }) }
  let(:frames) { Hash.new { |h, k| h[k] = [] } }

  before { allow(world).to receive(:ensure_running) }

  def join(id, codename: "pilot-#{id}", color: "#FFFFFF")
    world.join_player(id, codename:, color:, sink: ->(f) { frames[id] << f })
  end

  def spectate(key)
    world.join_spectator(sink: ->(f) { frames[key] << f })
  end

  def place(member, x, y = 100, z = 0, yaw: 0, speed: 40, urgent: false)
    data = {"x" => x, "y" => y, "z" => z, "yaw" => yaw, "pitch" => 0, "roll" => 0, "s" => speed}
    data["u"] = 1 if urgent
    clock[:t] += 0.05 # comfortably past MIN_MOVE_INTERVAL
    world.move(member, data)
  end

  def advance(ticks)
    ticks.times do
      clock[:t] += described_class::TICK
      world.tick
    end
  end

  def positions(id) = frames[id].flat_map { |f| f["p"] || [] }

  describe "frames" do
    it "sends each pilot the positions, introductions and count for their neighbours" do
      a, b = join(1), join(2, codename: "zorro-andino-42", color: "#F5C542")
      place(a, 0)
      place(b, 50)
      advance(1)

      frame = frames[1].last
      expect(frame["p"]).to eq([[2, 50.0, 100.0, 0.0, 0.0, 0.0, 0.0, 40.0]])
      expect(frame["j"]).to eq([[2, "zorro-andino-42", "#F5C542"]])
      expect(frame["n"]).to eq(2)
      expect(frame["t"]).to be_a(Integer)
      expect(frames[2].last["p"]).to eq([[1, 0.0, 100.0, 0.0, 0.0, 0.0, 0.0, 40.0]])
    end

    it "introduces a neighbour once, and again after a rename" do
      a, b = join(1), join(2)
      place(a, 0)
      place(b, 50)
      advance(1)
      place(b, 51)
      advance(1)
      expect(frames[1].count { |f| f["j"] }).to eq(1)

      world.update_meta(2, codename: "puma-veloz-7")
      place(b, 52)
      advance(1)
      expect(frames[1].last["j"]).to eq([[2, "puma-veloz-7", nil].compact.then { |_| [2, "puma-veloz-7", "#FFFFFF"] }])
    end

    it "does not resend a position that has not changed" do
      a, b = join(1), join(2)
      place(a, 0)
      place(b, 50)
      advance(1)
      place(b, 50) # heartbeat with the same state
      advance(5)
      expect(positions(1).size).to eq(1)
    end

    it "sends nothing at all when there is nothing to say" do
      a = join(1)
      place(a, 0)
      advance(1)
      count = frames[1].size
      advance(described_class::COUNT_EVERY - 2)
      expect(frames[1].size).to eq(count)
    end

    it "refreshes the online count when it changes" do
      a = join(1)
      place(a, 0)
      advance(1)
      expect(frames[1].last["n"]).to eq(1)
      join(2)
      advance(1)
      expect(frames[1].last["n"]).to eq(2)
    end

    it "clamps a pilot into the world and ignores garbage" do
      a, b = join(1), join(2)
      place(a, 5000, 3900)
      place(b, 99_999, 9_999)
      advance(1)
      x, y = positions(1).last[1..2]
      expect(x).to eq(Flock::Geometry.half_width)
      expect(y).to eq(4000.0)

      clock[:t] += 1
      world.move(b, {"x" => "nope", "y" => 1, "z" => 1, "yaw" => 0, "pitch" => 0, "roll" => 0, "s" => 1})
      world.move(b, {"x" => Float::NAN, "y" => 1, "z" => 1, "yaw" => 0, "pitch" => 0, "roll" => 0, "s" => 1})
      advance(1)
      expect(positions(1).size).to eq(1)
    end

    it "drops updates that arrive faster than the inbound limit" do
      a, b = join(1), join(2)
      place(a, 0)
      place(b, 50)
      world.move(b, {"x" => 60, "y" => 100, "z" => 0, "yaw" => 0, "pitch" => 0, "roll" => 0, "s" => 40}) # same instant
      advance(1)
      expect(positions(1).last[1]).to eq(50.0)
    end
  end

  describe "re-introduction" do
    it "introduces a neighbour again after they left the viewer's range and came back" do
      a, b = join(1), join(2)
      place(a, 0)
      place(b, 50)
      advance(described_class::INTEREST_EVERY)
      expect(frames[1].count { |f| f["j"] }).to eq(1)

      place(b, 5000) # out of every tier
      advance(described_class::INTEREST_EVERY)
      expect(frames[1].last["l"]).to eq([2])

      place(a, 1)
      place(b, 60)
      advance(described_class::INTEREST_EVERY)
      expect(frames[1].count { |f| f["j"] }).to eq(2)
    end
  end

  describe "interest tiers" do
    it "sends the nearest every tick, the middle band every 4th, the far band once a second, and nothing beyond" do
      viewer = join(1)
      near, mid, far, beyond = join(2), join(3), join(4), join(5)
      place(viewer, 0)
      advance(1) # rank once so the pilots below get placed after the first ranking
      100.times do |i|
        place(viewer, 0) # heartbeat: an unchanged position keeps the viewer from going stale
        place(near, 100 + i)
        place(mid, 800 + i)
        place(far, 2000 + i)
        place(beyond, 5000 + i)
        advance(1)
      end
      # the newcomers wait for the next ranking (up to INTEREST_EVERY ticks) before they count
      by_id = positions(1).group_by(&:first).transform_values(&:size)
      expect(by_id[2]).to be_between(88, 100)
      expect(by_id[3]).to be_between(20, 26)
      expect(by_id[4]).to be_between(4, 6)
      expect(by_id[5]).to be_nil
    end

    it "lets an urgent update jump the middle band's cadence but not the far band's" do
      viewer, mid, far = join(1), join(2), join(3)
      place(viewer, 0)
      place(mid, 800)
      place(far, 2000)
      advance(described_class::INTEREST_EVERY + 1) # ranked, and past the first tier-4 slot
      before_mid = positions(1).count { |p| p[0] == 2 }
      before_far = positions(1).count { |p| p[0] == 3 }
      place(mid, 801, urgent: true)
      place(far, 2001, urgent: true)
      # advance to a tick that is neither a multiple of 4 nor of 20
      advance(1) until (world.tick_count + 1) % 4 != 0 && (world.tick_count + 1) % 20 != 0
      advance(1)
      expect(positions(1).count { |p| p[0] == 2 }).to eq(before_mid + 1)
      expect(positions(1).count { |p| p[0] == 3 }).to eq(before_far)
    end

    it "caps the nearest tier by rank so a crowd at the spawn does not fan out to everyone" do
      viewer = join(1)
      place(viewer, 0)
      crowd = (2..40).map { |id| join(id) }
      crowd.each_with_index { |m, i| place(m, 10 + i) }
      advance(1) until world.tick_count > described_class::INTEREST_EVERY && world.tick_count % 20 == 0 # ranked, every tier flushed
      crowd.each_with_index { |m, i| place(m, 11 + i) }
      advance(1) # a tick where only the every-tick tier is due
      frame = frames[1].last
      expect(frame["p"].size).to eq(8)
      expect(frame["p"].map(&:first)).to eq((2..9).to_a)
    end

    it "pairs pilots across the mirrored fold" do
      a, b = join(1), join(2)
      l = Flock::Geometry.length
      place(a, 0, 100, l - 20)
      place(b, 0, 100, l + 20)
      advance(1)
      expect(positions(1).map(&:first)).to eq([2])
      expect(positions(1).last[3]).to eq((l + 20).to_f) # raw z travels as sent; the client picks the copy
    end
  end

  describe "leaving" do
    it "tells viewers when a neighbour disconnects or flies out of range" do
      a, b = join(1), join(2)
      place(a, 0)
      place(b, 50)
      advance(1)
      world.leave(b)
      advance(described_class::INTEREST_EVERY)
      expect(frames[1].any? { |f| f["l"] == [2] }).to be true

      c = join(3)
      place(c, 50)
      advance(described_class::INTEREST_EVERY)
      expect(frames[1].last["j"] || frames[1][-2]["j"]).to include([3, "pilot-3", "#FFFFFF"])
      place(c, 5000)
      advance(described_class::INTEREST_EVERY)
      expect(frames[1].any? { |f| f["l"] == [3] }).to be true
    end

    it "drops a pilot that goes quiet" do
      a, b = join(1), join(2)
      place(a, 0)
      place(b, 50)
      advance(1)
      expect(world.online_count).to eq(2)
      clock[:t] += described_class::STALE_AFTER + 1
      place(a, 1)
      advance(1)
      expect(world.online_count).to eq(1)
    end

    it "readmits a pilot dropped for silence when their moves resume, unless replaced" do
      a, b = join(1), join(2)
      place(a, 0)
      place(b, 50)
      clock[:t] += described_class::STALE_AFTER + 1
      place(a, 1)
      advance(1)
      expect(world.online_count).to eq(1)
      place(b, 51)
      expect(world.online_count).to eq(2)

      clock[:t] += described_class::STALE_AFTER + 1
      place(a, 2)
      advance(1)
      newer = join(2)
      place(b, 52)
      expect(world.online_count).to eq(2)
      world.leave(newer)
      expect(world.online_count).to eq(1)
    end

    it "replaces a pilot who joins twice, so the stale socket cannot double them" do
      first = join(1)
      second = join(1)
      expect(world.online_count).to eq(1)
      world.leave(first)
      expect(world.online_count).to eq(1)
      world.leave(second)
      expect(world.online_count).to eq(0)
    end
  end

  describe "spectators" do
    it "watch at a low cadence, are never shown to pilots, and do not count" do
      pilot, watcher = join(1), spectate(:w)
      place(pilot, 0)
      place(watcher, 10)
      advance(1)
      expect(world.online_count).to eq(1)
      50.times do |i|
        place(pilot, i)
        advance(1)
      end
      expect(positions(:w).size).to be_between(4, 6)
      expect(positions(1)).to be_empty
      expect(frames[:w].last["n"] || frames[:w].find { |f| f["n"] }["n"]).to eq(1)
    end
  end

  describe "roster" do
    let(:every) { described_class::ROSTER_EVERY }

    def rosters(id) = frames[id].select { |f| f["r"] }

    it "sends every pilot the whole sky coarsely, with the directory, on their own tick" do
      a, b = join(1, codename: "condor-austral-3", color: "#FFFFFF"), join(2, codename: "zorro-andino-42", color: "#F5C542")
      place(a, 0.4, 100.2, 0)
      place(b, 5000, 250, 12.6) # far outside every tier: only the roster carries them
      advance(every)

      expect(rosters(1).size).to eq(1)
      expect(rosters(2).size).to eq(1)
      expect(rosters(1).first["r"]).to eq("1:0:100:0 2:5000:250:13")
      expect(rosters(1).first["d"]).to eq([[1, "condor-austral-3", "#FFFFFF"], [2, "zorro-andino-42", "#F5C542"]])
      expect(positions(1)).to be_empty
      expect(frames[1].index(rosters(1).first)).not_to eq(frames[2].index(rosters(2).first))
    end

    it "folds z onto the real relief" do
      a, b = join(1), join(2)
      place(a, 0)
      place(b, 0, 100, -100)
      advance(every)
      expect(rosters(1).first["r"]).to eq("1:0:100:0 2:0:100:100")
    end

    it "repeats the directory only after a join, a leave or a rename" do
      a, b = join(1), join(2)
      # a heartbeat before each period: a pilot silent for STALE_AFTER is dropped
      period = -> {
        place(a, 0)
        place(b, 5000)
        advance(every)
      }
      period.call
      period.call
      expect(rosters(1).map { |f| f.key?("d") }).to eq([true, false])

      world.update_meta(2, codename: "puma-veloz-7")
      period.call
      expect(rosters(1).last["d"]).to include([2, "puma-veloz-7", "#FFFFFF"])

      c = join(3)
      place(c, 6000)
      period.call
      expect(rosters(1).last["d"].map(&:first)).to eq([1, 2, 3])

      world.leave(c)
      period.call
      expect(rosters(1).last["d"].map(&:first)).to eq([1, 2])
      expect(rosters(1).last["r"]).not_to include("3:")
    end

    it "is not sent to a lone pilot nor to spectators" do
      a = join(1)
      place(a, 0)
      advance(every)
      expect(rosters(1)).to be_empty

      b = join(2)
      place(b, 5000)
      s = spectate(:s)
      place(s, 10)
      advance(every)
      expect(rosters(1).size).to eq(1)
      expect(rosters(:s)).to be_empty
    end
  end

  describe "#name_in_use?" do
    it "is true for pilots online, except themselves, ignoring accents and case" do
      join(1, codename: "ñandu-veloz-1")
      expect(world.name_in_use?("Nandu-Veloz-1")).to be true
      expect(world.name_in_use?("nandu-veloz-1", except_id: 1)).to be false
      expect(world.name_in_use?("otro")).to be false
    end

    it "holds a name for a while after its pilot leaves" do
      m = join(1, codename: "puma-bravo-9")
      world.leave(m)
      expect(world.name_in_use?("puma-bravo-9")).to be true
      expect(world.name_in_use?("puma-bravo-9", except_id: 1)).to be false
      clock[:t] += described_class::NAME_HOLD + 1
      expect(world.name_in_use?("puma-bravo-9")).to be false
    end
  end
end
