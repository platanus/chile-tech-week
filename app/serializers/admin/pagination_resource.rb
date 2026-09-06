module Admin
  class PaginationResource < ApplicationResource
    typelize count: :number, page: :number, last: :number, from: :number, to: :number,
      previous: [:number, nullable: true], next: [:number, nullable: true]
    attributes :count, :page, :last, :from, :to, :previous, :next
  end
end
