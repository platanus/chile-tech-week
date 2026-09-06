# The host publishes from the status page once the Luma event is edited (Events::Publish).
class EventPublicationsController < InertiaController
  def create
    event = Event.find(params[:id])
    result = Events::Publish.new(event).call

    if result.ok
      redirect_to event_path(event), notice: "¡Tu evento está publicado!"
    else
      redirect_to event_path(event), alert: result.error
    end
  end
end
