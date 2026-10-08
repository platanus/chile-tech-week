require "rails_helper"

RSpec.describe Luma::Passkey do
  let(:key) { OpenSSL::PKey::EC.generate("prime256v1") }
  let(:passkey) do
    described_class.new(credential_id: "74 7dc33f-e386-436d-ad80-1fbbb7751 953".delete(" "), user_handle: "dXNyLWhhbmRsZQ",
      key_value: Base64.urlsafe_encode64(key.private_to_der, padding: false))
  end
  let(:options) { {"rpId" => "luma.com", "challenge" => "Y2hhbGxlbmdl", "userVerification" => "required"} }

  def decode(text)
    Base64.urlsafe_decode64(text + "=" * (-text.length % 4))
  end

  it "answers the challenge the way a browser's authenticator does" do
    body = passkey.assertion(options, counter: 1_800_000_000)
    response = body[:response]
    client_data = decode(response[:clientDataJSON])
    authenticator_data = decode(response[:authenticatorData])

    expect(JSON.parse(client_data)).to eq("type" => "webauthn.get", "challenge" => "Y2hhbGxlbmdl", "origin" => "https://luma.com", "crossOrigin" => false)
    expect(authenticator_data[0, 32]).to eq(Digest::SHA256.digest("luma.com"))
    expect(authenticator_data[32].unpack1("C")).to eq(0x05)
    expect(authenticator_data[33, 4].unpack1("N")).to eq(1_800_000_000)
    expect(body).to include(type: "public-key", id: body[:rawId], authenticatorAttachment: "platform")
    expect(response[:userHandle]).to eq("dXNyLWhhbmRsZQ")
  end

  it "signs the authenticator data and the hash of the client data, so Luma can verify it with the public key" do
    response = passkey.assertion(options, counter: 5)[:response]
    signed = decode(response[:authenticatorData]) + Digest::SHA256.digest(decode(response[:clientDataJSON]))

    expect(key.verify(OpenSSL::Digest.new("SHA256"), decode(response[:signature]), signed)).to be(true)
  end

  it "names the credential by the bytes of its UUID" do
    expect(decode(passkey.assertion(options, counter: 1)[:id]).unpack1("H*")).to eq("747dc33fe386436dad801fbbb7751953")
  end

  it "reads the passkey from the base64 of its exported JSON" do
    encoded = Base64.strict_encode64({credentialId: "747dc33f-e386-436d-ad80-1fbbb7751953", userHandle: "dXNyLWhhbmRsZQ",
                                      keyValue: Base64.urlsafe_encode64(key.private_to_der, padding: false)}.to_json)

    expect(described_class.from_encoded(encoded).assertion(options, counter: 1)[:response][:userHandle]).to eq("dXNyLWhhbmRsZQ")
  end
end
