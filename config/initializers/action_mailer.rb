# Every message is logged and sent by OutboundEmail::Delivery (see it for what happens when
# sending is off). The method itself is selected in config/application.rb for every
# environment; it is registered here once the autoloader is ready, since Delivery is app code.
Rails.application.config.to_prepare do
  ActionMailer::Base.add_delivery_method :outbound, OutboundEmail::Delivery
end
