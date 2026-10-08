require "rails_helper"

RSpec.describe Luma::Internal do
  subject(:internal) { described_class.new(passkey: passkey) }

  let(:passkey) { instance_double(Luma::Passkey, assertion: {id: "cred", response: {signature: "sig"}}) }
  let(:options_url) { "https://api.luma.com/auth/passkey/request-authentication-options" }
  let(:sign_in_url) { "https://api.luma.com/auth/sign-in-with-passkey" }
  let(:guests_url) { "https://api.luma.com/event/admin/get-guests" }

  def stub_sign_in(cookie: "session-1", status: 200)
    stub_request(:post, options_url).to_return(body: {options_json: {rpId: "luma.com", challenge: "abc"}}.to_json)
    stub_request(:post, sign_in_url).to_return(status: status, body: "{}", headers: {"Set-Cookie" => "luma.auth-session-key=#{cookie}; Path=/; HttpOnly; Secure"})
  end

  def guests_query(event: "evt-1", **extra)
    {event_api_id: event, pagination_limit: "100", query: "", sort_column: "registered_or_created_at", sort_direction: "desc"}.merge(extra)
  end

  it "signs in with the passkey, then lists the guests with the session cookie" do
    sign_in = stub_sign_in
    guests = stub_request(:get, guests_url).with(query: guests_query, headers: {"Cookie" => "luma.auth-session-key=session-1"})
      .to_return(body: {entries: [{email: "ada@example.com", approval_status: "approved"}], has_more: false}.to_json)

    expect(internal.guests("evt-1")).to eq([{"email" => "ada@example.com", "approval_status" => "approved"}])
    expect(sign_in).to have_been_requested.once
    expect(guests).to have_been_requested.once
    expect(passkey).to have_received(:assertion).with({"rpId" => "luma.com", "challenge" => "abc"}, counter: be_within(5).of(Time.now.to_i))
  end

  it "keeps the session between calls" do
    sign_in = stub_sign_in
    stub_request(:get, guests_url).with(query: guests_query).to_return(body: {entries: [], has_more: false}.to_json)

    2.times { internal.guests("evt-1") }

    expect(sign_in).to have_been_requested.once
  end

  it "follows the pages of a long guest list" do
    stub_sign_in
    stub_request(:get, guests_url).with(query: guests_query)
      .to_return(body: {entries: [{email: "a@example.com"}], has_more: true, next_cursor: "page-2"}.to_json)
    stub_request(:get, guests_url).with(query: guests_query(pagination_cursor: "page-2"))
      .to_return(body: {entries: [{email: "b@example.com"}], has_more: false}.to_json)

    expect(internal.guests("evt-1").map { |guest| guest["email"] }).to eq(%w[a@example.com b@example.com])
  end

  it "signs in again when Luma stops accepting the session" do
    stub_request(:post, options_url).to_return(body: {options_json: {rpId: "luma.com", challenge: "abc"}}.to_json)
    stub_request(:post, sign_in_url)
      .to_return({body: "{}", headers: {"Set-Cookie" => "luma.auth-session-key=old; Path=/"}}, {body: "{}", headers: {"Set-Cookie" => "luma.auth-session-key=new; Path=/"}})
    stub_request(:get, guests_url).with(query: guests_query, headers: {"Cookie" => "luma.auth-session-key=old"}).to_return(status: 401, body: "{}")
    renewed = stub_request(:get, guests_url).with(query: guests_query, headers: {"Cookie" => "luma.auth-session-key=new"})
      .to_return(body: {entries: [{email: "ada@example.com"}], has_more: false}.to_json)

    expect(internal.guests("evt-1").size).to eq(1)
    expect(renewed).to have_been_requested.once
  end

  it "retries a sign-in Luma refused for repeating the counter of the same second" do
    allow(internal).to receive(:sleep)
    stub_request(:post, options_url).to_return(body: {options_json: {rpId: "luma.com", challenge: "abc"}}.to_json)
    stub_request(:post, sign_in_url).to_return({status: 400, body: "{}"}, {body: "{}", headers: {"Set-Cookie" => "luma.auth-session-key=ok; Path=/"}})
    stub_request(:get, guests_url).with(query: guests_query).to_return(body: {entries: [], has_more: false}.to_json)

    expect(internal.guests("evt-1")).to eq([])
  end

  it "reports a sign-in Luma refuses instead of looping" do
    allow(internal).to receive(:sleep)
    stub_sign_in(status: 400)

    expect { internal.guests("evt-1") }.to raise_error(Luma::Error, /rechazó el inicio de sesión/)
  end

  it "reports a sign-in that brings no session" do
    stub_request(:post, options_url).to_return(body: {options_json: {rpId: "luma.com", challenge: "abc"}}.to_json)
    stub_request(:post, sign_in_url).to_return(body: "{}")

    expect { internal.guests("evt-1") }.to raise_error(Luma::Error, /no devolvió una sesión/)
  end

  it "reports a list it cannot read" do
    stub_sign_in
    stub_request(:get, guests_url).with(query: guests_query).to_return(body: {unexpected: true}.to_json)

    expect { internal.guests("evt-1") }.to raise_error(Luma::Error, /inválida/)
  end

  describe "Luma.internal" do
    it "is the in-memory fake until a passkey is configured" do
      allow(AppConfig).to receive(:instance).and_return(AppConfig.new(luma_passkey: ""))

      expect(Luma.internal).to be(Luma::FakeInternal.instance)
    end

    it "lists the guests the fake was given" do
      fake = Luma::FakeInternal.instance.tap(&:reset!)
      fake.add_guest("evt-1", email: "ada@example.com")

      expect(fake.guests("evt-1")).to match([a_hash_including("email" => "ada@example.com", "approval_status" => "approved")])
    end
  end
end
