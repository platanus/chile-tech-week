module Admin
  class OutboundEmailsShowResource < ApplicationResource
    has_one :email, resource: Admin::OutboundEmailResource
    # The stored message, for the preview; only on this page.
    typelize html_content: :string
    attributes :html_content
  end
end
