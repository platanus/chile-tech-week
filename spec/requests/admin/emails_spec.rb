require "rails_helper"

RSpec.describe "admin emails" do
  before { sign_in create(:user) }

  describe "GET /admin/emails" do
    it "lists the messages newest first with the totals" do
      create(:outbound_email, subject: "Older", created_at: 2.days.ago)
      create(:outbound_email, subject: "Newer", created_at: 1.day.ago, status: "failed", failure_reason: "boom")

      get "/admin/emails"

      expect(response).to have_http_status(:ok)
      expect(inertia).to render_component("Admin/OutboundEmails/Index")
      expect(inertia.props.fetch(:emails).map { |e| e["subject"] }).to eq(["Newer", "Older"])
      expect(inertia.props[:stats].deep_symbolize_keys).to eq(total: 2, sent: 1, failed: 1, successRate: 50)
      expect(inertia.props[:pagination].deep_symbolize_keys).to include(count: 2, page: 1)
    end

    it "searches recipient, subject and template" do
      create(:outbound_email, to: "ada@acme.cl", subject: "Hola", template_name: "event_submitted")
      create(:outbound_email, to: "bob@acme.cl", subject: "Chao", template_name: "event_rejected")

      get "/admin/emails", params: {search: "ada"}
      expect(inertia.props.fetch(:emails).map { |e| e["to"] }).to eq(["ada@acme.cl"])

      get "/admin/emails", params: {search: "rejected"}
      expect(inertia.props.fetch(:emails).map { |e| e["to"] }).to eq(["bob@acme.cl"])
    end
  end

  describe "GET /admin/emails/:id" do
    it "shows the envelope and the stored html" do
      email = create(:outbound_email, cc: ["cc@acme.cl"], html_content: "<p>Hola Ada</p>")

      get "/admin/emails/#{email.id}"

      expect(inertia).to render_component("Admin/OutboundEmails/Show")
      expect(inertia.props[:email].deep_symbolize_keys).to include(id: email.id, to: "host@example.com", cc: ["cc@acme.cl"], status: "sent")
      expect(inertia).to have_props(htmlContent: "<p>Hola Ada</p>")
    end
  end

  describe "POST /admin/emails/:id/resend" do
    it "resends the stored message" do
      email = create(:outbound_email)
      allow(OutboundEmail::Delivery).to receive(:send_stored).with(email).and_return(email)

      post "/admin/emails/#{email.id}/resend"

      expect(OutboundEmail::Delivery).to have_received(:send_stored)
      expect(response).to redirect_to("/admin/emails/#{email.id}")
      follow_redirect!
      expect(inertia).to have_flash(notice: "Correo reenviado.")
    end

    it "reports a failure" do
      email = create(:outbound_email)
      allow(OutboundEmail::Delivery).to receive(:send_stored).and_raise(StandardError, "Resend down")

      post "/admin/emails/#{email.id}/resend"

      follow_redirect!
      expect(inertia).to have_flash(alert: "No se pudo reenviar: Resend down")
    end
  end
end
