require "rails_helper"

RSpec.describe InboundEmails do
  let(:cache) { ActiveSupport::Cache::MemoryStore.new }

  def message(from: "hello@luma.com", text: "Your code is 482913. It expires soon.")
    InboundEmails::Message.new(from: from, to: "events@techweek.cl", subject: "Sign in", text: text, message_id: "<1@x>")
  end

  describe InboundEmails::LumaSignin do
    it "recognises Luma's mail with a six-digit code" do
      expect(described_class.match?(message)).to be true
    end

    it "ignores other senders and mail with no code" do
      expect(described_class.match?(message(from: "someone@example.com"))).to be false
      expect(described_class.match?(message(from: "hello@luma.com.evil.test"))).to be false
      expect(described_class.match?(message(text: "No code here, only 12345 and 1234567."))).to be false
    end

    it "keeps the code for whoever asked, once" do
      described_class.call(message, cache: cache)

      expect(described_class.take(cache: cache)).to eq("482913")
      expect(described_class.take(cache: cache)).to be_nil
    end
  end

  describe InboundEmails::Router do
    it "names the handler that consumed the message" do
      handler = Class.new do
        def self.name = "InboundEmails::Fake"

        def self.match?(message) = message.from == "a@b.cl"

        def self.call(message) = nil
      end

      router = described_class.new(handlers: [handler])

      expect(router.call(message(from: "a@b.cl"))).to eq("fake")
      expect(router.call(message(from: "other@b.cl"))).to be_nil
    end
  end
end
