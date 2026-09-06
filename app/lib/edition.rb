# The edition the site is running: the year every new submission belongs to and the week it
# must fall in (Santiago time). The 2025 archive keeps its own dates under /25.
module Edition
  YEAR = 2026
  STARTS_ON = Date.new(2026, 11, 16) # Monday
  ENDS_ON = Date.new(2026, 11, 22)   # Sunday
  TIME_ZONE = "America/Santiago"

  DAY_NAMES = %w[Dom Lun Mar Mié Jue Vie Sáb].freeze

  Day = Data.define(:date, :label)

  module_function

  # Every day of the week: `date` as "2026-11-16", `label` as "Lun 16".
  def days
    (STARTS_ON..ENDS_ON).map { |date| Day.new(date: date.iso8601, label: "#{DAY_NAMES[date.wday]} #{date.day}") }
  end

  # [Monday 00:00, the Monday after 00:00) in Santiago: when an event may start and end.
  def window
    zone = ActiveSupport::TimeZone[TIME_ZONE]
    zone.local(STARTS_ON.year, STARTS_ON.month, STARTS_ON.day)...zone.local(ENDS_ON.year, ENDS_ON.month, ENDS_ON.day + 1)
  end

  def within_window?(time)
    time.present? && window.cover?(time)
  end

  # "16 al 22 de noviembre"
  def dates_label
    "#{STARTS_ON.day} al #{ENDS_ON.day} de noviembre"
  end
end
