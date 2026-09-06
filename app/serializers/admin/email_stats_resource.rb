module Admin
  class EmailStatsResource < ApplicationResource
    typelize total: :number, sent: :number, failed: :number, success_rate: :number
    attributes :total, :sent, :failed, :success_rate
  end
end
