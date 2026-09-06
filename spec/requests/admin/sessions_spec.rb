require "rails_helper"

RSpec.describe "admin sign-in" do
  let(:admin) { create(:user, email: "ada@techweek.cl", password: "secret-password") }

  it "sends visitors of the panel to the login page" do
    get "/admin/events"

    expect(response).to redirect_to("/admin/login")
  end

  it "renders the login page" do
    get "/admin/login"

    expect(response).to have_http_status(:ok)
    expect(inertia).to render_component("Admin/Sessions/New")
  end

  it "signs an admin in and shows the panel" do
    post "/admin/login", params: {user: {email: admin.email, password: "secret-password"}}

    expect(response).to redirect_to("/admin/events")
    follow_redirect!
    expect(inertia).to render_component("Admin/Events/Index")
    expect(inertia.props.dig(:currentUser, :email)).to eq("ada@techweek.cl")
  end

  it "rejects a wrong password with a form error" do
    post "/admin/login", params: {user: {email: admin.email, password: "nope"}}

    expect(response).to redirect_to("/admin/login")
    follow_redirect!
    expect(inertia.props[:errors]).to include(password: ["Email o contraseña incorrectos"])
  end

  it "keeps non-admin accounts out" do
    sign_in create(:user, role: "default")

    get "/admin/events"

    expect(response).to redirect_to("/admin/login")
    follow_redirect!
    expect(inertia).to have_flash(alert: "Tu cuenta no tiene acceso al panel.")
  end

  it "signs out" do
    sign_in admin

    delete "/admin/logout"

    expect(response).to redirect_to("/admin/login")
    get "/admin/events"
    expect(response).to redirect_to("/admin/login")
  end
end
