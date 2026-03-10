-- Add form module JSON column to traffic_managers for network-specific form modules
ALTER TABLE traffic_managers ADD COLUMN IF NOT EXISTS form_module_json jsonb DEFAULT NULL;
