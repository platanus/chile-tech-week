module Admin
  # The log of every email sent (OutboundEmail): searchable list with the totals, and one
  # message with its stored HTML.
  class OutboundEmailsController < BaseController
    PER_PAGE = 20

    def index
      @search = params[:search].to_s.strip
      scope = OutboundEmail.newest_first
      scope = scope.search(@search) if @search.present?
      pagy, @emails = pagy(:offset, scope, limit: PER_PAGE)
      @pagination = Pagination.from_pagy(pagy)
      @stats = OutboundEmail.stats
    end

    def show
      @email = OutboundEmail.find(params[:id])
      @html_content = @email.html_content
    end
  end
end
