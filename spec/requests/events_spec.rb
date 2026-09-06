require "rails_helper"

RSpec.describe "the current edition's events" do
  let(:logo) { fixture_file_upload("logo.png", "image/png") }
  let(:theme) { create(:theme, name: "Fintech") }
  let(:audience) { create(:audience, name: "Investors") }

  describe "GET /events" do
    it "lists the published 2026 programme in order, with the week's days and their counts" do
      create(:event, :published, edition: 2026, title: "Later", starts_at: Time.zone.local(2026, 11, 19, 10))
      earlier = create(:event, :published, edition: 2026, title: "Earlier", starts_at: Time.zone.local(2026, 11, 17, 10), themes: [theme])
      earlier.update!(luma_cover_url: "https://images.lumacdn.com/earlier.png")
      create(:cohost, event: earlier, company_name: "BCI", primary_contact_email: "secret@bci.cl")
      create(:event, edition: 2026, state: "waiting_luma_edit", title: "Not yet")
      create(:event, :published, edition: 2025, title: "Last year")

      get "/events"

      expect(response).to have_http_status(:ok)
      expect(inertia).to render_component("Events/Index")
      expect(inertia).to have_props(title: "Eventos · Chile Tech Week 2026")
      events = inertia.props.fetch(:events).map(&:deep_symbolize_keys)
      expect(events.map { |event| event[:title] }).to eq(["Earlier", "Later"])
      expect(events.first).to include(id: earlier.id, commune: "Providencia", themes: [{id: theme.id, name: "Fintech", slug: "fintech"}],
        coverImageUrl: "https://images.lumacdn.com/earlier.png")
      expect(events.first[:cohosts]).to eq([{id: earlier.cohosts.first.id, companyName: "BCI", companyLogoUrl: "https://example.com/cohost.png"}])
      expect(events.first.keys).not_to include(:authorEmail, :authorPhoneNumber)
      expect(events.last[:title]).to eq("Later")

      days = inertia.props.fetch(:days).map(&:deep_symbolize_keys)
      expect(days.map { |day| day[:label] }).to eq(["Lun 16", "Mar 17", "Mié 18", "Jue 19", "Vie 20", "Sáb 21", "Dom 22"])
      expect(days.map { |day| day[:count] }).to eq([0, 1, 0, 1, 0, 0, 0])
      expect(days.first[:date]).to eq("2026-11-16")
    end
  end

  describe "GET /events/new" do
    it "renders the form with the catalogue, the communes, the formats and the week" do
      theme
      audience

      get "/events/new"

      expect(response).to have_http_status(:ok)
      expect(inertia).to render_component("Events/New")
      expect(inertia).to have_props(
        week: {from: "2026-11-16", to: "2026-11-22"},
        formats: Event::FORMATS,
        descriptionLimit: 300,
        themes: [{id: theme.id, name: "Fintech", slug: "fintech"}],
        audiences: [{id: audience.id, name: "Investors", slug: "investors"}]
      )
      expect(inertia.props.fetch(:communes)).to include("Providencia", "Las Condes")
    end
  end

  describe "POST /events" do
    let(:valid_params) do
      {
        event: {
          company_name: "Platanus", company_website: "https://platan.us", author_name: "ada lovelace",
          author_email: "Ada@Platan.us", author_phone_number: "+56 9 8765 4321",
          title: "Demo Day", description: "Doce startups presentan.",
          starts_at: "2026-11-18T18:00", ends_at: "2026-11-18T20:00", commune: "Providencia",
          format: "pitch_event_demo_day", capacity: "80", logo_upload: logo,
          theme_ids: [theme.id], audience_ids: [audience.id],
          cohosts_attributes: {
            "0" => {company_name: "BCI", primary_contact_name: "Grace Hopper", primary_contact_email: "grace@bci.cl",
                    primary_contact_website: "https://bci.cl", logo_upload: fixture_file_upload("logo.png", "image/png")}
          }
        }
      }
    end

    it "saves the submission with its logo, co-host, themes and audiences and lands on the status page" do
      allow(EventNotifications).to receive(:submitted)

      expect { post "/events", params: valid_params }.to change(Event, :count).by(1)

      event = Event.last
      expect(event).to have_attributes(edition: 2026, state: "submitted", author_email: "ada@platan.us", author_name: "ada lovelace",
        title: "Demo Day", commune: "Providencia", format: "pitch_event_demo_day", capacity: 80)
      expect(event.starts_at).to eq(Time.zone.local(2026, 11, 18, 18, 0))
      expect(event.ends_at).to eq(Time.zone.local(2026, 11, 18, 20, 0))
      expect(event.logo).to be_attached
      expect(event.company_logo_url).to match(%r{\A/rails/active_storage/blobs/redirect/})
      expect(event.themes).to eq([theme])
      expect(event.audiences).to eq([audience])
      expect(event.cohosts.map(&:company_name)).to eq(["BCI"])
      expect(event.cohosts.first.logo).to be_attached
      expect(event.cohosts.first.company_logo_url).to match(%r{\A/rails/active_storage/blobs/redirect/})
      expect(EventNotifications).to have_received(:submitted).with(event)

      expect(response).to redirect_to("/events/#{event.id}")
      follow_redirect!
      expect(inertia).to render_component("Events/Show")
      expect(inertia).to have_flash(notice: "¡Evento enviado! Lo revisaremos pronto.")
      expect(inertia.props.fetch(:event)).to include("step" => 1, "state" => "submitted", "title" => "Demo Day")
    end

    it "sends the form back with Spanish errors, nested ones by co-host index, and keeps nothing" do
      bad = valid_params.deep_merge(event: {
        title: "", company_website: "platan.us", author_phone_number: "12", starts_at: "2026-11-25T18:00", ends_at: "2026-11-25T20:00",
        logo_upload: nil, theme_ids: [], description: "x" * 301,
        cohosts_attributes: {"0" => {primary_contact_email: "nope", primary_contact_website: "bci.cl"}}
      })

      expect { post "/events", params: bad }.not_to change(Event, :count)
      expect(Cohost.count).to eq(0)
      expect(ActiveStorage::Blob.count).to eq(0)

      expect(response).to redirect_to("/events/new")
      follow_redirect!
      errors = inertia.props.fetch(:errors)
      expect(errors).to include(
        "title" => ["El título no puede estar en blanco"],
        "company_website" => ["El sitio web debe ser una URL que empiece con https://"],
        "logo" => ["El logo no puede estar en blanco"],
        "themes" => ["Los temas no puede estar en blanco"],
        "cohosts[0].primary_contact_email" => include(a_string_matching(/email/i))
      )
      expect(errors["starts_at"].first).to include("dentro de la semana")
      expect(errors["description"].first).to include("300")
      expect(errors["author_phone_number"]).to be_present
      expect(errors["cohosts[0].primary_contact_website"].first).to include("https://")
    end
  end

  describe "GET /events/:id" do
    it "shows the host where the event is, without the contact details" do
      event = create(:event, edition: 2026, state: "waiting_luma_edit", approved_at: Time.current,
        luma_event_url: "https://luma.com/abc", themes: [theme], audiences: [audience])

      get "/events/#{event.id}?publish=true"

      expect(response).to have_http_status(:ok)
      expect(inertia).to render_component("Events/Show")
      expect(inertia).to have_props(openPublish: true)
      event_props = inertia.props.fetch(:event)
      expect(event_props).to include("step" => 3, "state" => "waiting_luma_edit", "lumaEventUrl" => "https://luma.com/abc")
      expect(event_props.keys).not_to include("authorEmail", "authorPhoneNumber")
    end

    it "does not open the publish dialog for an event that is not at step 3" do
      event = create(:event, edition: 2026)

      get "/events/#{event.id}?publish=true"

      expect(inertia).to have_props(openPublish: false)
    end

    it "is not found for an unknown id" do
      get "/events/#{SecureRandom.uuid}"

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /events/:id/publish" do
    let(:event) { create(:event, edition: 2026, state: "waiting_luma_edit", luma_event_api_id: "evt-1") }

    it "publishes through Events::Publish and confirms" do
      allow(Events::Publish).to receive(:new).with(event).and_return(instance_double(Events::Publish, call: Events::Publish::Result.new(ok: true, error: nil)))

      post "/events/#{event.id}/publish"

      expect(response).to redirect_to("/events/#{event.id}")
      follow_redirect!
      expect(inertia).to have_flash(notice: "¡Tu evento está publicado!")
    end

    it "reports why it could not publish" do
      allow(Events::Publish).to receive(:new).with(event).and_return(instance_double(Events::Publish, call: Events::Publish::Result.new(ok: false, error: "No se pudo publicar el evento en Luma: 500")))

      post "/events/#{event.id}/publish"

      follow_redirect!
      expect(inertia).to have_flash(alert: "No se pudo publicar el evento en Luma: 500")
    end
  end
end
