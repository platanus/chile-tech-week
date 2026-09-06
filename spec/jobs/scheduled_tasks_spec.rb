require "rails_helper"

RSpec.describe "the scheduled tasks" do
  it "lists the two tasks the schedule runs" do
    expect(ScheduledTask.all.map(&:id)).to eq(["sync-luma-events", "luma-reminder"])
    expect(ScheduledTask.all.map(&:job_class)).to all(satisfy { |name| name.constantize < ApplicationJob })
    schedule = YAML.load_file(Rails.root.join("config/recurring.yml")).fetch("production")
    expect(schedule.values.map { |task| task["class"] }.compact).to match_array(ScheduledTask.all.map(&:job_class))
  end

  it "records a successful run" do
    run = ScheduledTask.run("luma-reminder")

    expect(run).to have_attributes(task_id: "luma-reminder", last_status: "success", execution_count: 1, last_error: nil)
    expect(ScheduledTask.find("luma-reminder").last_run).to eq(run)
  end

  it "records a failed run and re-raises" do
    allow(Luma::Sync).to receive(:new).and_raise(Luma::Error, "boom")

    expect { ScheduledTask.run("sync-luma-events") }.to raise_error(Luma::Error)
    expect(TaskRun.find_by!(task_id: "sync-luma-events")).to have_attributes(last_status: "error", last_error: "boom", execution_count: 1)
  end

  it "rejects unknown ids" do
    expect { ScheduledTask.run("nope") }.to raise_error(ArgumentError)
  end
end
