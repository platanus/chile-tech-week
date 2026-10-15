require "rails_helper"

RSpec.describe Luma::Markdown do
  def text(value, *marks) = {"type" => "text", "text" => value, "marks" => marks.presence}.compact

  def doc(*content) = {"type" => "doc", "content" => content}

  def paragraph(*content) = {"type" => "paragraph", "content" => content}

  let(:bold) { {"type" => "bold"} }

  # Both APIs' answers for the same events (contact details replaced).
  JSON.parse(Rails.root.join("spec/fixtures/luma/descriptions.json").read).each do |pair|
    it "writes #{pair["title"].inspect} exactly as Luma's description_md" do
      expect(described_class.from_mirror(pair["description_mirror"])).to eq(pair["description_md"].strip)
    end
  end

  it "keeps the spaces at an element's ends outside its delimiters" do
    expect(described_class.from_mirror(doc(paragraph(text("by ", bold), text("Impacta", bold))))).to eq("**by** **Impacta**")
  end

  it "escapes what would otherwise read as Markdown" do
    expect(described_class.from_mirror(doc(paragraph(text("----")), paragraph(text("1. *uno* [dos]"))))).to eq("\\----\n\n1\\. \\*uno\\* \\[dos\\]")
  end

  it "writes an unknown node as its text" do
    quote = {"type" => "blockquote", "content" => [paragraph(text("Cita", bold))]}

    expect(described_class.from_mirror(doc(quote, paragraph(text("Fin"))))).to eq("**Cita**\n\nFin")
  end

  it "answers nil without a document and an empty string for an empty one" do
    expect(described_class.from_mirror(nil)).to be_nil
    expect(described_class.from_mirror(doc(paragraph))).to eq("")
  end
end
