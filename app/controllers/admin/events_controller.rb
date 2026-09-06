module Admin
  # The submissions, every edition: the list to moderate (filtered by state, searched by
  # title/company/host) and one event with everything the admin can change on it.
  class EventsController < BaseController
    PER_PAGE = 10

    def index
      @status = Event::STATES.include?(params[:status]) ? params[:status] : "submitted"
      @search = params[:search].to_s.strip
      scope = Event.where(state: @status).order(created_at: :desc)
      scope = scope.where("title ILIKE :q OR company_name ILIKE :q OR author_name ILIKE :q", q: "%#{Event.sanitize_sql_like(@search)}%") if @search.present?
      pagy, @events = pagy(:offset, scope, limit: PER_PAGE)
      @pagination = Pagination.from_pagy(pagy)
    end

    def show
      @event = Event.includes(:themes, :audiences, :cohosts).with_attached_cover.find(params[:id])
      @communes = Communes::ALL
    end

    def update
      event = Event.find(params[:id])
      attributes = event_params.to_h
      attributes[:logo_shown_at] = ActiveModel::Type::Boolean.new.cast(attributes.delete(:logo_shown)) ? Time.current : nil if attributes.key?(:logo_shown)
      attributes[:custom_url] = attributes[:custom_url].presence if attributes.key?(:custom_url)

      if event.update(attributes)
        redirect_to admin_event_path(event), notice: "Evento actualizado."
      else
        redirect_to admin_event_path(event), alert: event.errors.full_messages.to_sentence, inertia: {errors: event.errors.to_hash(true)}
      end
    end

    private

    def event_params
      params.require(:event).permit(:commune, :custom_url, :logo_upload, :logo_shown)
    end
  end
end
