
-- Enable realtime for poll tables to ensure live updates work for participants
alter publication supabase_realtime add table poll_questions;
alter publication supabase_realtime add table poll_votes;
