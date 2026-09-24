require "rails_helper"

# What crawlers and AI agents fetch by name, all generated from the published events.
RSpec.describe "discovery by crawlers and agents" do
  let(:theme) { create(:theme, name: "Fintech") }
  let!(:published) do
    create(:event, :published, edition: 2026, title: "Demo Day", starts_at: Time.zone.local(2026, 11, 18, 18),
      commune: "Providencia", format: "pitch_event_demo_day", company_name: "Platanus", themes: [theme])
  end
  let!(:archived) { create(:event, :published, edition: 2025, title: "Last year") }
  let!(:pending) { create(:event, edition: 2026, state: "waiting_luma_edit", title: "Not yet") }

  describe "GET /robots.txt" do
    it "welcomes every crawler, names the AI ones, hides the private pages and points at the sitemap" do
      get "/robots.txt"

      expect(response).to have_http_status(:ok)
      expect(response.media_type).to eq("text/plain")
      expect(response.body).to include("User-agent: *\nAllow: /\n")
      %w[OAI-SearchBot ChatGPT-User GPTBot ClaudeBot Claude-SearchBot PerplexityBot].each do |agent|
        expect(response.body).to include("User-agent: #{agent}\n")
      end
      expect(response.body).to include("Disallow: /admin\n", "Disallow: /events/*-*-*-*-*\n")
      expect(response.body).not_to include("Disallow: /events\n", "Disallow: /rails")
      expect(response.body).to include("Sitemap: https://techweek.cl/sitemap.xml")
    end
  end

  describe "GET /sitemap.xml" do
    it "lists the public pages and every published event, with when it last changed" do
      get "/sitemap.xml"

      expect(response).to have_http_status(:ok)
      expect(response.media_type).to eq("application/xml")
      locs = response.body.scan(%r{<loc>(.*?)</loc>})
      expect(locs.flatten).to include("https://techweek.cl/", "https://techweek.cl/events", "https://techweek.cl/events/new",
        "https://techweek.cl/25/events", "https://techweek.cl/demo-day", "https://techweek.cl/last-year")
      expect(response.body).not_to include("not-yet", pending.id)
      expect(response.body).to include("<loc>https://techweek.cl/demo-day</loc><lastmod>#{published.updated_at.utc.iso8601}</lastmod>")
    end
  end

  describe "GET /llms.txt" do
    it "describes the site and lists the week's programme, each event linking its Markdown twin" do
      get "/llms.txt"

      expect(response).to have_http_status(:ok)
      expect(response.body).to start_with("# Chile Tech Week 2026\n\n> La semana descentralizada")
      expect(response.body).to include("\n\nChile Tech Week is a decentralized week of tech events across Chile, each hosted by a different company. Nov 16–22, 2026.\n\n")
      expect(response.body).to include("- **Fechas:** 16 al 22 de noviembre de 2026 (2026-11-16 a 2026-11-22)")
      expect(response.body).to include("**¿Qué es Chile Tech Week?** Chile Tech Week es una semana descentralizada")
      expect(response.body).to include("## Programa\n\n- [Programa completo](https://techweek.cl/events.md): los 1 eventos publicados, por día.\n" \
        "- [Demo Day](https://techweek.cl/demo-day.md): mié 18 nov, 18:00 · Providencia · Pitch / Demo day · Platanus\n")
      expect(response.body).not_to include("Not yet", "Last year")
      expect(response.body).to include("## Optional\n\n- [Todo el contenido en un archivo](https://techweek.cl/llms-full.txt)")
    end

    it "changes when an event is published, and answers 304 until then" do
      get "/llms.txt"
      etag = response.headers["ETag"]

      get "/llms.txt", headers: {"If-None-Match" => etag}
      expect(response).to have_http_status(:not_modified)

      pending.update!(state: "published", published_at: Time.current, luma_event_url: "https://luma.com/new")
      get "/llms.txt", headers: {"If-None-Match" => etag}
      expect(response).to have_http_status(:ok)
      expect(response.body).to include("[Not yet](https://techweek.cl/not-yet.md)")
    end
  end

  describe "GET /llms-full.txt" do
    it "appends the programme and every event's document to llms.txt" do
      get "/llms-full.txt"

      expect(response).to have_http_status(:ok)
      expect(response.body).to include("# Chile Tech Week 2026", "# Programa · Chile Tech Week 2026", "## Miércoles 18 de noviembre")
      expect(response.body).to include("# Demo Day\n\n> An event.\n\n- **Cuándo:** miércoles 18 de noviembre de 2026, 18:00–20:00 (hora de Chile)")
      expect(response.body).to include("- **Temas:** Fintech", "- **Inscripción:** https://luma.com/example")
    end
  end

  describe "user agents" do
    {
      "Safari on iOS 16" => "Mozilla/5.0 (iPhone; CPU iPhone OS 16_7_10 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
      "Instagram's in-app browser" => "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 312.0.0.22.114",
      "OAI-SearchBot" => "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot",
      "GPTBot" => "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot",
      "ChatGPT-User" => "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot",
      "ClaudeBot" => "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
      "Claude-User" => "Mozilla/5.0 (compatible; Claude-User/1.0; +Claude-User@anthropic.com)",
      "PerplexityBot" => "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
      "a bare HTTP client" => "python-requests/2.31"
    }.each do |name, user_agent|
      it "serves #{name}" do
        get "/demo-day", headers: {"User-Agent" => user_agent}
        expect(response).to have_http_status(:ok)
        expect(response.body).to include("application/ld+json")
      end
    end
  end
end
