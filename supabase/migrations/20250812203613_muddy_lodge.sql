/*
  # Create missing tables for Centro Terapêutico system (Safe version)

  1. New Tables
    - `reviews` - Customer reviews and ratings
    - `working_hours` - Default schedule configuration per day of week
    - `slots` - Individual time slots for booking management

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for salon owners and public access (only if they don't exist)

  3. Functions
    - Slot management functions for blocking/unblocking
    - Automatic slot generation for periods
*/

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_identifier text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(salon_id, customer_identifier)
);

-- Create working_hours table
CREATE TABLE IF NOT EXISTS working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_open boolean DEFAULT true,
  open_time time,
  close_time time,
  break_start time,
  break_end time,
  slot_duration integer DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(salon_id, day_of_week)
);

-- Create slots table
CREATE TABLE IF NOT EXISTS slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  date date NOT NULL,
  time_slot time NOT NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'blocked', 'booked')),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  blocked_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(salon_id, date, time_slot)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_salon_id ON reviews(salon_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(approved);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_customer ON reviews(salon_id, customer_identifier);

CREATE INDEX IF NOT EXISTS idx_working_hours_salon_id ON working_hours(salon_id);
CREATE INDEX IF NOT EXISTS idx_working_hours_day ON working_hours(day_of_week);

CREATE INDEX IF NOT EXISTS idx_slots_salon_date ON slots(salon_id, date);
CREATE INDEX IF NOT EXISTS idx_slots_status ON slots(status);
CREATE INDEX IF NOT EXISTS idx_slots_booking_id ON slots(booking_id);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$
BEGIN
  -- Reviews policies
  DROP POLICY IF EXISTS "Public can read approved reviews" ON reviews;
  DROP POLICY IF EXISTS "Public can create reviews" ON reviews;
  DROP POLICY IF EXISTS "Salons can manage own reviews" ON reviews;
  
  -- Working hours policies
  DROP POLICY IF EXISTS "Salons can manage own working hours" ON working_hours;
  
  -- Slots policies
  DROP POLICY IF EXISTS "Public can read available slots" ON slots;
  DROP POLICY IF EXISTS "Salons can manage own slots" ON slots;
END $$;

-- Create RLS Policies for reviews
CREATE POLICY "Public can read approved reviews"
  ON reviews
  FOR SELECT
  TO anon, authenticated
  USING (approved = true);

CREATE POLICY "Public can create reviews"
  ON reviews
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Salons can manage own reviews"
  ON reviews
  FOR ALL
  TO authenticated
  USING (salon_id IN (
    SELECT id FROM salons WHERE user_id = auth.uid()
  ))
  WITH CHECK (salon_id IN (
    SELECT id FROM salons WHERE user_id = auth.uid()
  ));

-- Create RLS Policies for working_hours
CREATE POLICY "Salons can manage own working hours"
  ON working_hours
  FOR ALL
  TO authenticated
  USING (salon_id IN (
    SELECT id FROM salons WHERE user_id = auth.uid()
  ))
  WITH CHECK (salon_id IN (
    SELECT id FROM salons WHERE user_id = auth.uid()
  ));

-- Create RLS Policies for slots
CREATE POLICY "Public can read available slots"
  ON slots
  FOR SELECT
  TO anon, authenticated
  USING (status = 'available');

CREATE POLICY "Salons can manage own slots"
  ON slots
  FOR ALL
  TO authenticated
  USING (salon_id IN (
    SELECT id FROM salons WHERE user_id = auth.uid()
  ))
  WITH CHECK (salon_id IN (
    SELECT id FROM salons WHERE user_id = auth.uid()
  ));

-- Create or replace triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_working_hours_updated_at ON working_hours;
CREATE TRIGGER update_working_hours_updated_at
    BEFORE UPDATE ON working_hours
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_slots_updated_at ON slots;
CREATE TRIGGER update_slots_updated_at
    BEFORE UPDATE ON slots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate slots for a period
CREATE OR REPLACE FUNCTION generate_slots_for_period(
  p_salon_id uuid,
  p_start_date date,
  p_end_date date,
  p_open_time time DEFAULT '08:00',
  p_close_time time DEFAULT '18:00',
  p_slot_duration integer DEFAULT 30,
  p_break_start time DEFAULT NULL,
  p_break_end time DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  current_date date;
  current_time time;
  slot_interval interval;
BEGIN
  slot_interval := (p_slot_duration || ' minutes')::interval;
  current_date := p_start_date;
  
  WHILE current_date <= p_end_date LOOP
    -- Skip Sundays (day_of_week = 0)
    IF EXTRACT(DOW FROM current_date) != 0 THEN
      current_time := p_open_time;
      
      WHILE current_time < p_close_time LOOP
        -- Skip break time if specified
        IF p_break_start IS NOT NULL AND p_break_end IS NOT NULL THEN
          IF current_time >= p_break_start AND current_time < p_break_end THEN
            current_time := current_time + slot_interval;
            CONTINUE;
          END IF;
        END IF;
        
        -- Insert slot if it doesn't exist
        INSERT INTO slots (salon_id, date, time_slot, status)
        VALUES (p_salon_id, current_date, current_time, 'available')
        ON CONFLICT (salon_id, date, time_slot) DO NOTHING;
        
        current_time := current_time + slot_interval;
      END LOOP;
    END IF;
    
    current_date := current_date + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to block a slot
CREATE OR REPLACE FUNCTION block_slot_by_user(
  p_date date,
  p_time time,
  p_reason text DEFAULT 'Bloqueado manualmente'
)
RETURNS void AS $$
DECLARE
  p_salon_id uuid;
BEGIN
  -- Get salon_id from authenticated user
  SELECT id INTO p_salon_id 
  FROM salons 
  WHERE user_id = auth.uid() 
  LIMIT 1;
  
  IF p_salon_id IS NULL THEN
    RAISE EXCEPTION 'Salon not found for user';
  END IF;
  
  UPDATE slots 
  SET status = 'blocked', 
      blocked_reason = p_reason,
      booking_id = NULL
  WHERE salon_id = p_salon_id 
    AND date = p_date 
    AND time_slot = p_time
    AND status = 'available';
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slot not found or not available';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to unblock a slot
CREATE OR REPLACE FUNCTION unblock_slot_by_user(
  p_date date,
  p_time time
)
RETURNS void AS $$
DECLARE
  p_salon_id uuid;
BEGIN
  -- Get salon_id from authenticated user
  SELECT id INTO p_salon_id 
  FROM salons 
  WHERE user_id = auth.uid() 
  LIMIT 1;
  
  IF p_salon_id IS NULL THEN
    RAISE EXCEPTION 'Salon not found for user';
  END IF;
  
  UPDATE slots 
  SET status = 'available', 
      blocked_reason = NULL,
      booking_id = NULL
  WHERE salon_id = p_salon_id 
    AND date = p_date 
    AND time_slot = p_time
    AND status = 'blocked';
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slot not found or not blocked';
  END IF;
END;
$$ LANGUAGE plpgsql;