# The team hears about errors in Slack, the way Sentry would tell them, without Sentry. It is a
# Rails.error subscriber (config/initializers/error_notifier.rb), so it gets what Rails reports on
# its own — an exception a request did not rescue (not the 404-style ones), a job that failed — and
# whatever the code reports with Rails.error.report. The same error (class, message with its ids
# blanked, first line of app code) is posted once an hour, so a job failing every 10 minutes is one
# message. Production only; it never raises into what it reports on.
class ErrorNotifier
  WINDOW = 1.hour
  BACKTRACE_LINES = 5

  def initialize(enabled: Rails.env.production?, cache: Rails.cache)
    @enabled = enabled
    @cache = cache
  end

  def report(error, handled:, severity:, context:, source: nil)
    return unless @enabled && AppConfig.instance.slack?
    return unless @cache.write("error-notifier:#{fingerprint(error)}", true, expires_in: WINDOW, unless_exist: true)

    SlackNotifier.post(message(error, handled:, severity:, context:, source:))
  rescue => e
    Rails.logger.warn("ErrorNotifier could not report #{error.class}: #{e.class}: #{e.message}")
  end

  private

  def fingerprint(error)
    message = error.message.to_s.gsub(/\h{8}-\h{4}-\h{4}-\h{4}-\h{12}|\b(?:evt|calev|usr)-\w+|\d+/, "#")
    Digest::SHA256.hexdigest([error.class.name, message, backtrace(error).first].join("\n"))
  end

  def backtrace(error)
    Rails.backtrace_cleaner.clean(Array(error.backtrace)).first(BACKTRACE_LINES)
  end

  def message(error, handled:, severity:, context:, source:)
    details = context.filter_map { |key, value| "• #{key}: #{describe(value)}" unless value.nil? }
    lines = backtrace(error)
    <<~TEXT.strip
      🚨 *#{error.class}*#{" (handled)" if handled} — #{severity} · #{source || "app"}
      #{error.message.to_s.truncate(1500)}
      #{details.join("\n")}
      #{"```#{lines.join("\n")}```" if lines.any?}
      _Un mismo error se publica una vez por hora._
    TEXT
  end

  def describe(value)
    case value
    when ActiveJob::Base then "#{value.class.name} #{value.job_id}"
    when ActionDispatch::Request then "#{value.request_method} #{value.filtered_path}"
    else value.to_s.truncate(200)
    end
  end
end
