# One page of a paginated list as the pages receive it (from a Pagy::Offset).
Pagination = Data.define(:count, :page, :last, :from, :to, :previous, :next) do
  def self.from_pagy(pagy)
    new(count: pagy.count, page: pagy.page, last: pagy.last, from: pagy.from, to: pagy.to,
      previous: pagy.previous, next: pagy.next)
  end
end
