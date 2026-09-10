CREATE TABLE body_measurements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_at timestamptz NOT NULL DEFAULT now(),
  weight_kg numeric(5,2),
  skeletal_muscle_kg numeric(5,2),
  fat_mass_kg numeric(5,2),
  body_water_kg numeric(5,2),
  lean_body_mass_kg numeric(5,2),
  bmi numeric(5,2),
  fat_percentage numeric(5,2),
  whr numeric(5,2),
  visceral_fat_grade integer,
  basal_metabolism_kcal numeric(6,1),
  health_score integer,
  physical_age integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own body measurements"
  ON body_measurements
  FOR ALL
  USING (auth.uid() = user_id);
