require "rails_helper"

RSpec.describe EventMarkdown do
  it "renders headings, emphasis, links, images and lists" do
    html = described_class.render("## Agenda\n\n**Demo** y *charlas*.\n\n- Uno\n- Dos\n\n[Programa](https://example.com)\n\n![Foto](https://example.com/photo.jpg)")
    expect(html).to include("<h2>Agenda</h2>", "<strong>Demo</strong>", "<em>charlas</em>", "<li>Uno</li>",
      'href="https://example.com"', 'src="https://example.com/photo.jpg"')
  end

  it "removes executable markup and unsafe URLs from host-controlled bodies" do
    html = described_class.render(%(<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[click](javascript:alert%281%29)\n\n![image](data:text/html;base64,PHNjcmlwdD4=)))
    expect(html).not_to match(/<script|onerror|javascript:|data:text/i)
  end
end
