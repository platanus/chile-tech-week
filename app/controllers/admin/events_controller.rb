module Admin
  # The submissions of the week in the URL: the list to moderate (filtered by state,
  # searched by title/company/host) and one event with everything the admin can change on it.
  class EventsController < BaseController
    PER_PAGE = 25

    def index
      @status = Event::STATES.include?(params[:status]) ? params[:status] : "all"
      @search = params[:search].to_s.strip
      scope = @week.events.order(created_at: :desc)
      scope = scope.where(state: @status) unless @status == "all"
      scope = scope.where("title ILIKE :q OR company_name ILIKE :q OR author_name ILIKE :q", q: "%#{Event.sanitize_sql_like(@search)}%") if @search.present?
      pagy, @events = pagy(:offset, scope, limit: PER_PAGE)
      @pagination = Pagination.from_pagy(pagy)
    end

    def show
      @event = find_event
      @communes = Communes::ALL
      @formats = Event::FORMATS
      @themes = Theme.order(:name)
      @audiences = Audience.order(:name)
    end

    # Every field the organiser submitted, in one PATCH or one at a time. What Luma owns (the title
    # and dates, once the Luma event exists) is refused outright rather than dropped, so a
    # change never looks saved when it was not.
    def update
      event = find_event
      attributes = event_params.to_h
      if event.luma_synced? && attributes.keys.intersect?(Event::LUMA_SYNCED_ATTRIBUTES)
        return redirect_to admin_event_path(@week, event), alert: "El título y las fechas se editan en Luma; el sitio los sincroniza desde allá."
      end

      attributes[:logo_shown_at] = ActiveModel::Type::Boolean.new.cast(attributes.delete(:logo_shown)) ? Time.current : nil if attributes.key?(:logo_shown)
      attributes[:custom_url] = attributes[:custom_url].presence if attributes.key?(:custom_url)
      # The catalogue picks arrive whole: an empty list clears them, an absent key leaves them.
      attributes[:themes] = Theme.where(id: attributes.delete(:theme_ids).compact_blank) if attributes.key?(:theme_ids)
      attributes[:audiences] = Audience.where(id: attributes.delete(:audience_ids).compact_blank) if attributes.key?(:audience_ids)

      if event.update(attributes)
        redirect_to admin_event_path(@week, event), notice: "Evento actualizado."
      else
        redirect_to admin_event_path(@week, event), alert: event.errors.full_messages.to_sentence, inertia: {errors: event.errors.to_hash(true)}
      end
    end

    private

    def event_params
      params.require(:event).permit(
        :title, :description, :author_name, :author_email, :author_phone_number, :company_name, :company_website,
        :starts_at, :ends_at, :commune, :format, :capacity,
        :custom_url, :logo_upload, :logo_shown, theme_ids: [], audience_ids: []
      )
    end
  end
end
