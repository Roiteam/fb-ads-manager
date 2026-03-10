-- Agent Memory: self-learning system
CREATE TABLE IF NOT EXISTS agent_memory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN (
    'user_preference',
    'successful_pattern',
    'mistake_learned',
    'campaign_insight',
    'strategy_knowledge',
    'offer_insight',
    'workflow_pattern',
    'correction'
  )),
  content text NOT NULL,
  context text,
  importance smallint NOT NULL DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  times_used integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_agent_memory_user ON agent_memory(user_id);
CREATE INDEX idx_agent_memory_category ON agent_memory(category);
CREATE INDEX idx_agent_memory_importance ON agent_memory(importance DESC);

ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own memories" ON agent_memory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access" ON agent_memory
  FOR ALL USING (true) WITH CHECK (true);
