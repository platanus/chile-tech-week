# The multiplayer socket. A `player` subscription puts the pilot in the flock; a `spectator` one
# (the landing in ambient mode) only watches, at a lower cadence, and is never shown to others.
# Movement comes in as `move` actions; everything the viewer should see goes out as frames built
# by Flock::World's ticker thread. Frames bypass Channel#transmit on purpose: at 20 Hz per member
# its per-message logging and instrumentation would be the dominant cost.
class FlockChannel < ApplicationCable::Channel
  def subscribed
    @member =
      if params[:role] == "spectator"
        world.join_spectator(sink:)
      else
        player = current_player_id && Player.find_by(id: current_player_id)
        player ? world.join_player(player.id, codename: player.codename, color: player.color, sink:) : reject
      end
  end

  def unsubscribed
    world.leave(@member) if @member
  end

  def move(data)
    world.move(@member, data) if @member
  end

  private

  def world = Flock::World.instance

  def sink
    conn = connection
    id = identifier
    ->(frame) { conn.transmit(identifier: id, message: frame) }
  end
end
