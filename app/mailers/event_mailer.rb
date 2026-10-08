# What a host hears through the review, and what an admin hears about a new submission.
# Every method takes `event:` through `with`; views under app/views/event_mailer.
#
# The host hears it in the language they submitted in (Event#locale): the English views are
# the `.en` twins (submitted.en.html.erb…), the links point at /en. The admin's notice about a
# new submission is always Spanish.
class EventMailer < ApplicationMailer
  before_action { @event = params[:event] }
  around_action :use_event_locale
  before_action :set_event_details

  # The host, right after submitting.
  def submitted
    template(:event_submitted, event_id: @event.id)
    mail(to: @event.author_email, subject: subject(:submitted))
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
    mail(to: @event.author_email, subject: subject(:approved))
  end

  def published
    template(:event_published, event_id: @event.id)
    mail(to: @event.author_email, subject: subject(:published))
  end

  def rejected
    template(:event_rejected, event_id: @event.id)
    mail(to: @event.author_email, subject: subject(:rejected))
  end

  # Daily, while the Luma event waits for its edit (Luma::Reminder).
  def luma_reminder
    @days_waiting = params[:days_waiting]
    template(:luma_reminder, event_id: @event.id, days_waiting: @days_waiting)
    mail(to: @event.author_email, subject: subject(:luma_reminder))
  end

  # An admin took the event down (Events::TakeDown); the reason is theirs to read.
  def taken_down
    template(:event_taken_down, event_id: @event.id)
    mail(to: @event.author_email, subject: subject(:taken_down))
  end

  # Luma::Sync found the host cancelled the event on Luma.
  def luma_cancelled
    template(:luma_cancelled, event_id: @event.id)
    mail(to: @event.author_email, subject: subject(:luma_cancelled))
  end

  # Luma::Sync mirrored the host's edits; `changes` is {title:, starts_at:, ends_at:} → {old:, new:}.
  def luma_updated
    @changes = params[:changes]
    template(:luma_updated, event_id: @event.id, changes: @changes)
    mail(to: @event.author_email, subject: subject(:luma_updated))
  end

  private

  def use_event_locale(&)
    locale = (action_name == "new_submission") ? :es : @event.locale
    I18n.with_locale(locale, &)
  end

  def set_event_details
    @status_url = event_url(@event, host: site_url, **url_locale)
    @publish_url = event_url(@event, host: site_url, publish: true, **url_locale)
    @format_label = @event.format_label
    @themes = @event.themes.map(&:name).join(", ").presence || t("event_mailer.no_themes")
    @when = "#{long_date(@event.starts_at)} – #{long_date(@event.ends_at)}"
  end

  # The site's links in the mail's language: /en/events/… for an English host. Always the key,
  # nil in Spanish, or a positional `event_url(@event)` fills (:locale) with the event.
  def url_locale
    {locale: (I18n.locale == :en) ? "en" : nil}
  end
  helper_method :url_locale

  def subject(key)
    t("event_mailer.subjects.#{key}", title: @event.title, edition: @event.edition)
  end

  # "miércoles 18 de noviembre, 18:30" / "Wednesday, November 18, 18:30"
  def long_date(time)
    local = time.in_time_zone(Week::TIME_ZONE)
    if I18n.locale == :en
      "#{local.strftime("%A")}, #{local.strftime("%B")} #{local.day}, #{local.strftime("%H:%M")}"
    else
      "#{I18n.t("date.day_names", locale: :es)[local.wday]} #{local.day} de #{I18n.t("date.month_names", locale: :es)[local.month]}, #{local.strftime("%H:%M")}"
    end
  end
  helper_method :long_date
end
