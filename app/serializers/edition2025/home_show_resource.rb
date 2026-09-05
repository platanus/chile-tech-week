module Edition2025
  class HomeShowResource < PageResource
    has_many :logos, resource: CompanyLogoResource
  end
end
