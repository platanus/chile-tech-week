module Admin
  # Every page of the moderation panel: a signed-in admin (Devise) or a redirect to
  # /admin/login. Pages render under pages/Admin/* with the AdminLayout shell.
  class BaseController < InertiaController
    before_action :authenticate_user!
    before_action :require_admin

    inertia_share currentUser: -> { {email: current_user.email, fullName: current_user.full_name} if current_user }

    private

    def require_admin
      return if current_user.admin?

      sign_out
      redirect_to new_user_session_path, alert: "Tu cuenta no tiene acceso al panel."
    end
  end
end
