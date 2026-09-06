# What a host hears through the review, and what an admin hears about a new submission.
# Every method takes `event:` through `with`; views under app/views/event_mailer.
class EventMailer < ApplicationMailer
  before_action { @event = params[:event] }
  before_action :set_event_details

  # The host, right after submitting.
  def submitted
    template(:event_submitted, event_id: @event.id)
    mail(to: @event.author_email, subject: "Recibimos tu evento · Chile Tech Week #{@event.edition}")
  end

  # An admin that asked to hear about every submission (User.notified).
  def new_submission
    @user = params[:user]
    template(:new_submission, event_id: @event.id)
    mail(to: @user.email, subject: "Nuevo evento enviado: #{@event.title}")
  end

  # Approved: the Luma event exists, the host must edit and publish it.
  def approved
    @luma_url = @event.luma_event_url
    template(:event_approved, event_id: @event.id)
    mail(to: @event.author_email, subject: "Evento aprobado: edita tu evento en Luma · Chile Tech Week #{@event.edition}")
  end

  def published
    template(:event_published, event_id: @event.id)
    mail(to: @event.author_email, subject: "Evento publicado: #{@event.title} · Chile Tech Week #{@event.edition}")
  end

  def rejected
    template(:event_rejected, event_id: @event.id)
    mail(to: @event.author_email, subject: "Tu evento necesita cambios · Chile Tech Week #{@event.edition}")
  end

  # Daily, while the Luma event waits for its edit (Luma::Reminder).
  def luma_reminder
    @days_waiting = params[:days_waiting]
    template(:luma_reminder, event_id: @event.id, days_waiting: @days_waiting)
    mail(to: @event.author_email, subject: "Recordatorio: edita tu evento en Luma «#{@event.title}»")
  end

  # Luma::Sync found the host cancelled the event on Luma.
  def luma_cancelled
    template(:luma_cancelled, event_id: @event.id)
    mail(to: @event.author_email, subject: "Evento dado de baja: #{@event.title}")
  end

  # Luma::Sync mirrored the host's edits; `changes` is {title:, starts_at:, ends_at:} → {old:, new:}.
  def luma_updated
    @changes = params[:changes]
    template(:luma_updated, event_id: @event.id, changes: @changes)
    mail(to: @event.author_email, subject: "Evento actualizado: #{@event.title}")
  end

  private

  def set_event_details
    @status_url = event_url(@event, host: site_url)
    @publish_url = event_url(@event, host: site_url, publish: true)
    @format_label = FORMAT_LABELS.fetch(@event.format, @event.format.humanize)
    @themes = @event.themes.map(&:name).join(", ").presence || "Sin temas"
    @when = "#{long_date(@event.starts_at)} – #{long_date(@event.ends_at)}"
  end

  FORMAT_LABELS = {
    "breakfast_brunch_lunch" => "Desayuno / Brunch / Almuerzo", "dinner" => "Cena", "experiential" => "Experiencia",
    "hackathon" => "Hackathon", "happy_hour" => "Happy hour", "matchmaking" => "Matchmaking", "networking" => "Networking",
    "panel_fireside_chat" => "Panel / Fireside chat", "pitch_event_demo_day" => "Pitch / Demo day",
    "roundtable_workshop" => "Mesa redonda / Taller"
  }.freeze

  DAYS = %w[domingo lunes martes miércoles jueves viernes sábado].freeze

  def long_date(time)
    local = time.in_time_zone(Week::TIME_ZONE)
    "#{DAYS[local.wday]} #{local.day} de noviembre, #{local.strftime("%H:%M")}"
  end
  helper_method :long_date
end
