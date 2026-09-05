require "net/http"

module Legacy2025
  # The 2025 site kept company logos on Vercel Blob storage, which will not outlive the old
  # deployment. This copies every logo an imported 2025 event or co-host points at into
  # public/25/logos (committed with the app) and rewrites the rows to the local path. A logo
  # already on disk is not downloaded again, so it is safe to re-run.
  class LogoMirror
    BLOB_HOST = "hhxicnzgovqssr3c.public.blob.vercel-storage.com".freeze
    PUBLIC_PATH = "/25/logos".freeze

    def initialize(edition: Importer::EDITION, directory: Rails.public_path.join(PUBLIC_PATH.delete_prefix("/")))
      @edition = edition
      @directory = Pathname(directory)
    end

    # Returns the number of logos now served locally.
    def run
      @directory.mkpath
      remote_urls.each do |url|
        local = mirror(url)
        events.where(company_logo_url: url).update_all(company_logo_url: local)
        cohosts.where(company_logo_url: url).update_all(company_logo_url: local)
      end.size
    end

    private

    def events
      Event.for_edition(@edition)
    end

    def cohosts
      Cohost.joins(:event).merge(events)
    end

    def remote_urls
      (events.pluck(:company_logo_url) + cohosts.pluck(:company_logo_url)).compact.uniq
        .select { |url| URI(url).host == BLOB_HOST }
    end

    def mirror(url)
      name = File.basename(URI(url).path).gsub(/[^A-Za-z0-9._-]/, "-")
      path = @directory.join(name)
      path.binwrite(download(url)) unless path.exist?
      "#{PUBLIC_PATH}/#{name}"
    end

    def download(url)
      response = Net::HTTP.get_response(URI(url))
      raise "#{url}: HTTP #{response.code}" unless response.is_a?(Net::HTTPSuccess)

      response.body
    end
  end
end
