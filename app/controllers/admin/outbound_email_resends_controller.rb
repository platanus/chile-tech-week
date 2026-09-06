module Admin
  # POST /admin/emails/:outbound_email_id/resend — sends the stored message again.
  class OutboundEmailResendsController < BaseController
    def create
      email = OutboundEmail.find(params[:outbound_email_id])
      email.resend!
      redirect_to admin_outbound_email_path(email), notice: "Correo reenviado."
    rescue => e
      Rails.logger.error("Resend of #{email&.id} failed: #{e.message}")
      redirect_to admin_outbound_email_path(email), alert: "No se pudo reenviar: #{e.message}"
    end
  end
end
