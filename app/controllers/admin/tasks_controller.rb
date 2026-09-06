module Admin
  # The scheduled tasks (ScheduledTask) and how their last run went.
  class TasksController < BaseController
    def index
      @tasks = ScheduledTask.all
    end
  end
end
