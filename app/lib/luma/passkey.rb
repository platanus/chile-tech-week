require "base64"
require "digest"
require "openssl"

module Luma
  # The site's Luma sign-in. Luma accepts a passkey (WebAuthn) instead of a code sent by email, and
  # a passkey is only a key pair: this holds the one registered for the site's account — exported
  # from the password manager that stores it — and signs the challenge Luma sends, the way a
  # browser's authenticator would.
  #
  # `LUMA_PASSKEY` is the base64 of the JSON of one exported passkey:
  # {"credentialId" => the UUID, "userHandle" => base64url, "keyValue" => base64url PKCS#8 (ES256)}.
  class Passkey
    ORIGIN = "https://luma.com".freeze
    # Flags: user present (0x01) and user verified (0x04), which Luma's options require.
    FLAGS = 0x05

    def self.from_encoded(encoded)
      data = JSON.parse(Base64.decode64(encoded))
      new(credential_id: data.fetch("credentialId"), user_handle: data.fetch("userHandle"), key_value: data.fetch("keyValue"))
    end

    def initialize(credential_id:, user_handle:, key_value:)
      @credential_id = [credential_id.delete("-")].pack("H*")
      @user_handle = user_handle
      @key = OpenSSL::PKey.read(decode(key_value))
    end

    # The body of POST /auth/sign-in-with-passkey for the challenge in `options`
    # (the answer of /auth/passkey/request-authentication-options).
    #
    # `counter` must be higher than on the last sign-in: Luma rejects a passkey whose counter
    # went back (that is how it spots a cloned key), so callers pass the current time.
    def assertion(options, counter:)
      client_data = {type: "webauthn.get", challenge: options.fetch("challenge"), origin: ORIGIN, crossOrigin: false}.to_json
      authenticator_data = Digest::SHA256.digest(options.fetch("rpId")) + [FLAGS].pack("C") + [counter].pack("N")
      signature = @key.sign(OpenSSL::Digest.new("SHA256"), authenticator_data + Digest::SHA256.digest(client_data))
      id = encode(@credential_id)

      {
        id: id, rawId: id, type: "public-key", clientExtensionResults: {}, authenticatorAttachment: "platform",
        response: {authenticatorData: encode(authenticator_data), clientDataJSON: encode(client_data), signature: encode(signature), userHandle: @user_handle}
      }
    end

    private

    def encode(bytes)
      Base64.urlsafe_encode64(bytes, padding: false)
    end

    def decode(text)
      Base64.urlsafe_decode64(text + "=" * (-text.length % 4))
    end
  end
end
