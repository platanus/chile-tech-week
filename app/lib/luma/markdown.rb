module Luma
  # Luma's web API returns an event's body as the editor's ProseMirror document
  # (`description_mirror`), where the public API returns Markdown (`description_md`). This writes
  # the document out the way Luma does — its Markdown is Turndown's rendering of the event's HTML —
  # so an event reads the same whichever API it came from. spec/fixtures/luma/descriptions.json
  # holds real pairs from both APIs; the spec checks this reproduces Luma's text byte for byte.
  #
  # Luma's editor makes headings, paragraphs, bullet lists, rules and line breaks, with bold,
  # italic and links. Anything else is written as its plain text, so nothing a host wrote is lost.
  module Markdown
    module_function

    def from_mirror(doc)
      return nil if doc.nil?

      block(doc).strip
    end

    def block(node)
      case node["type"]
      when "paragraph" then inline(node["content"])
      when "heading" then "#{"#" * node.dig("attrs", "level").to_i.clamp(1, 6)} #{inline(node["content"])}"
      when "horizontal_rule" then "***"
      when "bullet_list" then Array(node["content"]).map { |item| "*   #{blocks(item["content"]).gsub("\n", "\n    ")}" }.join("\n")
      when "text", "hard_break" then inline([node])
      else blocks(node["content"])
      end
    end

    def blocks(nodes)
      Array(nodes).map { |node| block(node) }.reject(&:empty?).join("\n\n")
    end

    # Turndown collapses whitespace inside each line and trims the block; a line break is "  \n".
    def inline(nodes)
      text = Array(nodes).map { |node| inline_node(node) }.join
      text.split("  \n", -1).map { |line| line.squeeze(" ").strip }.join("  \n").sub(/\A[ \n]+/, "").sub(/[ \n]+\z/, "")
    end

    # The last mark of a text node is the outermost element in Luma's HTML.
    def inline_node(node)
      return "  \n" if node["type"] == "hard_break"
      return inline(node["content"]) unless node["type"] == "text"

      Array(node["marks"]).reduce(escape(node["text"].to_s.gsub(/\s+/, " "))) { |text, mark| wrap(text, mark) }
    end

    # Turndown keeps the spaces at either end of an element outside its delimiters.
    def wrap(text, mark)
      lead = text[/\A */]
      body = text.strip
      trail = body.empty? ? "" : text[/ *\z/]
      return text if body.empty? && mark["type"] != "link"

      wrapped = case mark["type"]
      when "bold" then "**#{body}**"
      when "italic" then "_#{body}_"
      when "link" then "[#{body}](#{mark.dig("attrs", "href")})"
      else body
      end
      lead + wrapped + trail
    end

    # Turndown's escapes for text that would otherwise read as Markdown.
    def escape(text)
      text.gsub("\\") { "\\\\" }.gsub(/[*_`\[\]]/) { "\\#{it}" }
        .gsub(/^-/) { "\\-" }.gsub(/^\+ /) { "\\+ " }.gsub(/^=+/) { "\\#{it}" }.gsub(/^(\#{1,6}) /) { "\\#{$1} " }
        .gsub(/^~~~/) { "\\~~~" }.gsub(/^>/) { "\\>" }.gsub(/^(\d+)\. /) { "#{$1}\\. " }
    end
  end
end
