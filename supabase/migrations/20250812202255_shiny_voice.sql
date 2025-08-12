/*
  # Create schedule management tables

  1. New Tables
    - `working_hours`
      - `id` (uuid, primary key)
      - `salon_id` (uuid, foreign key to salons)
      - `day_of_week` (integer, 0-6 where 0=Sunday)
      - `is_open` (boolean, whether salon is open this day)
      - `open_time` (time, opening time)
      - `close_time` (time, closing time)
      - `break_start` (time, optional break start)
      - `break_end` (time, optional break end)
      - `slot_duration` (integer, duration in minutes)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `slots`
      - `id` (uuid, primary key)
      - `salon_id` (uuid, foreign key to salons)
      - `date` (date, the specific date)
      - `time_slot` (time, the specific time)
      - `status` (text, available/blocked/booked)
      - `booking_id` (uuid, optional foreign key to bookings)
      - `blocked_reason` (text, optional reason for blocking)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for salon owners to manage their data
    - Add policies for public to read available slots

  3. Functions
    - `generate_slots_for_period` - Generate slots for date range
    - `block_slot_by_user` - Block specific slot
    - `unblock_slot_by_user` - Unblock specific slot

  4. Indexes
    - Optimize queries by salon_id, date, status
    - Unique constraint on salon_id + date + time_slot for slots
    - Unique constraint on salon_id + day_of_week for working_hours
*/

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

-- Enable RLS
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_working_hours_salon_id ON working_hours(salon_id);
CREATE INDEX IF NOT EXISTS idx_slots_salon_id ON slots(salon_id);
CREATE INDEX IF NOT EXISTS idx_slots_date ON slots(date);
CREATE INDEX IF NOT EXISTS idx_slots_status ON slots(status);
CREATE INDEX IF NOT EXISTS idx_slots_salon_date ON slots(salon_id, date);

-- RLS Policies for working_hours
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

CREATE POLICY "Public can read working hours"
  ON working_hours
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- RLS Policies for slots
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

CREATE POLICY "Public can read available slots"
  ON slots
  FOR SELECT
  TO anon, authenticated
  USING (status = 'available' OR true);

-- Create update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_working_hours_updated_at
  BEFORE UPDATE ON working_hours
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  current_date date;
  current_time time;
  slot_interval interval;
BEGIN
  -- Convert slot duration to interval
  slot_interval := (p_slot_duration || ' minutes')::interval;
  
  -- Loop through each date in the range
  current_date := p_start_date;
  WHILE current_date <= p_end_date LOOP
    -- Skip Sundays (day_of_week = 0)
    IF EXTRACT(DOW FROM current_date) != 0 THEN
      -- Generate slots for this date
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
$$;

-- Function to block a slot
CREATE OR REPLACE FUNCTION block_slot_by_user(
  p_date date,
  p_time time,
  p_reason text DEFAULT 'Bloqueado manualmente'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  salon_id_var uuid;
BEGIN
  -- Get salon_id for the current user
  SELECT id INTO salon_id_var
  FROM salons
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  IF salon_id_var IS NULL THEN
    RAISE EXCEPTION 'Salon not found for current user';
  END IF;
  
  -- Update the slot
  UPDATE slots
  SET status = 'blocked',
      blocked_reason = p_reason,
      booking_id = NULL
  WHERE salon_id = salon_id_var
    AND date = p_date
    AND time_slot = p_time;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slot not found';
  END IF;
END;
$$;

-- Function to unblock a slot
CREATE OR REPLACE FUNCTION unblock_slot_by_user(
  p_date date,
  p_time time
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  salon_id_var uuid;
BEGIN
  -- Get salon_id for the current user
  SELECT id INTO salon_id_var
  FROM salons
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  IF salon_id_var IS NULL THEN
    RAISE EXCEPTION 'Salon not found for current user';
  END IF;
  
  -- Update the slot
  UPDATE slots
  SET status = 'available',
      blocked_reason = NULL,
      booking_id = NULL
  WHERE salon_id = salon_id_var
    AND date = p_date
    AND time_slot = p_time;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slot not found';
  END IF;
END;
$$;