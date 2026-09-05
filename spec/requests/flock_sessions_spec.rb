require "rails_helper"

RSpec.describe "the pilot's flock session" do
  let(:world) { Flock::World.new }

  before do
    allow(Flock::World).to receive(:instance).and_return(world)
    allow(world).to receive(:ensure_running)
  end

  describe "POST /flock/session" do
    it "creates a pilot with a generated codename and keeps them in a signed cookie" do
      expect { post "/flock/session" }.to change(Player, :count).by(1)
      body = response.parsed_body
      expect(body["codename"]).to match(/\A[a-z]+-[a-z]+-\d+\z/)
      expect(Flock::Palette::COLORS).to include(body["color"])
      expect(body["renamed"]).to be false
      expect(body["palette"]).to eq(Flock::Palette::COLORS)

      expect { post "/flock/session" }.not_to change(Player, :count)
      expect(response.parsed_body["id"]).to eq(body["id"])
    end

    it "renames a pilot whose codename someone online is using" do
      post "/flock/session"
      me = Player.find(response.parsed_body["id"])
      world.join_player(me.id + 1000, codename: me.codename, color: "#FFFFFF", sink: ->(_f) {})

      post "/flock/session"
      expect(response.parsed_body["renamed"]).to be true
      expect(response.parsed_body["codename"]).not_to eq(me.codename)
      expect(me.reload.codename).to eq(response.parsed_body["codename"])
    end
  end

  describe "PATCH /flock/session" do
    it "needs a session" do
      patch "/flock/session", params: {codename: "x"}
      expect(response).to have_http_status(:unauthorized)
    end

    it "takes a new codename and colour, normalised, and tells the flock" do
      post "/flock/session"
      me = Player.find(response.parsed_body["id"])
      world.join_player(me.id, codename: me.codename, color: me.color, sink: ->(_f) {})
      expect(world).to receive(:update_meta).with(me.id, codename: "zorro-andino-42", color: "#F5C542").and_call_original

      patch "/flock/session", params: {codename: " Zorro Andino 42 ", color: "#F5C542"}
      expect(response).to have_http_status(:ok)
      expect(me.reload).to have_attributes(codename: "zorro-andino-42", color: "#F5C542")
    end

    it "refuses a codename someone online has, or one that is not a name" do
      post "/flock/session"
      world.join_player(12_345, codename: "puma-veloz-7", color: "#FFFFFF", sink: ->(_f) {})

      patch "/flock/session", params: {codename: "Puma Veloz 7"}
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to eq("ese nombre está en uso")

      patch "/flock/session", params: {codename: "a!"}
      expect(response).to have_http_status(:unprocessable_entity)

      patch "/flock/session", params: {color: "#123456"}
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "keeps your own codename when only the colour changes" do
      post "/flock/session"
      name = response.parsed_body["codename"]
      patch "/flock/session", params: {color: "#4FD1C5"}
      expect(response.parsed_body).to include("codename" => name, "color" => "#4FD1C5")
    end
  end
end
