# The flock (app/lib/flock) keeps every connected condor in one process's memory and sends frames
# straight to each socket. A second Puma worker would split the sky in two without any error, so
# refuse to boot that way rather than let it happen quietly.
if ENV["WEB_CONCURRENCY"].to_i > 1
  raise "WEB_CONCURRENCY=#{ENV["WEB_CONCURRENCY"]}: Flock::World is per-process; run one Puma worker " \
    "(or move the flock to a shared relay before adding workers)"
end
