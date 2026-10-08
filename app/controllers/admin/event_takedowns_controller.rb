module Admin
  # POST /admin/:week/events/:event_id/takedown — Events::TakeDown with the reason the host will read.
  class EventTakedownsController < BaseController
    def create
      event = find_event(params[:event_id])
      result = Events::TakeDown.new(event, reason: params[:reason]).call
      if result.ok
        notice = event.luma_imported? ? "Evento dado de baja y quitado del calendario de Luma (sigue en Luma, es del organizador); correo enviado." : "Evento dado de baja, cancelado en Luma y correo enviado."
        redirect_to admin_event_path(@week, event), notice: notice
      else
        redirect_to admin_event_path(@week, event), alert: result.error
      end
    end
  end
end
