# The live flock: every connected condor, where it is, and who gets told about whom. One instance
# per Puma process, all state in memory, so it only works while the app runs a single web
# process (config/initializers/flock.rb asserts that). Nothing here touches the database.
#
# Protocol. Each member's socket receives frames at most TICK apart:
#   { t: ms, p: [[id, x, y, z, yaw, pitch, roll, speed], …], j: [[id, codename, color], …],
#     l: [id, …], n: online, r: "id:x:y:z id:x:y:z …", d: [[id, codename, color], …] }
# `p` carries the positions due this tick, `j` introduces (or re-introduces, after a rename) the
# players in `p` the viewer has not met, `l` lists the ids that left the viewer's range, `n` is
# the count of pilots online (sent every COUNT_EVERY ticks or when it changes). Keys are omitted
# when empty, and a frame with nothing to say is not sent at all.
#
# Roster. On top of the precise neighbourhood, every pilot gets the whole sky coarsely: `r` lists
# every positioned pilot as whole world units (z folded onto the real relief) every ROSTER_EVERY
# ticks, each viewer on their own tick so the sends spread out, and the string is built once per
# tick and shared. `d` is the directory (id, codename, colour) of everyone flying, sent with the
# roster only when it changed since the viewer last got it. The map, the nearest-condor readout
# and the roster panel draw from these; the precise tiers stay for the birds in view.
#
# Interest. Every INTEREST_EVERY ticks each viewer's neighbours are ranked by distance and put
# into tiers: the nearest few at every tick, the next band at a quarter of that, the far band once
# a second, and nothing beyond. Within a tier a position is only resent when it changed, and an
# update the pilot flagged as urgent (an input change) jumps the cadence of the near tiers, so a
# turn shows up on the next tick while straight flight costs almost nothing.
module Flock
  class World
    TICK = 0.05            # seconds; 20 Hz
    INTEREST_EVERY = 10    # ticks; neighbours re-ranked at 2 Hz
    COUNT_EVERY = 40       # ticks; online count refreshed at 0.5 Hz
    ROSTER_EVERY = 40      # ticks; every pilot's coarse position at 0.5 Hz, each viewer on their own tick
    STALE_AFTER = 8.0      # seconds without an update before a member is dropped
    NAME_HOLD = 30.0       # seconds a codename stays reserved after its pilot disconnects
    MIN_MOVE_INTERVAL = 0.035 # seconds; inbound updates faster than this are dropped
    # [cumulative max rank, max distance in world units, every n ticks]
    PLAYER_TIERS = [[8, 300, 1], [24, 1000, 4], [64, 2600, 20]].freeze
    SPECTATOR_TIERS = [[8, 600, 10], [24, 2600, 20]].freeze
    URGENT_MAX_EVERY = 4   # urgent updates jump the cadence of tiers this frequent or better

    # A connected socket. A plain class, not a Struct: members are hash keys by identity and
    # mutate on every tick, which a value-equal Struct would break.
    class Member
      attr_accessor :role, :id, :codename, :color, :sink, :meta_version, :state, :version,
        :urgent_version, :x, :y, :z, :last_seen, :last_move, :interest, :known, :sent, :leaves, :last_count,
        :roster_slot, :dir_version

      def initialize(role:, sink:, now:, id: nil, codename: nil, color: nil)
        @role, @sink, @id, @codename, @color = role, sink, id, codename, color
        @meta_version = 1
        @version = 0
        @urgent_version = 0
        @last_seen = now
        @last_move = -1.0
        @interest = []
        @known = {}
        @sent = {}
        @leaves = []
        @roster_slot = id.to_i % ROSTER_EVERY
        @dir_version = 0
      end

      def player? = role == :player

      def positioned? = !state.nil?
    end

    Entry = Struct.new(:member, :every)

    class << self
      def instance = @instance ||= new
    end

    attr_reader :tick_count

    def initialize(clock: -> { Process.clock_gettime(Process::CLOCK_MONOTONIC) })
      @clock = clock
      @lock = Mutex.new
      @members = {}   # member => true
      @players = {}   # player id => member
      @holds = {}     # codename key => [player id, held until]
      @dir_version = 1 # bumped whenever the set of pilots, or a name or colour, changes
      @roster = nil   # [tick, string]: the roster encoded once per tick
      @tick_count = 0
      @thread = nil
    end

    # ---- membership -------------------------------------------------------------------------

    def join_player(id, codename:, color:, sink:)
      member = Member.new(role: :player, id:, codename:, color:, sink:, now:)
      @lock.synchronize do
        if (old = @players[id]) # a second tab, or a reconnect that beat the old socket's close
          @members.delete(old)
          member.interest = old.interest
        end
        @players[id] = member
        @members[member] = true
        @holds.delete(Codename.key(codename))
        @dir_version += 1
      end
      ensure_running
      member
    end

    def join_spectator(sink:)
      member = Member.new(role: :spectator, sink:, now:)
      @lock.synchronize { @members[member] = true }
      ensure_running
      member
    end

    def leave(member)
      @lock.synchronize { remove(member) }
    end

    # A pilot's position, straight from the client: [x, y, z, yaw, pitch, roll, speed] plus an
    # `u` flag when it follows an input change. Values are clamped to the world, not trusted.
    def move(member, data)
      t = now
      return if t - member.last_move < MIN_MOVE_INTERVAL
      x, y, z, yaw, pitch, roll, speed = %w[x y z yaw pitch roll s].map { |k| Float(data[k], exception: false) }
      return unless [x, y, z, yaw, pitch, roll, speed].all? { |v| v&.finite? }
      x = x.clamp(-Geometry.half_width, Geometry.half_width)
      y = y.clamp(0.0, 4000.0)
      speed = speed.clamp(0.0, 400.0)
      state = [member.id, x.round(1), y.round(1), z.round(1), yaw.round(3), pitch.round(3), roll.round(3), speed.round(1)].freeze
      @lock.synchronize do
        readmit(member) unless @members.key?(member)
        member.last_seen = t
        member.last_move = t
        member.x, member.y, member.z = x, y, z
        next if member.state == state
        member.state = state
        member.version += 1
        member.urgent_version = member.version if data["u"]
      end
    end

    # Rename or recolour a pilot: viewers re-meet them on the next frame that carries them.
    def update_meta(id, codename: nil, color: nil)
      @lock.synchronize do
        member = @players[id] or next
        member.codename = codename if codename
        member.color = color if color
        member.meta_version += 1
        @dir_version += 1
      end
    end

    def online_count
      @lock.synchronize { @players.size }
    end

    # Taken by a pilot online now, or reserved for one who left less than NAME_HOLD ago.
    def name_in_use?(codename, except_id: nil)
      key = Codename.key(codename)
      @lock.synchronize do
        return true if @players.any? { |id, m| id != except_id && Codename.key(m.codename) == key }
        hold = @holds[key]
        !!(hold && hold[0] != except_id && hold[1] > now)
      end
    end

    # ---- the tick ---------------------------------------------------------------------------

    # One step of the loop: drop the stale, re-rank when due, and send everyone their frame.
    # Public so specs can drive it without the thread.
    def tick(t = now)
      frames = []
      @lock.synchronize do
        @tick_count += 1
        @members.each_key { |m| remove(m) if t - m.last_seen > STALE_AFTER }
        rank_interest if @tick_count % INTEREST_EVERY == 1
        count = @players.size
        @members.each_key do |viewer|
          frame = build_frame(viewer, t, count)
          frames << [viewer.sink, frame] if frame
        end
      end
      frames.each { |sink, frame| sink.call(frame) }
      frames.size
    end

    def running? = !!@thread&.alive?

    private

    def now = @clock.call

    # A member dropped for silence (a backgrounded tab) whose socket is still open comes back
    # on its next move — unless a newer socket has taken the pilot's place meanwhile.
    def readmit(member)
      return if member.player? && @players.key?(member.id)
      @members[member] = true
      if member.player?
        @players[member.id] = member
        @holds.delete(Codename.key(member.codename))
        @dir_version += 1
      end
    end

    def remove(member)
      return unless @members.delete(member)
      if member.player? && @players[member.id].equal?(member)
        @players.delete(member.id)
        @holds[Codename.key(member.codename)] = [member.id, now + NAME_HOLD]
        @dir_version += 1
      end
    end

    def rank_interest
      pilots = @players.values.select(&:positioned?)
      @members.each_key do |viewer|
        next unless viewer.positioned?
        tiers = viewer.player? ? PLAYER_TIERS : SPECTATOR_TIERS
        reach = tiers.last[1]
        near = pilots.filter_map do |p|
          next if p.equal?(viewer)
          d = Geometry.distance(viewer.x, viewer.y, viewer.z, p.x, p.y, p.z)
          [d, p] if d <= reach
        end
        near.sort_by!(&:first)
        entries = []
        near.each_with_index do |(d, p), rank|
          tier = tiers.find { |max_rank, max_d, _| rank < max_rank && d <= max_d } or break
          entries << Entry.new(p, tier[2])
        end
        gone = viewer.interest.map { |e| e.member.id } - entries.map { |e| e.member.id }
        viewer.leaves.concat(gone)
        viewer.interest = entries
      end
      # a pilot who left the world is a leave for everyone who still lists them
      @members.each_key do |viewer|
        viewer.interest.reject! do |e|
          gone = !@members.key?(e.member)
          viewer.leaves << e.member.id if gone
          gone
        end
      end
    end

    def build_frame(viewer, t, count)
      positions = nil
      intros = nil
      viewer.interest.each do |entry|
        target = entry.member
        last = viewer.sent[target.id] || 0
        next if target.version == last
        due = @tick_count % entry.every == 0 ||
          (entry.every <= URGENT_MAX_EVERY && target.urgent_version > last)
        next unless due
        (positions ||= []) << target.state
        viewer.sent[target.id] = target.version
        if viewer.known[target.id] != target.meta_version
          (intros ||= []) << [target.id, target.codename, target.color]
          viewer.known[target.id] = target.meta_version
        end
      end
      leaves = nil
      unless viewer.leaves.empty?
        leaves = viewer.leaves.uniq
        viewer.leaves.clear
        # the viewer forgets them whole: back in range they are introduced again
        leaves.each { |id|
          viewer.sent.delete(id)
          viewer.known.delete(id)
        }
      end
      online = count if viewer.last_count != count || @tick_count % COUNT_EVERY == 0
      roster = directory = nil
      if viewer.player? && count > 1 && @tick_count % ROSTER_EVERY == viewer.roster_slot
        roster = roster_string
        directory = @players.values.map { |m| [m.id, m.codename, m.color] } if viewer.dir_version != @dir_version
        viewer.dir_version = @dir_version
      end
      return nil unless positions || intros || leaves || online || roster
      viewer.last_count = count if online
      frame = {"t" => (t * 1000).round}
      frame["p"] = positions if positions
      frame["j"] = intros if intros
      frame["l"] = leaves if leaves
      frame["n"] = online if online
      frame["r"] = roster if roster
      frame["d"] = directory if directory
      frame
    end

    # Every positioned pilot, whole units, z folded: one string per tick however many viewers
    # are due, so the encoding cost does not grow with the square of the flock.
    def roster_string
      return @roster[1] if @roster && @roster[0] == @tick_count
      s = @players.each_value.filter_map { |m| "#{m.id}:#{m.x.round}:#{m.y.round}:#{Geometry.fold(m.z).round}" if m.positioned? }.join(" ")
      @roster = [@tick_count, s]
      s
    end

    # The loop thread, started by the first join. Ticks on a fixed grid so the cadence does not
    # drift with the work; an exception in one tick is reported and the loop carries on.
    def ensure_running
      @lock.synchronize do
        return if @thread&.alive?
        @thread = Thread.new do
          Thread.current.name = "flock-ticker"
          next_at = now
          loop do
            next_at += TICK
            begin
              tick
            rescue => e
              Rails.error.report(e, handled: true, source: "flock")
            end
            delay = next_at - now
            if delay.positive?
              sleep(delay)
            else
              next_at = now # fell behind: resync instead of bursting to catch up
            end
          end
        end
      end
    end
  end
end
