module Admin
  # POST /admin/:week/events/:event_id/takedown — Events::TakeDown with the reason the host will read.
  class EventTakedownsController < BaseController
    def create
      event = find_event(params[:event_id])
      result = Events::TakeDown.new(event, reason: params[:reason]).call
      if result.ok
        redirect_to admin_event_path(@week, event), notice: "Evento dado de baja, cancelado en Luma y correo enviado."
      else
        redirect_to admin_event_path(@week, event), alert: result.error
      end
    end
  end
end
