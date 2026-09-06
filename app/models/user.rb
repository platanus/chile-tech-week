# Who can sign in: the admins that moderate submissions (/admin). There is no public
# sign-up; accounts are created with `bin/rails admin:create[email,first,last]`.
class User < ApplicationRecord
  ROLES = %w[default admin].freeze

  devise :database_authenticatable, :rememberable, :validatable

  enum :role, ROLES.index_by(&:itself), validate: true

  validates :first_name, :last_name, presence: true

  # Admins that asked to be emailed about every new submission.
  scope :notified, -> { where.not(notifications_enabled_at: nil) }

  def full_name
    "#{first_name} #{last_name}"
  end
end
