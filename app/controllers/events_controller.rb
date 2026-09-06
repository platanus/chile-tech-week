# The current Tech Week's events, public side: the programme, the submission form and each
# event's status page (its uuid is what the host receives by email).
class EventsController < InertiaController
  EVENT_PARAMS = [
    :title, :description, :author_name, :author_email, :author_phone_number, :company_name,
    :company_website, :starts_at, :ends_at, :commune, :format, :capacity, :logo_upload
  ].freeze
  COHOST_PARAMS = [
    :company_name, :logo_upload, :primary_contact_name, :primary_contact_email,
    :primary_contact_phone_number, :primary_contact_website, :primary_contact_linkedin
  ].freeze

  before_action :set_week

  def index
    @title = "Eventos · #{week_name}"
    @description = "El programa de #{week_name}: los eventos tech de la semana, " \
      "del #{@week.dates_label}, en todo Chile."
    @events = published_events.includes(:themes, :audiences, :cohosts).with_attached_cover
    @days = week_days
  end

  def new
    @title = "Organiza un evento · #{week_name}"
    @description = "Inscribe tu evento en el programa de #{week_name}."
    @days = week_days
    @week_dates = {from: @week.starts_on.iso8601, to: @week.ends_on.iso8601}
    @communes = Communes::ALL
    @formats = Event::FORMATS
    @themes = Theme.order(:name)
    @audiences = Audience.order(:name)
    @description_limit = Event::DESCRIPTION_LIMIT
  end

  def create
    event = @week.events.new(event_params)
    event.themes = Theme.where(id: ids_param(:theme_ids))
    event.audiences = Audience.where(id: ids_param(:audience_ids))

    if event.save(context: :submission)
      EventNotifications.submitted(event)
      redirect_to event_path(event), notice: "¡Evento enviado! Lo revisaremos pronto."
    else
      purge_uploads(event)
      redirect_to new_event_path, inertia: {errors: event.errors.to_hash(true)}
    end
  end

  def show
    @event = Event.includes(:themes, :audiences, :cohosts).with_attached_cover.find(params[:id])
    @title = "#{@event.title} · Chile Tech Week #{@event.edition}"
    @description = "El estado de tu evento en Chile Tech Week #{@event.edition}."
    @open_publish = params[:publish] == "true" && @event.step == 3
  end

  private

  # The week the public site is about: the one running, or the nearest to today.
  def set_week
    @week = Week.current
  end

  def week_name
    "Chile Tech Week #{@week.year}"
  end

  def published_events
    @week.events.published.chronological
  end

  # The week's days with how many published events each already has.
  def week_days
    counts = published_events.unscope(:order).group("(starts_at AT TIME ZONE '#{Week::TIME_ZONE}')::date").count
    @week.days.map { |day| {date: day.date, label: day.label, count: counts.fetch(Date.parse(day.date), 0)} }
  end

  def event_params
    params.require(:event).permit(*EVENT_PARAMS, cohosts_attributes: COHOST_PARAMS)
  end

  # `event[theme_ids][]` arrives as an array from a plain form and as an index-keyed hash from
  # Inertia's FormData serialisation; either way, the ids.
  def ids_param(key)
    value = params.dig(:event, key)
    value.is_a?(ActionController::Parameters) ? value.values : Array(value)
  end

  # A rejected submission leaves nothing behind: the logos it uploaded go too.
  def purge_uploads(event)
    event.logo.purge if event.logo.attached?
    event.cohosts.each { |cohost| cohost.logo.purge if cohost.logo.attached? }
  end
end
