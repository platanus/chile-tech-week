# Every error Rails reports (and every Rails.error.report) goes to Slack in production; see
# ErrorNotifier. It is autoloaded, so it can only be built once the app has booted.
Rails.application.config.after_initialize do
  Rails.error.subscribe(ErrorNotifier.new)
end
