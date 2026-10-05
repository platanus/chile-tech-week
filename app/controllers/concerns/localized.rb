# The public site in two languages: Spanish at /, English under /en (the optional `(:locale)`
# scope in config/routes.rb). The URL alone decides the language of a page, so a shared link
# shows everyone the same thing and both versions are indexable; nothing redirects on the
# browser's language. The visitor's own choice lives in the `locale` cookie, written by the
# switcher in the browser (components/site/locale-switch.tsx), and is only acted on at the
# bare root: someone who chose English and types techweek.cl lands on /en.
#
# Without that choice the page may suggest the other language once (`localeSuggestion`, a
# banner the visitor can take or dismiss — either answer writes the cookie). Spanish is
# assumed for anyone in a Spanish-speaking country, whatever their browser says (a Chilean
# on an English laptop still reads Spanish); elsewhere the browser's first language decides.
module Localized
  extend ActiveSupport::Concern

  LOCALES = %w[es en].freeze
  COOKIE = "locale"
  # Where Cloudflare's CF-IPCountry says Spanish is the language people read. Brazil is not
  # here on purpose: a Brazilian gets offered English.
  SPANISH_SPEAKING_COUNTRIES = %w[AR BO CL CO CR CU DO EC ES GQ GT HN MX NI PA PE PR PY SV UY VE].freeze

  included do
    around_action :switch_locale
    before_action :follow_chosen_locale, if: -> { request.get? && request.path == "/" }

    inertia_share localeSwitch: -> {
      {alternates: locale_alternates, suggestion: locale_suggestion}
    }
  end

  # The same page in each language, query string included: what the switcher links to and
  # what the hreflang tags announce.
  def locale_alternates
    path = request.path.sub(%r{\A/en(?=/|\z)}, "").presence || "/"
    query = request.query_string.presence&.then { |q| "?#{q}" }
    {"es" => "#{path}#{query}", "en" => "#{(path == "/") ? "/en" : "/en#{path}"}#{query}"}
  end

  private

  def switch_locale(&)
    I18n.with_locale((params[:locale] == "en") ? :en : :es, &)
  end

  # Every URL Rails builds while serving an English page stays English. The key is there in
  # Spanish too, as nil: without it a positional `event_path(event)` would fill the optional
  # (:locale) segment with the event.
  def default_url_options
    {locale: (I18n.locale == :en) ? "en" : nil}
  end

  def follow_chosen_locale
    redirect_to "/en" if cookies[COOKIE] == "en"
  end

  # The language to offer in the banner, or nil when the page is already in it or the visitor
  # has chosen.
  def locale_suggestion
    return if LOCALES.include?(cookies[COOKIE])

    preferred = (spanish_speaking_country? || spanish_browser?) ? "es" : "en"
    preferred unless preferred == I18n.locale.to_s
  end

  def spanish_speaking_country?
    SPANISH_SPEAKING_COUNTRIES.include?(request.headers["CF-IPCountry"].to_s.upcase)
  end

  # The browser's first language, by quality: "es-CL,es;q=0.9,en;q=0.8" is Spanish.
  def spanish_browser?
    languages = request.headers["Accept-Language"].to_s.split(",").map do |entry|
      tag, quality = entry.strip.split(";q=")
      [tag.to_s.downcase, (quality || 1).to_f]
    end
    first = languages.max_by { |_, quality| quality }
    first.present? && first[0].start_with?("es")
  end
end
