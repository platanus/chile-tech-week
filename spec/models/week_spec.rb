require "rails_helper"

RSpec.describe Week do
  let(:week) { described_class.find(2026) }

  it "is known by the two digits its URLs use" do
    expect(week.slug).to eq("26")
    expect(week.to_param).to eq("26")
    expect(described_class.from_slug("26")).to eq(week)
    expect(described_class.from_slug("2026")).to eq(week)
    expect(described_class.from_slug("99")).to be_nil
    expect(described_class.from_slug("nope")).to be_nil
    expect(described_class.from_slug(nil)).to be_nil
  end

  describe ".current" do
    it "is the week running today" do
      travel_to(Time.zone.local(2026, 11, 18)) { expect(described_class.current).to eq(week) }
    end

    it "is the closest one otherwise, before or after today" do
      travel_to(Time.zone.local(2026, 9, 6)) { expect(described_class.current.year).to eq(2026) }
      travel_to(Time.zone.local(2025, 12, 1)) { expect(described_class.current.year).to eq(2025) }
      travel_to(Time.zone.local(2026, 6, 1)) { expect(described_class.current.year).to eq(2026) }
    end

    it "says so when there are none" do
      Event.delete_all
      described_class.delete_all

      expect { described_class.current }.to raise_error(ActiveRecord::RecordNotFound, /db:seed/)
    ensure
      described_class.seed!
    end
  end

  it "counts the days to the week, and none while it runs" do
    expect(week.days_from(Date.new(2026, 11, 18))).to eq(0)
    expect(week.days_from(Date.new(2026, 11, 6))).to eq(10)
    expect(week.days_from(Date.new(2026, 11, 27))).to eq(5)
  end

  it "lists its days the way the programme's tabs read them" do
    expect(week.days.first.to_h).to eq(date: "2026-11-16", label: "Lun 16")
    expect(week.days.last.to_h).to eq(date: "2026-11-22", label: "Dom 22")
    expect(week.days.size).to eq(7)
  end

  it "covers the whole week in Santiago time, and nothing outside it" do
    expect(week.within_window?(Time.zone.local(2026, 11, 16, 0, 0))).to be(true)
    expect(week.within_window?(Time.zone.local(2026, 11, 22, 23, 59))).to be(true)
    expect(week.within_window?(Time.zone.local(2026, 11, 15, 23, 59))).to be(false)
    expect(week.within_window?(Time.zone.local(2026, 11, 23, 0, 1))).to be(false)
    expect(week.within_window?(nil)).to be(false)
  end

  it "says its dates in Spanish" do
    expect(week.dates_label).to eq("16 al 22 de noviembre")
  end

  it "owns its events and will not go while it has any" do
    event = create(:event, edition: 2026)

    expect(week.events).to include(event)
    expect(event.week).to eq(week)
    expect { week.destroy! }.to raise_error(ActiveRecord::DeleteRestrictionError)
  end
end
