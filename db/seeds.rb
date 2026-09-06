# Idempotent; safe in every environment. The deploy runs it after db:prepare.

# The catalogue every submission picks from: the 2025 site's themes and audiences.
THEMES = {
  "AI" => "ai", "AR / VR" => "ar-vr", "B2B" => "b2b", "B2C / Consumer" => "b2c-consumer",
  "Climate" => "climate", "Creators" => "creators", "Crypto / Web3" => "crypto-web3",
  "Cybersecurity" => "cybersecurity", "Deep Tech" => "deep-tech", "Defense" => "defense",
  "Engineering" => "engineering", "Fintech" => "fintech", "Fundraising / Investing" => "fundraising-investing",
  "GTM" => "gtm", "Gaming" => "gaming", "HR / Hiring" => "hr-hiring", "Hardware" => "hardware",
  "Healthcare / Healthtech" => "healthcare-healthtech", "Infrastructure" => "infrastructure",
  "International / Expansion" => "international-expansion", "Media / Entertainment" => "media-entertainment",
  "SaaS" => "saas", "Women-focused" => "women-focused"
}.freeze

AUDIENCES = {
  "Creators" => "creators", "Engineers" => "engineers", "Finance" => "finance",
  "Founders ($0-1M Raised)" => "founders-0-1m-raised", "Founders ($1-5M Raised)" => "founders-1-5m-raised",
  "Founders ($5M+ Raised)" => "founders-5m-plus-raised", "HR" => "hr", "Investors" => "investors",
  "Marketing / Comms" => "marketing-comms", "Other" => "other", "Product" => "product",
  "Sales / BD" => "sales-bd", "Students" => "students"
}.freeze

THEMES.each { |name, slug| Theme.find_or_create_by!(slug: slug) { |theme| theme.name = name } }
AUDIENCES.each { |name, slug| Audience.find_or_create_by!(slug: slug) { |audience| audience.name = name } }

# Development only: an admin to sign in with and a 2026 programme to browse and moderate.
if Rails.env.development?
  User.find_or_create_by!(email: "admin@techweek.cl") do |user|
    user.first_name = "Ada"
    user.last_name = "Admin"
    user.password = "techweek2026"
    user.role = "admin"
    user.notifications_enabled_at = Time.current
  end

  if Event.for_edition(Edition::YEAR).none?
    logos = Rails.public_path.join("25/logos").glob("*.{png,jpg,webp}").map { |path| "/25/logos/#{path.basename}" }
    covers = ["/opengraph.png", "/25/opengraph.png"].select { |path| Rails.public_path.join(path.delete_prefix("/")).exist? }
    themes = Theme.all.to_a
    audiences = Audience.all.to_a
    zone = ActiveSupport::TimeZone[Edition::TIME_ZONE]
    samples = [
      ["Fintual Open Office para founders", "Fintual", "breakfast_brunch_lunch", 0, 10, 3, "Providencia", "published"],
      ["Female Founders Summit", "fEN ventures", "panel_fireside_chat", 0, 9, 3.5, "Las Condes", "published"],
      ["SUP Meet & Connect", "Start-Up Chile", "networking", 0, 17, 2, "Santiago", "published"],
      ["Top Community Builders: Conexiones Radicales", "Startups Latam", "roundtable_workshop", 1, 18.5, 3, "Vitacura", "published"],
      ["Corporate Brunch", "LAN Accelerator", "breakfast_brunch_lunch", 1, 9, 2, "Las Condes", "published"],
      ["Founder's Brunch", "Deel", "breakfast_brunch_lunch", 2, 10, 3, "Vitacura", "published"],
      ["Demo Day Platanus", "Platanus", "pitch_event_demo_day", 2, 18, 3, "Providencia", "published"],
      ["Hackathon IA aplicada", "Community OS", "hackathon", 3, 9, 30, "Santiago", "published"],
      ["After Office Fintech", "Buda.com", "happy_hour", 3, 19, 3, "Las Condes", "published"],
      ["Panel: Infraestructura para escalar", "Toku", "panel_fireside_chat", 4, 15, 2, "Providencia", "published"],
      ["Matchmaking inversionistas", "ACVC", "matchmaking", 4, 11, 2, "Vitacura", "waiting_luma_edit"],
      ["Cena founders healthtech", "Examedi", "dinner", 5, 20, 3, "Lo Barnechea", "submitted"],
      ["Experiencia: laboratorio de hardware", "Cornershop", "experiential", 6, 11, 4, "Ñuñoa", "submitted"]
    ]
    samples.each_with_index do |(title, company, format, day, hour, hours, commune, state), i|
      starts_at = zone.local(Edition::STARTS_ON.year, Edition::STARTS_ON.month, Edition::STARTS_ON.day + day, hour.floor, ((hour % 1) * 60).round)
      event = Event.create!(
        edition: Edition::YEAR, title: title, description: "#{title}: una instancia para conocer a la comunidad, compartir aprendizajes y conectar con quienes están construyendo en Chile.",
        company_name: company, company_website: "https://#{company.parameterize}.cl", company_logo_url: logos[i % logos.size] || "/25/opengraph.png",
        author_name: "Contacto #{company}", author_email: "contacto#{i}@example.com", author_phone_number: "+56 9 8765 43#{i.to_s.rjust(2, "0")}",
        starts_at: starts_at, ends_at: starts_at + hours.hours, commune: commune, format: format, capacity: [30, 50, 80, 120, 200][i % 5],
        state: state, submitted_at: 30.days.ago + i.days,
        approved_at: (state == "submitted") ? nil : 20.days.ago + i.days,
        waiting_luma_edit_at: (state == "submitted") ? nil : 20.days.ago + i.days,
        published_at: (state == "published") ? 10.days.ago + i.days : nil,
        luma_event_url: (state == "submitted") ? nil : "https://luma.com/cltw-#{i}",
        luma_event_api_id: (state == "submitted") ? nil : "evt-fake-#{i}",
        # Stands in for the artwork a host uploads to Luma, so the programme has pictures locally.
        luma_cover_url: (state == "submitted") ? nil : (covers[i % covers.size] if covers.any?),
        logo_shown_at: (state == "published") ? Time.current : nil,
        themes: themes.sample(2), audiences: audiences.sample(2)
      )
      next unless i.even?

      event.cohosts.create!(company_name: "Co-host #{i}", company_logo_url: logos[(i + 7) % logos.size], primary_contact_name: "Persona #{i}",
        primary_contact_email: "cohost#{i}@example.com", logo_shown_at: (state == "published") ? Time.current : nil)
    end
  end
end
