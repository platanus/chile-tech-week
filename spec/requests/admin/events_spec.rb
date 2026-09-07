require "rails_helper"

RSpec.describe "admin events" do
  let(:admin) { create(:user) }

  before { sign_in admin }

  describe "GET /admin/:week/events" do
    it "lists all the week's events newest first, including the published archive" do
      older = create(:event, title: "Older", created_at: 2.days.ago)
      newer = create(:event, title: "Newer", created_at: 1.day.ago)
      published = create(:event, :published, title: "Published")
      create(:event, :published, title: "Next year", edition: 2026)

      get "/admin/25/events"

      expect(response).to have_http_status(:ok)
      expect(inertia).to render_component("Admin/Events/Index")
      expect(inertia).to have_props(status: "all", search: "")
      expect(inertia).to have_props { |props|
        expect(props[:events].map { |event| event["id"] }).to eq([published.id, newer.id, older.id])
        expect(props[:events].first).to include("edition" => 2025, "state" => "published")
        expect(props[:pagination]).to include("count" => 3, "page" => 1, "last" => 1)
      }
    end

    it "can filter down to submissions and return to all states" do
      submitted = create(:event, title: "Community submitted")
      published = create(:event, :published, title: "Community published")
      create(:event, :published, title: "Unrelated")

      get "/admin/25/events", params: {status: "submitted"}
      expect(inertia).to have_props(status: "submitted")
      expect(inertia).to have_props { |props| props[:events].map { |event| event["id"] } == [submitted.id] }

      get "/admin/25/events", params: {status: "all", search: "Community"}
      expect(inertia).to have_props(status: "all")
      expect(inertia).to have_props { |props|
        expect(props[:events].map { |event| event["id"] }).to contain_exactly(submitted.id, published.id)
      }
    end

    it "filters by state and searches title, company and host" do
      create(:event, :published, title: "Fintech night", company_name: "Buda")
      create(:event, :published, title: "AI breakfast", company_name: "Platanus", author_name: "Ada")
      create(:event, title: "Fintech submitted")

      get "/admin/25/events", params: {status: "published", search: "fintech"}
      expect(inertia.props.fetch(:events).map { |e| e["title"] }).to eq(["Fintech night"])

      get "/admin/25/events", params: {status: "published", search: "ada"}
      expect(inertia.props.fetch(:events).map { |e| e["title"] }).to eq(["AI breakfast"])

      get "/admin/25/events", params: {status: "bogus"}
      expect(inertia).to have_props(status: "all")
    end

    it "pages twenty-five at a time" do
      27.times { |i| create(:event, title: "Event #{i}", created_at: i.hours.ago) }

      get "/admin/25/events"
      expect(inertia).to have_props { |props|
        expect(props[:events].size).to eq(25)
        expect(props[:pagination]).to include("count" => 27, "page" => 1, "last" => 2)
      }

      get "/admin/25/events", params: {page: 2}
      expect(inertia).to have_props { |props|
        expect(props[:events].map { |event| event["title"] }).to eq(["Event 25", "Event 26"])
        expect(props[:pagination]).to include("count" => 27, "page" => 2, "last" => 2, "previous" => 1, "next" => nil)
      }
    end
  end

  describe "GET /admin/:week/events/:id" do
    it "shows the whole row, the co-hosts' contacts and the communes to pick from" do
      theme = create(:theme, name: "Fintech")
      event = create(:event, :published, themes: [theme], author_email: "host@acme.cl", rejection_reason: nil, custom_url: "https://acme.cl/e",
        luma_cover_url: "https://images.lumacdn.com/cover.png")
      cohost = create(:cohost, event: event, primary_contact_email: "co@host.cl")

      get "/admin/25/events/#{event.id}"

      expect(response).to have_http_status(:ok)
      expect(inertia).to render_component("Admin/Events/Show")
      expect(inertia.props[:event].deep_symbolize_keys).to include(
        id: event.id, authorEmail: "host@acme.cl", customUrl: "https://acme.cl/e", state: "published",
        lumaEventUrl: "https://luma.com/example", publishedAt: event.published_at.iso8601(3),
        lumaCoverUrl: "https://images.lumacdn.com/cover.png", coverImageUrl: "https://images.lumacdn.com/cover.png",
        coverMirrored: false
      )
      expect(inertia.props[:event]["themes"].map { |t| t["name"] }).to eq(["Fintech"])
      expect(inertia.props[:event]["cohosts"].first).to include("id" => cohost.id, "primaryContactEmail" => "co@host.cl")
      expect(inertia.props[:communes]).to include("Providencia", "Vitacura")
    end
  end

  describe "PATCH /admin/:week/events/:id" do
    let(:event) { create(:event, :published) }

    it "changes the commune" do
      patch "/admin/25/events/#{event.id}", params: {event: {commune: "Vitacura"}}

      expect(response).to redirect_to("/admin/25/events/#{event.id}")
      follow_redirect!
      expect(inertia).to have_flash(notice: "Evento actualizado.")
      expect(event.reload.commune).to eq("Vitacura")
    end

    it "sets and clears the custom url" do
      patch "/admin/25/events/#{event.id}", params: {event: {custom_url: "https://acme.cl/evento"}}
      expect(event.reload.custom_url).to eq("https://acme.cl/evento")

      patch "/admin/25/events/#{event.id}", params: {event: {custom_url: ""}}
      expect(event.reload.custom_url).to be_nil
    end

    it "toggles the logo's visibility on the landing" do
      patch "/admin/25/events/#{event.id}", params: {event: {logo_shown: "true"}}
      expect(event.reload.logo_shown_at).to be_present

      patch "/admin/25/events/#{event.id}", params: {event: {logo_shown: "false"}}
      expect(event.reload.logo_shown_at).to be_nil
    end

    it "replaces the logo with an upload" do
      file = Rack::Test::UploadedFile.new(StringIO.new("\x89PNG\r\n\x1a\n" + ("x" * 64)), "image/png", original_filename: "logo.png")

      patch "/admin/25/events/#{event.id}", params: {event: {logo_upload: file}}

      follow_redirect!
      expect(event.reload.logo).to be_attached
      expect(event.company_logo_url).to match(%r{\A/rails/active_storage/blobs/redirect/})
    end

    it "reports a rejected change" do
      patch "/admin/25/events/#{event.id}", params: {event: {commune: ""}}

      follow_redirect!
      expect(inertia).to have_flash(alert: "La comuna no puede estar en blanco")
      expect(event.reload.commune).to eq("Providencia")
    end
  end

  describe "POST /admin/:week/events/:id/approval" do
    it "approves through Events::Approve and reports" do
      event = create(:event)
      allow(Events::Approve).to receive(:new).with(event).and_return(instance_double(Events::Approve, call: Events::Approve::Result.new(ok: true, error: nil)))

      post "/admin/25/events/#{event.id}/approval"

      expect(response).to redirect_to("/admin/25/events/#{event.id}")
      follow_redirect!
      expect(inertia).to have_flash(notice: "Evento aprobado, evento en Luma creado y correo enviado.")
    end

    it "shows the service's error" do
      event = create(:event)
      allow(Events::Approve).to receive(:new).and_return(instance_double(Events::Approve, call: Events::Approve::Result.new(ok: false, error: "Luma no responde")))

      post "/admin/25/events/#{event.id}/approval"

      follow_redirect!
      expect(inertia).to have_flash(alert: "Luma no responde")
    end

    it "only approves submitted events" do
      event = create(:event, :published)
      expect(Events::Approve).not_to receive(:new)

      post "/admin/25/events/#{event.id}/approval"

      follow_redirect!
      expect(inertia).to have_flash(alert: "Solo se puede aprobar un evento enviado.")
    end
  end

  describe "POST /admin/:week/events/:id/rejection" do
    it "rejects with a reason through Events::Reject" do
      event = create(:event)
      service = instance_double(Events::Reject, call: true)
      allow(Events::Reject).to receive(:new).with(event, reason: "No calza").and_return(service)

      post "/admin/25/events/#{event.id}/rejection", params: {reason: " No calza "}

      expect(service).to have_received(:call)
      follow_redirect!
      expect(inertia).to have_flash(notice: "Evento rechazado y correo enviado.")
    end

    it "needs a reason" do
      event = create(:event)
      expect(Events::Reject).not_to receive(:new)

      post "/admin/25/events/#{event.id}/rejection", params: {reason: ""}

      follow_redirect!
      expect(inertia).to have_flash(alert: "Escribe el motivo del rechazo.")
    end
  end

  describe "co-hosts" do
    let(:event) { create(:event) }

    it "adds one" do
      post "/admin/25/events/#{event.id}/cohosts", params: {cohost: {company_name: "BCI", primary_contact_name: "Bea", primary_contact_email: "bea@bci.cl"}}

      expect(response).to redirect_to("/admin/25/events/#{event.id}")
      follow_redirect!
      expect(inertia).to have_flash(notice: "Co-host agregado.")
      expect(event.cohosts.pluck(:company_name)).to eq(["BCI"])
    end

    it "reports a missing field" do
      post "/admin/25/events/#{event.id}/cohosts", params: {cohost: {company_name: "BCI"}}

      follow_redirect!
      expect(inertia.props[:flash]["alert"]).to include("El nombre de contacto no puede estar en blanco")
      expect(event.cohosts).to be_empty
    end

    it "toggles a co-host's logo visibility" do
      cohost = create(:cohost, event: event)

      patch "/admin/25/events/#{event.id}/cohosts/#{cohost.id}", params: {cohost: {logo_shown: "true"}}

      expect(cohost.reload.logo_shown_at).to be_present
    end

    it "removes one" do
      cohost = create(:cohost, event: event)

      delete "/admin/25/events/#{event.id}/cohosts/#{cohost.id}"

      follow_redirect!
      expect(inertia).to have_flash(notice: "Co-host eliminado.")
      expect(Cohost.exists?(cohost.id)).to be(false)
    end
  end
end
