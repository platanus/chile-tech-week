module ApplicationCable
  class Connection < ActionCable::Connection::Base
    # The pilot behind the socket, from the signed cookie FlockSessionsController sets. Nil for a
    # visitor who has never entered the game: they may still watch the flock as a spectator.
    identified_by :current_player_id

    def connect
      self.current_player_id = cookies.signed[FlockSessionsController::COOKIE]&.to_i
    end
  end
end
