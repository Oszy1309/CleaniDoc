-- Erstelle 5 verschiedene Reinigungspläne für Frosty zum Testen

-- Erst schauen wir welche Customer ID Frosty hat
SELECT id, name FROM customers WHERE name ILIKE '%frosty%';

-- Schauen wir uns die Areas für Frosty an
SELECT id, name, customer_id FROM areas WHERE customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1);

-- Test Plan 1: Tägliche Büroreinigung
INSERT INTO cleaning_plans (
  customer_id,
  area_id,
  name,
  description,
  frequency,
  day_of_week,
  status,
  estimated_duration,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1),
  (SELECT id FROM areas WHERE customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1) LIMIT 1),
  'Tägliche Büroreinigung',
  'Standardreinigung für Büroräume mit Staubsaugen, Wischen und Müll entleeren',
  'daily',
  NULL,
  'active',
  45,
  NOW(),
  NOW()
);

-- Test Plan 2: Wöchentliche Tiefenreinigung (Montag)
INSERT INTO cleaning_plans (
  customer_id,
  area_id,
  name,
  description,
  frequency,
  day_of_week,
  status,
  estimated_duration,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1),
  (SELECT id FROM areas WHERE customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1) LIMIT 1),
  'Wöchentliche Tiefenreinigung',
  'Intensive Reinigung mit Fensterputzen und Desinfektion',
  'weekly',
  'monday',
  'active',
  120,
  NOW(),
  NOW()
);

-- Test Plan 3: Sanitärreinigung (Mittwoch + Freitag)
INSERT INTO cleaning_plans (
  customer_id,
  area_id,
  name,
  description,
  frequency,
  day_of_week,
  status,
  estimated_duration,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1),
  (SELECT id FROM areas WHERE customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1) LIMIT 1),
  'Sanitärreinigung',
  'Reinigung und Desinfektion aller Sanitäranlagen',
  'weekly',
  'wednesday',
  'active',
  60,
  NOW(),
  NOW()
);

-- Test Plan 4: Küchen- und Pausenraumreinigung
INSERT INTO cleaning_plans (
  customer_id,
  area_id,
  name,
  description,
  frequency,
  day_of_week,
  status,
  estimated_duration,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1),
  (SELECT id FROM areas WHERE customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1) LIMIT 1),
  'Küchen- und Pausenraumreinigung',
  'Gründliche Reinigung von Küche, Spülmaschine und Pausenbereich',
  'weekly',
  'friday',
  'active',
  90,
  NOW(),
  NOW()
);

-- Test Plan 5: Besprechungsraumreinigung (täglich)
INSERT INTO cleaning_plans (
  customer_id,
  area_id,
  name,
  description,
  frequency,
  day_of_week,
  status,
  estimated_duration,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1),
  (SELECT id FROM areas WHERE customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1) LIMIT 1),
  'Besprechungsraumreinigung',
  'Schnelle Reinigung der Konferenzräume nach Meetings',
  'daily',
  NULL,
  'active',
  30,
  NOW(),
  NOW()
);

-- Jetzt fügen wir Cleaning Steps für jeden Plan hinzu

-- Steps für Plan 1: Tägliche Büroreinigung
INSERT INTO cleaning_steps (cleaning_plan_id, step_number, title, description, estimated_minutes)
SELECT id, 1, 'Mülleimer leeren', 'Alle Mülleimer in den Büroräumen entleeren und neue Beutel einsetzen', 10
FROM cleaning_plans WHERE name = 'Tägliche Büroreinigung'
AND customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1);

INSERT INTO cleaning_steps (cleaning_plan_id, step_number, title, description, estimated_minutes)
SELECT id, 2, 'Schreibtische abstauben', 'Alle Schreibtische und Arbeitsflächen mit Mikrofasertuch abstauben', 15
FROM cleaning_plans WHERE name = 'Tägliche Büroreinigung'
AND customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1);

INSERT INTO cleaning_steps (cleaning_plan_id, step_number, title, description, estimated_minutes)
SELECT id, 3, 'Böden staubsaugen', 'Alle Teppichböden gründlich staubsaugen', 15
FROM cleaning_plans WHERE name = 'Tägliche Büroreinigung'
AND customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1);

INSERT INTO cleaning_steps (cleaning_plan_id, step_number, title, description, estimated_minutes)
SELECT id, 4, 'Hartböden wischen', 'Alle Hartböden feucht wischen', 5
FROM cleaning_plans WHERE name = 'Tägliche Büroreinigung'
AND customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1);

-- Steps für Plan 2: Wöchentliche Tiefenreinigung
INSERT INTO cleaning_steps (cleaning_plan_id, step_number, title, description, estimated_minutes)
SELECT id, 1, 'Fenster reinigen', 'Alle Fenster innen und außen reinigen', 30
FROM cleaning_plans WHERE name = 'Wöchentliche Tiefenreinigung'
AND customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1);

INSERT INTO cleaning_steps (cleaning_plan_id, step_number, title, description, estimated_minutes)
SELECT id, 2, 'Oberflächen desinfizieren', 'Alle Türklinken, Lichtschalter und häufig berührte Oberflächen desinfizieren', 20
FROM cleaning_plans WHERE name = 'Wöchentliche Tiefenreinigung'
AND customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1);

INSERT INTO cleaning_steps (cleaning_plan_id, step_number, title, description, estimated_minutes)
SELECT id, 3, 'Möbel gründlich reinigen', 'Alle Möbel abstauben und polieren', 40
FROM cleaning_plans WHERE name = 'Wöchentliche Tiefenreinigung'
AND customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1);

