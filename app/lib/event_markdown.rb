# Luma descriptions are host-authored Markdown. Only sanitized presentation HTML
# crosses into the page; scripts, embedded HTML and unsafe URL protocols do not.
class EventMarkdown
  TAGS = %w[p br h1 h2 h3 h4 h5 h6 strong em del a img ul ol li blockquote pre code
    hr table thead tbody tr th td].freeze
  ATTRIBUTES = %w[href src alt title start colspan rowspan].freeze

  def self.render(markdown)
    html = Commonmarker.to_html(markdown.to_s, options: {render: {unsafe: false}, extension: {header_ids: nil}},
      plugins: {syntax_highlighter: nil})
    Rails::HTML5::SafeListSanitizer.new.sanitize(html, tags: TAGS, attributes: ATTRIBUTES)
  end
end
