# Who the pilot is: creates the Player on the first flight, keeps them in a signed cookie, and
# takes their rename and colour choices. The socket (FlockChannel) only ever sees the cookie.
class FlockSessionsController < ApplicationController
  COOKIE = :condor_player

  # POST /flock/session — called when the game starts. Returns the pilot, freshly named if
  # their codename is held by someone online right now.
  def create
    player = current_player || Player.with_fresh_codename
    renamed = false
    if world.name_in_use?(player.codename, except_id: player.id)
      player.update!(codename: Flock::Codename.generate { |name| !world.name_in_use?(name) && !Player.exists?(codename: name) })
      renamed = true
    end
    player.update_column(:last_seen_at, Time.current)
    cookies.signed.permanent[COOKIE] = {value: player.id, httponly: true, same_site: :lax}
    render json: {id: player.id, codename: player.codename, color: player.color, renamed:, palette: Flock::Palette::COLORS}
  end

  # PATCH /flock/session — a new codename (only if no one online has it) and/or colour.
  def update
    player = current_player or return head(:unauthorized)
    attrs = {}
    if params.key?(:codename)
      name = Flock::Codename.normalize(params[:codename])
      return render(json: {error: message(:invalid_name)}, status: :unprocessable_entity) unless Flock::Codename.valid?(name)
      return render(json: {error: message(:name_taken)}, status: :unprocessable_entity) if world.name_in_use?(name, except_id: player.id)
      attrs[:codename] = name
    end
    if params.key?(:color)
      return render(json: {error: message(:unknown_color)}, status: :unprocessable_entity) unless Flock::Palette.valid?(params[:color])
      attrs[:color] = params[:color]
    end
    player.update!(attrs)
    world.update_meta(player.id, **attrs)
    render json: {id: player.id, codename: player.codename, color: player.color}
  end

  private

  # The reasons a rename fails, in the landing's language (the game sends `locale`, from
  # <html lang>).
  MESSAGES = {
    "es" => {
      invalid_name: "entre #{Flock::Codename::MIN_LENGTH} y #{Flock::Codename::MAX_LENGTH} caracteres: letras, números y guiones",
      name_taken: "ese nombre está en uso", unknown_color: "color desconocido"
    },
    "en" => {
      invalid_name: "#{Flock::Codename::MIN_LENGTH} to #{Flock::Codename::MAX_LENGTH} characters: letters, numbers and hyphens",
      name_taken: "that name is taken", unknown_color: "unknown colour"
    }
  }.freeze

  def message(key)
    MESSAGES.fetch(params[:locale].to_s, MESSAGES["es"]).fetch(key)
  end

  def current_player
    id = cookies.signed[COOKIE]
    id && Player.find_by(id: id)
  end

  def world = Flock::World.instance
end
