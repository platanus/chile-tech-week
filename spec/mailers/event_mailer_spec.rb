require "rails_helper"

RSpec.describe EventMailer do
  let(:theme) { create(:theme, name: "Fintech") }
  let(:event) do
    create(:event, edition: 2026, title: "Demo Day", author_name: "Ada", author_email: "ada@example.com",
      starts_at: Time.zone.local(2026, 11, 18, 18, 0), ends_at: Time.zone.local(2026, 11, 18, 20, 0),
      commune: "Providencia", format: "pitch_event_demo_day", themes: [theme], luma_event_url: "https://luma.com/abc")
  end

  it "tells the host their submission arrived, with the summary and the status link" do
    mail = described_class.with(event: event).submitted

    expect(mail.to).to eq(["ada@example.com"])
    expect(mail.subject).to eq("Recibimos tu evento · Chile Tech Week 2026")
    expect(mail["X-Template"].value).to eq("event_submitted")
    expect(JSON.parse(mail["X-Template-Data"].value)).to eq("event_id" => event.id)
    html = mail.html_part.decoded
    expect(html).to include("Recibimos tu evento", "Demo Day", "Pitch / Demo day", "Fintech", "Providencia")
    expect(html).to include("miércoles 18 de noviembre, 18:00")
    expect(html).to include("https://techweek.cl/events/#{event.id}")
    expect(mail.text_part.decoded).to include("Recibimos tu evento", "Ver el estado de tu evento: https://techweek.cl/events/#{event.id}")
  end

  it "sends the approval with the Luma link, the checklist and the publish link" do
    mail = described_class.with(event: event).approved

    expect(mail.subject).to include("Evento aprobado")
    html = mail.html_part.decoded
    expect(html).to include("https://luma.com/abc", "https://luma.com/settings", "https://techweek.cl/events/#{event.id}?publish=true")
    expect(mail["X-Template"].value).to eq("event_approved")
  end

  it "sends the rejection with the reason and the resubmit link" do
    event.update!(rejection_reason: "Falta la dirección")
    mail = described_class.with(event: event).rejected

    expect(mail.subject).to eq("Tu evento necesita cambios · Chile Tech Week 2026")
    expect(mail.html_part.decoded).to include("Falta la dirección", "https://techweek.cl/events/new")
    expect(mail.text_part.decoded).to include("Falta la dirección")
  end

  it "sends the publication with the three places the event lives" do
    mail = described_class.with(event: event).published

    expect(mail.subject).to eq("Evento publicado: Demo Day · Chile Tech Week 2026")
    expect(mail.html_part.decoded).to include("https://luma.com/abc", "https://lu.ma/cltw", "https://techweek.cl/events")
  end

  it "tells an admin about a new submission with the admin link" do
    user = create(:user, email: "mod@techweek.cl")
    mail = described_class.with(event: event, user: user).new_submission

    expect(mail.to).to eq(["mod@techweek.cl"])
    expect(mail.subject).to eq("Nuevo evento enviado: Demo Day")
    expect(mail.html_part.decoded).to include("https://techweek.cl/admin/events/#{event.id}")
  end

  it "reminds the host how long the Luma event has waited" do
    mail = described_class.with(event: event, days_waiting: 3).luma_reminder

    expect(mail.subject).to eq("Recordatorio: edita tu evento en Luma «Demo Day»")
    expect(mail.html_part.decoded).to include("3 días", "https://luma.com/abc")
  end

  it "tells the host the event was taken down after a Luma cancellation" do
    mail = described_class.with(event: event).luma_cancelled

    expect(mail.subject).to eq("Evento dado de baja: Demo Day")
    expect(mail.html_part.decoded).to include("cancelado en Luma", "hola@techweek.cl")
  end

  it "lists what Luma changed, old and new" do
    changes = {title: {old: "Demo Day", new: "Demo Night"}, starts_at: {old: event.starts_at, new: event.starts_at + 1.hour}}
    mail = described_class.with(event: event, changes: changes).luma_updated

    expect(mail.subject).to eq("Evento actualizado: Demo Day")
    html = mail.html_part.decoded
    expect(html).to include("Demo Night", "miércoles 18 de noviembre, 18:00", "miércoles 18 de noviembre, 19:00")
    expect(mail.text_part.decoded).to include("Título: Demo Day → Demo Night")
  end
end
