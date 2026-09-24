class ApplicationController < ActionController::Base
  # No allow_browser gate: a public event site must open on any phone, including
  # iPhones on iOS < 17.2 and in-app browsers, which :modern answers with a 406.

  # Surface Rails flash to every Inertia page.
  inertia_share flash: -> { {notice: flash.notice, alert: flash.alert} }
end
