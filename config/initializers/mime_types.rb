# The Markdown twin of every public page (/events.md, /<slug>.md), also negotiable with
# `Accept: text/markdown` — what llmstxt.org suggests for agents that skip the HTML.
Mime::Type.register "text/markdown", :md
