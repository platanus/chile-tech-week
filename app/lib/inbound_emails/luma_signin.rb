module InboundEmails
  # The six-digit code Luma mails to sign in (luma.com/signin has no password). The code is only
  # kept for a few minutes, in the cache, for the Luma::Session that asked for it to pick up.
  module LumaSignin
    SENDER_DOMAINS = %w[luma.com lu.ma lumacdn.com].freeze
    CODE = /(?<!\d)\d{6}(?!\d)/
    KEY = "luma:signin_code".freeze
    TTL = 10.minutes

    module_function

    def match?(message)
      SENDER_DOMAINS.include?(message.sender_domain) && message.text.match?(CODE)
    end

    def call(message, cache: Rails.cache)
      cache.write(KEY, message.text[CODE], expires_in: TTL)
    end

    # What Luma::Session reads (and clears, so a code is used once).
    def take(cache: Rails.cache)
      cache.read(KEY).tap { cache.delete(KEY) }
    end
  end
end
