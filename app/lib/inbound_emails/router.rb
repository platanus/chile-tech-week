module InboundEmails
  # Offers a message to the handlers in order. A handler is anything with `match?(message)` and
  # `call(message)`; add the next kind of mail the site wants to read to HANDLERS.
  class Router
    HANDLERS = [LumaSignin].freeze

    def initialize(handlers: HANDLERS)
      @handlers = handlers
    end

    # The handler's name when one consumed the message, nil when the message was dropped.
    def call(message)
      handler = @handlers.find { |candidate| candidate.match?(message) }
      return unless handler

      handler.call(message)
      handler.name.demodulize.underscore
    end
  end
end
