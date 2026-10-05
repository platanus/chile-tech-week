# The current Tech Week's events, public side: the programme, the submission form and each
# event's status page (its uuid is what the host receives by email).
class EventsController < InertiaController
  include Localized

  EVENT_PARAMS = [
    :title, :description, :author_name, :author_email, :author_phone_number, :company_name,
    :company_website, :starts_at, :ends_at, :address, :commune, :latitude, :longitude, :format, :capacity, :logo_upload
  ].freeze
  COHOST_PARAMS = [
    :company_name, :logo_upload, :primary_contact_name, :primary_contact_email,
    :primary_contact_phone_number, :primary_contact_website, :primary_contact_linkedin
  ].freeze

  before_action :set_week

  # The programme; /events.md (or `Accept: text/markdown`) is the same list for agents.
  def index
    @title = t("site.events.index.title", week: week_name)
    @description = t("site.events.index.description", week: week_name, dates: @week.dates_label)
    @events = published_events.includes(:themes, :audiences, :cohosts).with_attached_cover

    respond_to do |format|
      format.html do
        @days = week_days
        @markdown_alternate = events_path(format: :md)
        @structured_data = [Discovery::StructuredData.week(@week, events: @events)]
      end
      format.md { render plain: Discovery::Programme.new(@week, @events).render, content_type: Mime[:md] }
    end
  end

  def new
    @title = t("site.events.new.title", week: week_name)
    @description = t("site.events.new.description", week: week_name)
    @days = week_days
    @week_dates = {from: @week.starts_on.iso8601, to: @week.ends_on.iso8601}
    @formats = Event::FORMATS
    @themes = Theme.order(:name)
    @audiences = Audience.order(:name)
    @description_limit = Event::DESCRIPTION_LIMIT
    @prefill = @step = nil
    prefill_from_url if Rails.env.development?
  end

  def create
    event = @week.events.new(event_params.merge(locale: I18n.locale.to_s))
    event.themes = Theme.where(id: ids_param(:theme_ids))
    event.audiences = Audience.where(id: ids_param(:audience_ids))

    if event.save(context: :submission)
      EventNotifications.submitted(event)
      redirect_to event_path(event), notice: t("site.events.submitted")
    else
      purge_uploads(event)
      redirect_to new_event_path, inertia: {errors: event.errors.to_hash(true)}
    end
  end

  # The host's status page: its uuid is their secret, so no index gets to list it.
  def show
    @event = Event.includes(:themes, :audiences, :cohosts).with_attached_cover.find(params[:id])
    @title = "#{@event.title} · Chile Tech Week #{@event.edition}"
    @description = t("site.events.show.description", edition: @event.edition)
    @open_publish = params[:publish] == "true" && @event.step == 3
    @noindex = true
  end

  private

  # Development only: /events/new?step=2&event[company_name]=… opens the form on that step
  # (1–4) with those fields filled, so a page deep in the form is one URL away. Themes and
  # audiences take slugs or ids; the logo cannot be prefilled (browsers refuse to).
  def prefill_from_url
    @step = params[:step].to_i.clamp(1, 4) - 1 if params[:step].present?
    values = params.fetch(:event, {}).permit(*EVENT_PARAMS - [:logo_upload], theme_ids: [], audience_ids: []).to_h
    values["theme_ids"] = Theme.where(slug: values["theme_ids"]).or(Theme.where(id: values["theme_ids"].grep(/\A\h{8}-/))).pluck(:id) if values["theme_ids"]
    values["audience_ids"] = Audience.where(slug: values["audience_ids"]).or(Audience.where(id: values["audience_ids"].grep(/\A\h{8}-/))).pluck(:id) if values["audience_ids"]
    @prefill = values.presence
  end

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
