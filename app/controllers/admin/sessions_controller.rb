module Admin
  # Sign-in for the panel, as an Inertia page (/admin/login). Devise owns the password
  # (has_secure_password's bcrypt, `valid_password?`), the session (`sign_in`/`sign_out`
  # write Warden's) and `current_user`; the credentials are checked here rather than through
  # Warden's params strategy, so a wrong password comes back as a form error on the page the
  # visitor is already on instead of Devise's own re-render.
  class SessionsController < InertiaController
    def new
      redirect_to admin_root_path and return if user_signed_in?

      render_inertia "Admin/Sessions/New"
    end

    def create
      user = User.find_by(email: params.dig(:user, :email).to_s.strip.downcase)

      unless user&.valid_password?(params.dig(:user, :password).to_s)
        redirect_to new_user_session_path, inertia: {errors: {password: ["Email o contraseña incorrectos"]}}
        return
      end

      # Devise's rememberable hook reads this while signing in.
      user.remember_me = params.dig(:user, :remember_me) == "1"
      sign_in(:user, user)
      redirect_to stored_location_for(:user) || admin_root_path
    end

    def destroy
      sign_out(:user)
      redirect_to new_user_session_path, notice: "Cerraste tu sesión."
    end
  end
end
