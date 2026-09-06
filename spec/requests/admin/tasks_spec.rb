require "rails_helper"

RSpec.describe "admin tasks" do
  before { sign_in create(:user) }

  describe "GET /admin/tasks" do
    it "lists the scheduled tasks with their last run" do
      create(:task_run, task_id: "sync-luma-events", last_status: "error", last_error: "timeout", execution_count: 3)

      get "/admin/25/tasks"

      expect(response).to have_http_status(:ok)
      expect(inertia).to render_component("Admin/Tasks/Index")
      tasks = inertia.props.fetch(:tasks).map(&:deep_symbolize_keys)
      expect(tasks.map { |t| t[:id] }).to eq(["sync-luma-events", "luma-reminder"])
      expect(tasks.first).to include(lastStatus: "error", lastError: "timeout", executionCount: 3, jobClass: "SyncLumaEventsJob")
      expect(tasks.last).to include(lastStatus: nil, executionCount: 0)
    end
  end

  describe "POST /admin/tasks/:id/run" do
    it "runs the task now and reports" do
      allow(ScheduledTask).to receive(:run).with("luma-reminder")

      post "/admin/25/tasks/luma-reminder/run"

      expect(ScheduledTask).to have_received(:run)
      expect(response).to redirect_to("/admin/25/tasks")
      follow_redirect!
      expect(inertia).to have_flash(notice: "Tarea luma-reminder ejecutada.")
    end

    it "reports a failing task" do
      allow(ScheduledTask).to receive(:run).and_raise(RuntimeError, "Luma 500")

      post "/admin/25/tasks/luma-reminder/run"

      follow_redirect!
      expect(inertia).to have_flash(alert: "La tarea luma-reminder falló: Luma 500")
    end

    it "rejects an unknown task" do
      post "/admin/25/tasks/nope/run"

      follow_redirect!
      expect(inertia).to have_flash(alert: "Tarea desconocida.")
    end
  end
end
