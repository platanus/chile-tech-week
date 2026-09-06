# One Chile Tech Week: the year it runs and the week it runs in (Santiago time). The year is
# its identity — the primary key, the "26" in /admin/26, the number in every title — and
# `events.edition` is the foreign key pointing back here.
#
# Named `Week` and not `TechWeek` because `TechWeek` is this application's own module
# (config/application.rb), so the constant is taken.
#
# There is no CRUD for these: a new edition is a line in KNOWN, written by db/seeds.rb.
class Week < ApplicationRecord
  self.primary_key = :year

  TIME_ZONE = "America/Santiago".freeze
  DAY_NAMES = %w[Dom Lun Mar Mié Jue Vie Sáb].freeze

  # The weeks the site knows about. Seeds write them; the CreateWeeks migration wrote the
  # same two rows so the events already in the table had something to point at.
  KNOWN = [
    {year: 2025, starts_on: Date.new(2025, 11, 17), ends_on: Date.new(2025, 11, 23)},
    {year: 2026, starts_on: Date.new(2026, 11, 16), ends_on: Date.new(2026, 11, 22)}
  ].freeze

  Day = Data.define(:date, :label)

  has_many :events, foreign_key: :edition, inverse_of: :week, dependent: :restrict_with_exception

  validates :year, :starts_on, :ends_on, presence: true

  scope :newest_first, -> { order(year: :desc) }

  class << self
    def seed!
      KNOWN.each { |attributes| find_or_create_by!(year: attributes[:year]) { |week| week.assign_attributes(attributes) } }
    end

    # The week a page is about when nothing says otherwise: the one running today, else
    # whichever starts or ended closest to it. A handful of rows, compared in Ruby.
    def current(on = Date.current)
      all.min_by { |week| week.days_from(on) } || raise(ActiveRecord::RecordNotFound, "no tech weeks — run db:seed")
    end

    # "26" (and "2026", so a full year in a URL still resolves) → the week, or nil.
    def from_slug(slug)
      digits = slug.to_s[/\A\d{2}(?:\d{2})?\z/] or return nil
      find_by(year: (digits.length == 2) ? 2000 + digits.to_i : digits.to_i)
    end
  end

  # "25", "26": the two-digit slug the URLs use.
  def slug = format("%02d", year % 100)

  alias_method :to_param, :slug

  # 0 while the week is running, otherwise the days to its start or since its end.
  def days_from(date)
    return 0 if date.between?(starts_on, ends_on)

    ((date < starts_on) ? starts_on - date : date - ends_on).to_i
  end

  # Every day of the week: `date` as "2026-11-16", `label` as "Lun 16".
  def days
    (starts_on..ends_on).map { |date| Day.new(date: date.iso8601, label: "#{DAY_NAMES[date.wday]} #{date.day}") }
  end

  # [Monday 00:00, the Monday after 00:00) in Santiago: when an event may start and end.
  def window
    zone = ActiveSupport::TimeZone[TIME_ZONE]
    zone.local(starts_on.year, starts_on.month, starts_on.day)...zone.local(ends_on.year, ends_on.month, ends_on.day + 1)
  end

  def within_window?(time)
    time.present? && window.cover?(time)
  end

  # "16 al 22 de noviembre"
  def dates_label
    "#{starts_on.day} al #{ends_on.day} de #{I18n.t("date.month_names", locale: :es)[starts_on.month]}"
  end
end
