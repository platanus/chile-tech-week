require "rails_helper"

RSpec.describe Event, "on submission" do
  let(:theme) { create(:theme) }
  let(:audience) { create(:audience) }

  def submission(**overrides)
    described_class.new(
      {edition: 2026, title: "Demo Day", description: "Una demo.", author_name: "ada lovelace", author_email: "Ada@Example.com ",
       author_phone_number: "+56 9 8765 4321", company_name: "Fintual", company_website: "https://fintual.com", company_logo_url: "/logo.png",
       starts_at: Time.zone.local(2026, 11, 18, 18), ends_at: Time.zone.local(2026, 11, 18, 20), commune: "Providencia", format: "networking",
       capacity: 50, themes: [theme], audiences: [audience]}.merge(overrides)
    )
  end

  it "accepts a complete submission and normalises the contact fields" do
    event = submission
    expect(event.valid?(:submission)).to be(true), event.errors.full_messages.join(", ")
    expect(event.author_email).to eq("ada@example.com")
    expect(event.author_name).to eq("ada lovelace")
  end

  it "keeps the event inside the week, in Santiago time" do
    expect(submission(starts_at: Time.zone.local(2026, 11, 15, 23), ends_at: Time.zone.local(2026, 11, 16, 1)).valid?(:submission)).to be(false)
    expect(submission(starts_at: Time.zone.local(2026, 11, 22, 22), ends_at: Time.zone.local(2026, 11, 22, 23, 59)).valid?(:submission)).to be(true)
    late = submission(starts_at: Time.zone.local(2026, 11, 22, 23), ends_at: Time.zone.local(2026, 11, 23, 1))
    expect(late.valid?(:submission)).to be(false)
    expect(late.errors.full_messages).to include("El término debe estar dentro de la semana (16 al 22 de noviembre)")
  end

  it "wants an https website, a phone with a country code, a known commune, a short description, a logo, themes and audiences" do
    event = submission(company_website: "fintual.com", author_phone_number: "98765432", commune: "Narnia", description: "x" * 301,
      company_logo_url: "", themes: [], audiences: [], capacity: 600_000)
    expect(event.valid?(:submission)).to be(false)
    expect(event.errors.full_messages).to include(
      "El sitio web debe ser una URL que empiece con https://",
      "El teléfono de contacto no es válido",
      "La comuna no está incluido en la lista",
      "La descripción es demasiado largo (300 caracteres máximo)",
      "El logo no puede estar en blanco",
      "Los temas no puede estar en blanco",
      "Las audiencias no puede estar en blanco",
      "La capacidad debe ser menor que o igual a 500000"
    )
  end

  it "validates the co-hosts with their index so the form can place the errors" do
    event = submission(cohosts_attributes: [{company_name: "", primary_contact_name: "Bea", primary_contact_email: "nope", primary_contact_website: "bci.cl"}])
    expect(event.valid?(:submission)).to be(false)
    expect(event.errors.to_hash.keys).to include(:"cohosts[0].company_name", :"cohosts[0].primary_contact_email", :"cohosts[0].primary_contact_website")
  end

  it "stores an uploaded logo and keeps its permanent URL" do
    event = submission(company_logo_url: nil)
    event.logo_upload = fixture_file_upload("logo.png", "image/png")
    expect(event.valid?(:submission)).to be(true), event.errors.full_messages.join(", ")
    expect(event.company_logo_url).to match(%r{\A/rails/active_storage/blobs/redirect/})
    event.save!
    expect(event.logo).to be_attached
  end

  it "reports the host's step" do
    expect(submission(state: "submitted").step).to eq(1)
    expect(submission(state: "submitted", approved_at: Time.current).step).to eq(2)
    expect(submission(state: "waiting_luma_edit").step).to eq(3)
    expect(submission(state: "published").step).to eq(4)
    expect(submission(state: "rejected").step).to eq(1)
  end
end
