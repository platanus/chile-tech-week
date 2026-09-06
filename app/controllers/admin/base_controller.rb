module Admin
  # Every page of the moderation panel: a signed-in admin (Devise) or a redirect to
  # /admin/login. Pages render under pages/Admin/* with the AdminLayout shell.
  #
  # The panel is always about one Chile Tech Week, the one named in the URL
  # (/admin/26/events). Without it — /admin, or a year we have no row for — the request
  # bounces to the nearest week's own address, so every page the admin lands on says which
  # week it is showing. `week` and `weeks` are shared with the React side for the switcher
  # in the sidebar.
  class BaseController < InertiaController
    before_action :authenticate_user!
    before_action :require_admin
    before_action :set_week

    inertia_share currentUser: -> { {email: current_user.email, fullName: current_user.full_name} if current_user },
      week: -> { week_prop(@week) },
      weeks: -> { Week.newest_first.map { |week| week_prop(week) } }

    private

    def require_admin
      return if current_user.admin?

      sign_out
      redirect_to new_user_session_path, alert: "Tu cuenta no tiene acceso al panel."
    end

    def set_week
      @week = Week.from_slug(params[:week])
      redirect_to admin_events_path(Week.current) unless @week
    end

    def week_prop(week)
      {slug: week.to_param, year: week.year} if week
    end

    # The event the URL names, of this week only: an id from another edition is a 404, not
    # someone else's event shown under the wrong heading.
    def find_event(id = params[:id])
      @week.events.find(id)
    end
  end
end
