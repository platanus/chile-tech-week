module Admin
  # The log of the emails this week's events produced (OutboundEmail#for_week):
  # searchable list with the totals, and one message with its stored HTML.
  class OutboundEmailsController < BaseController
    PER_PAGE = 20

    def index
      @search = params[:search].to_s.strip
      scope = emails.newest_first
      scope = scope.search(@search) if @search.present?
      pagy, @emails = pagy(:offset, scope, limit: PER_PAGE)
      @pagination = Pagination.from_pagy(pagy)
      @stats = emails.stats
    end

    def show
      @email = emails.find(params[:id])
      @html_content = @email.html_content
    end

    private

    def emails
      OutboundEmail.for_week(@week)
    end
  end
end
