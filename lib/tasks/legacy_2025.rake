# The 2025 edition's archive, imported from the old site's database. bin/import-2025 runs
# both steps against a pg_restore of its production dump.
namespace :legacy_2025 do
  desc "Import the 2025 site's database (LEGACY_2025_DATABASE_URL) into events, themes, audiences and cohosts"
  task import: :environment do
    url = ENV.fetch("LEGACY_2025_DATABASE_URL") { abort "LEGACY_2025_DATABASE_URL not set" }
    counts = Legacy2025::Importer.new(Legacy2025::Source.new(url)).run
    puts "legacy_2025:import — #{counts.to_h.map { |table, n| "#{n} #{table}" }.join(", ")}"
  end

  desc "Copy the 2025 logos from Vercel Blob into public/25/logos and point the rows at them"
  task mirror_logos: :environment do
    puts "legacy_2025:mirror_logos — #{Legacy2025::LogoMirror.new.run} logos in public/25/logos"
  end
end
