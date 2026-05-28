INSERT INTO model_registry (base_model, version, is_active, metrics)
SELECT 'jarvis-mock-v1', 'mock-1.0.0', true, '{"intent_accuracy": 0.9}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM model_registry WHERE version = 'mock-1.0.0');
