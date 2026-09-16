module Discovery
  # /robots.txt: everyone is welcome — search engines and AI assistants alike — except on
  # what is not content: the panel, the hosts' private status pages, the share-image stages.
  class Robots
    # The crawlers behind ChatGPT search and its browsing, Claude, Perplexity, Google's and
    # Apple's AI features, Meta and Bing. `User-agent: *` already lets them in; naming them
    # makes the intent unambiguous to whoever audits the file, and to the vendors' own
    # checks (OpenAI's docs ask for OAI-SearchBot to be allowed explicitly).
    AI_AGENTS = %w[
      OAI-SearchBot ChatGPT-User GPTBot ClaudeBot Claude-SearchBot Claude-User PerplexityBot
      Perplexity-User Google-Extended Applebot Applebot-Extended meta-externalagent Bingbot
    ].freeze

    # `/events/<uuid>` is a host's status page: its address is their secret. The wildcards
    # spell a uuid without touching /events and /events/new.
    HIDDEN = %w[/admin /events/*-*-*-*-* /opengraph /*/opengraph /luma-cover /brand/wireframe-gen /flock/ /up].freeze

    def self.render
      new.render
    end

    def render
      <<~TXT
        # #{SITE_NAME} — #{Discovery.url}
        # Search engines and AI assistants are welcome: the programme is meant to be found.
        # A Markdown overview for agents lives at #{Discovery.url("/llms.txt")}.

        #{group("*")}
        # The crawlers behind AI search and assistants, allowed by name.
        #{group(*AI_AGENTS)}
        Sitemap: #{Discovery.url("/sitemap.xml")}
      TXT
    end

    private

    def group(*agents)
      lines = agents.map { |agent| "User-agent: #{agent}" }
      lines << "Allow: /"
      lines.concat(HIDDEN.map { |path| "Disallow: #{path}" })
      lines.join("\n") + "\n"
    end
  end
end
