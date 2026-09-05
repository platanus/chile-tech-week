class CompanyLogoResource < ApplicationResource
  typelize company_name: :string, logo_url: :string
  attributes :company_name, :logo_url
end
