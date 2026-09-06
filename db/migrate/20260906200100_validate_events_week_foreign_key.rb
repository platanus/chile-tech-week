# The second half of CreateWeeks: check the rows already in `events` against the new
# foreign key, in its own migration so the table is not locked for writes while it runs.
class ValidateEventsWeekForeignKey < ActiveRecord::Migration[8.1]
  def change
    validate_foreign_key :events, :weeks
  end
end
