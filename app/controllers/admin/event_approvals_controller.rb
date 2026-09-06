module Admin
  # POST /admin/events/:event_id/approval — Events::Approve (creates the Luma event, mails the host).
  class EventApprovalsController < BaseController
    def create
      event = find_event(params[:event_id])
      return redirect_to admin_event_path(@week, event), alert: "Solo se puede aprobar un evento enviado." unless event.submitted?

      result = Events::Approve.new(event).call
      if result.ok
        redirect_to admin_event_path(@week, event), notice: "Evento aprobado, evento en Luma creado y correo enviado."
      else
        redirect_to admin_event_path(@week, event), alert: result.error
      end
    end
  end
end
