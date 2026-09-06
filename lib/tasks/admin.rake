namespace :admin do
  desc "Create an admin (bin/rails 'admin:create[email,first name,last name]'); prints the generated password"
  task :create, [:email, :first_name, :last_name] => :environment do |_t, args|
    email = args[:email].to_s.strip.downcase
    abort "usage: bin/rails 'admin:create[email,first name,last name]'" if email.blank? || args[:first_name].blank?

    if User.exists?(email: email)
      puts "#{email} already exists; use admin:reset_password to set a new password"
      next
    end

    password = SecureRandom.base58(20)
    User.create!(email: email, first_name: args[:first_name], last_name: args[:last_name].presence || args[:first_name],
      password: password, role: "admin", notifications_enabled_at: Time.current)
    puts "Created admin #{email}"
    puts "Password: #{password}"
  end

  desc "Set a new random password for an admin (bin/rails 'admin:reset_password[email]')"
  task :reset_password, [:email] => :environment do |_t, args|
    user = User.find_by!(email: args[:email].to_s.strip.downcase)
    password = SecureRandom.base58(20)
    user.update!(password: password)
    puts "New password for #{user.email}: #{password}"
  end
end
