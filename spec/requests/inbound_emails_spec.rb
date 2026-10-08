require "rails_helper"

RSpec.describe "POST /internal/inbound_emails" do
  let(:payload) { {from: "hello@luma.com", to: "events@techweek.cl", subject: "Sign in", text: "Code 482913", message_id: "<1@x>"} }
  let(:headers) { {"Authorization" => "Bearer secret-key"} }

  def configure(key)
    allow(AppConfig).to receive(:instance).and_return(AppConfig.new(inbound_email_key: key))
  end

  it "is closed while no key is configured" do
    configure("")

    post "/internal/inbound_emails", params: payload, headers: headers, as: :json

    expect(response).to have_http_status(:service_unavailable)
  end

  it "refuses a wrong or missing key" do
    configure("secret-key")

    post "/internal/inbound_emails", params: payload, as: :json
    expect(response).to have_http_status(:unauthorized)

    post "/internal/inbound_emails", params: payload, headers: {"Authorization" => "Bearer nope"}, as: :json
    expect(response).to have_http_status(:unauthorized)
  end

  it "answers which handler consumed the mail" do
    configure("secret-key")
    allow(InboundEmails::LumaSignin).to receive(:call)

    post "/internal/inbound_emails", params: payload, headers: headers, as: :json

    expect(response).to have_http_status(:accepted)
    expect(response.parsed_body).to eq("handled" => "luma_signin")
    expect(InboundEmails::LumaSignin).to have_received(:call)
  end

  it "answers null for mail nobody wants, so the worker forwards it" do
    configure("secret-key")

    post "/internal/inbound_emails", params: payload.merge(from: "news@example.com"), headers: headers, as: :json

    expect(response).to have_http_status(:accepted)
    expect(response.parsed_body).to eq("handled" => nil)
  end
end
