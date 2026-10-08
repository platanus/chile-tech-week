module Luma
  # What stands in for Luma::Internal when no passkey is configured (development, test): the
  # guests of each event are whatever the caller put there with `add_guest`.
  class FakeInternal
    include Singleton

    def initialize
      reset!
    end

    def reset!
      @guests = Hash.new { |hash, key| hash[key] = [] }
    end

    def guests(api_id)
      @guests[api_id].dup
    end

    # A guest as Luma lists them (the fields a caller reads).
    def add_guest(api_id, email:, name: "Ada Lovelace", approval_status: "approved", checked_in_at: nil)
      @guests[api_id] << {"email" => email, "name" => name, "approval_status" => approval_status, "checked_in_at" => checked_in_at}
    end
  end
end
