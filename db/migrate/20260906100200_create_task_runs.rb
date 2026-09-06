class CreateTaskRuns < ActiveRecord::Migration[8.1]
  def change
    create_table :task_runs, id: :uuid do |t|
      t.string :task_id, null: false
      t.timestamptz :last_executed_at
      t.string :last_status
      t.text :last_error
      t.integer :execution_count, null: false, default: 0
      t.timestamps
    end
    add_index :task_runs, :task_id, unique: true
  end
end
