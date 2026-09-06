module Admin
  # POST /admin/events/:event_id/rejection — Events::Reject with the reason the host will read.
  class EventRejectionsController < BaseController
    def create
      event = Event.find(params[:event_id])
      reason = params[:reason].to_s.strip
      return redirect_to admin_event_path(event), alert: "Escribe el motivo del rechazo." if reason.blank?

      Events::Reject.new(event, reason: reason).call
      redirect_to admin_event_path(event), notice: "Evento rechazado y correo enviado."
    end
  end
end
