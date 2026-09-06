# What goes out when an event changes hands: the host's emails (EventMailer), the admins'
# heads-up and the Slack post. Every call is fire-and-forget through Active Job.
module EventNotifications
  module_function

  def submitted(event)
    EventMailer.with(event: event).submitted.deliver_later
    User.notified.find_each { |user| EventMailer.with(event: event, user: user).new_submission.deliver_later }
    SlackNotifier.new_submission(event)
  end

  def approved(event)
    EventMailer.with(event: event).approved.deliver_later
  end

  def rejected(event)
    EventMailer.with(event: event).rejected.deliver_later
  end

  def published(event)
    EventMailer.with(event: event).published.deliver_later
  end
end
