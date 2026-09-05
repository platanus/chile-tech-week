# Checks migrations for the patterns that lock a table. Write migrations normally; it stops
# you when one is unsafe and says how to do it safely.
StrongMigrations.start_after = 20260904000000
StrongMigrations.target_version = 15
StrongMigrations.lock_timeout = 10.seconds
