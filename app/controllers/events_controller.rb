# The current edition's events, public side: the programme, the submission form and each
# event's status page (its uuid is what the host receives by email).
class EventsController < InertiaController
  TITLE = "Eventos · Chile Tech Week 2026"
  DESCRIPTION = "El programa de Chile Tech Week 2026: los eventos tech de la semana, " \
    "del #{Edition.dates_label}, en todo Chile."

  EVENT_PARAMS = [
    :title, :description, :author_name, :author_email, :author_phone_number, :company_name,
    :company_website, :starts_at, :ends_at, :commune, :format, :capacity, :logo_upload
  ].freeze
  COHOST_PARAMS = [
    :company_name, :logo_upload, :primary_contact_name, :primary_contact_email,
    :primary_contact_phone_number, :primary_contact_website, :primary_contact_linkedin
  ].freeze

  def index
    @title = TITLE
    @description = DESCRIPTION
    @events = published_events.includes(:themes, :audiences, :cohosts).with_attached_cover
    @days = week_days
  end

  def new
    @title = "Organiza un evento · Chile Tech Week 2026"
    @description = "Inscribe tu evento en el programa de Chile Tech Week 2026."
    @days = week_days
    @week = {from: Edition::STARTS_ON.iso8601, to: Edition::ENDS_ON.iso8601}
    @communes = Communes::ALL
    @formats = Event::FORMATS
    @themes = Theme.order(:name)
    @audiences = Audience.order(:name)
    @description_limit = Event::DESCRIPTION_LIMIT
  end

  def create
    event = Event.new(event_params.merge(edition: Edition::YEAR))
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
    @title = "#{@event.title} · Chile Tech Week 2026"
    @description = "El estado de tu evento en Chile Tech Week 2026."
    @open_publish = params[:publish] == "true" && @event.step == 3
  end

  private

  def published_events
    Event.for_edition(Edition::YEAR).published.chronological
  end

  # The week's days with how many published events each already has.
  def week_days
    counts = published_events.unscope(:order).group("(starts_at AT TIME ZONE '#{Edition::TIME_ZONE}')::date").count
    Edition.days.map { |day| {date: day.date, label: day.label, count: counts.fetch(Date.parse(day.date), 0)} }
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
