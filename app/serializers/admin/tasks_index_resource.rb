module Admin
  class TasksIndexResource < ApplicationResource
    has_many :tasks, resource: Admin::TaskResource
  end
end