INSERT INTO cleaning_steps (cleaning_plan_id, step_number, title, description, estimated_minutes)
SELECT id, 4, 'Pflanzen pflegen', 'Büropflanzen gießen und Blätter abstauben', 30
FROM cleaning_plans WHERE name = 'Wöchentliche Tiefenreinigung'
AND customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1);

-- Steps für Plan 3: Sanitärreinigung
INSERT INTO cleaning_steps (cleaning_plan_id, step_number, title, description, estimated_minutes)
SELECT id, 1, 'Toiletten reinigen', 'Alle Toiletten gründlich reinigen und desinfizieren', 20
FROM cleaning_plans WHERE name = 'Sanitärreinigung'
AND customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1);

INSERT INTO cleaning_steps (cleaning_plan_id, step_number, title, description, estimated_minutes)
SELECT id, 2, 'Waschbecken reinigen', 'Alle Waschbecken und Armaturen reinigen und polieren', 15
FROM cleaning_plans WHERE name = 'Sanitärreinigung'
AND customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1);

INSERT INTO cleaning_steps (cleaning_plan_id, step_number, title, description, estimated_minutes)
SELECT id, 3, 'Böden wischen', 'Sanitärböden mit Desinfektionsmittel wischen', 15
FROM cleaning_plans WHERE name = 'Sanitärreinigung'
AND customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1);

INSERT INTO cleaning_steps (cleaning_plan_id, step_number, title, description, estimated_minutes)
SELECT id, 4, 'Verbrauchsmaterial auffüllen', 'Toilettenpapier, Seife und Handtücher nachfüllen', 10
FROM cleaning_plans WHERE name = 'Sanitärreinigung'
AND customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1);

-- Steps für Plan 4: Küchen- und Pausenraumreinigung
INSERT INTO cleaning_steps (cleaning_plan_id, step_number, title, description, estimated_minutes)
SELECT id, 1, 'Spülmaschine leeren', 'Sauberes Geschirr aus der Spülmaschine räumen und einordnen', 15
FROM cleaning_plans WHERE name = 'Küchen- und Pausenraumreinigung'
AND customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1);

INSERT INTO cleaning_steps (cleaning_plan_id, step_number, title, description, estimated_minutes)
SELECT id, 2, 'Kühlschrank reinigen', 'Kühlschrank innen und außen reinigen, abgelaufene Produkte entfernen', 25
FROM cleaning_plans WHERE name = 'Küchen- und Pausenraumreinigung'
AND customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1);

INSERT INTO cleaning_steps (cleaning_plan_id, step_number, title, description, estimated_minutes)
SELECT id, 3, 'Arbeitsflächen desinfizieren', 'Alle Küchenarbeitsflächen gründlich reinigen und desinfizieren', 20
FROM cleaning_plans WHERE name = 'Küchen- und Pausenraumreinigung'
AND customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1);

INSERT INTO cleaning_steps (cleaning_plan_id, step_number, title, description, estimated_minutes)
SELECT id, 4, 'Mikrowelle und Kaffeemaschine reinigen', 'Alle Küchengeräte innen und außen reinigen', 20
FROM cleaning_plans WHERE name = 'Küchen- und Pausenraumreinigung'
AND customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1);

INSERT INTO cleaning_steps (cleaning_plan_id, step_number, title, description, estimated_minutes)
SELECT id, 5, 'Böden wischen', 'Küchen- und Pausenraumböden feucht wischen', 10
FROM cleaning_plans WHERE name = 'Küchen- und Pausenraumreinigung'
AND customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1);

-- Steps für Plan 5: Besprechungsraumreinigung
INSERT INTO cleaning_steps (cleaning_plan_id, step_number, title, description, estimated_minutes)
SELECT id, 1, 'Tische abwischen', 'Alle Besprechungstische gründlich abwischen', 10
FROM cleaning_plans WHERE name = 'Besprechungsraumreinigung'
AND customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1);

INSERT INTO cleaning_steps (cleaning_plan_id, step_number, title, description, estimated_minutes)
SELECT id, 2, 'Stühle reinigen', 'Alle Stühle abstauben und bei Bedarf abwischen', 10
FROM cleaning_plans WHERE name = 'Besprechungsraumreinigung'
AND customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1);

INSERT INTO cleaning_steps (cleaning_plan_id, step_number, title, description, estimated_minutes)
SELECT id, 3, 'Whiteboard reinigen', 'Whiteboard und Flipchart reinigen', 5
FROM cleaning_plans WHERE name = 'Besprechungsraumreinigung'
AND customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1);

INSERT INTO cleaning_steps (cleaning_plan_id, step_number, title, description, estimated_minutes)
SELECT id, 4, 'Mülleimer leeren', 'Mülleimer leeren und neue Beutel einsetzen', 5
FROM cleaning_plans WHERE name = 'Besprechungsraumreinigung'
AND customer_id = (SELECT id FROM customers WHERE name ILIKE '%frosty%' LIMIT 1);

-- Prüfen was erstellt wurde
SELECT cp.name, cp.frequency, cp.day_of_week, cp.status, c.name as customer_name, a.name as area_name
FROM cleaning_plans cp
JOIN customers c ON cp.customer_id = c.id
JOIN areas a ON cp.area_id = a.id
WHERE c.name ILIKE '%frosty%'
ORDER BY cp.created_at DESC;

-- Prüfen der Steps
SELECT cp.name as plan_name, cs.step_number, cs.title, cs.estimated_minutes
FROM cleaning_plans cp
JOIN cleaning_steps cs ON cp.id = cs.cleaning_plan_id
JOIN customers c ON cp.customer_id = c.id
WHERE c.name ILIKE '%frosty%'
ORDER BY cp.name, cs.step_number;