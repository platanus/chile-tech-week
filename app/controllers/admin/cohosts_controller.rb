module Admin
  # The co-hosts of one event: add one, change its logo or its visibility, remove it.
  class CohostsController < BaseController
    before_action :set_event

    def create
      cohost = @event.cohosts.build(cohost_params)
      if cohost.save
        redirect_to admin_event_path(@week, @event), notice: "Co-host agregado."
      else
        redirect_to admin_event_path(@week, @event), alert: cohost.errors.full_messages.to_sentence, inertia: {errors: cohost.errors.to_hash(true)}
      end
    end

    def update
      cohost = @event.cohosts.find(params[:id])
      attributes = cohost_params.to_h
      attributes[:logo_shown_at] = ActiveModel::Type::Boolean.new.cast(attributes.delete(:logo_shown)) ? Time.current : nil if attributes.key?(:logo_shown)

      if cohost.update(attributes)
        redirect_to admin_event_path(@week, @event), notice: "Co-host actualizado."
      else
        redirect_to admin_event_path(@week, @event), alert: cohost.errors.full_messages.to_sentence
      end
    end

    def destroy
      @event.cohosts.find(params[:id]).destroy!
      redirect_to admin_event_path(@week, @event), notice: "Co-host eliminado."
    end

    private

    def set_event
      @event = find_event(params[:event_id])
    end

    def cohost_params
      params.require(:cohost).permit(:company_name, :primary_contact_name, :primary_contact_email,
        :primary_contact_phone_number, :primary_contact_website, :primary_contact_linkedin, :logo_upload, :logo_shown)
    end
  end
end
