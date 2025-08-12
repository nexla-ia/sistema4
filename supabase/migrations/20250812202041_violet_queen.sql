/*
  # Create schedule management tables

  1. New Tables
    - `working_hours`
      - `id` (uuid, primary key)
      - `salon_id` (uuid, foreign key)
      - `day_of_week` (integer, 0=domingo, 6=sábado)
      - `is_open` (boolean)
      - `open_time` (time)
      - `close_time` (time)
      - `break_start` (time, optional)
      - `break_end` (time, optional)
      - `slot_duration` (integer, minutos)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `slots`
      - `id` (uuid, primary key)
      - `salon_id` (uuid, foreign key)
      - `date` (date)
      - `time_slot` (time)
      - `status` (text: available, blocked, booked)
      - `booking_id` (uuid, foreign key, optional)
      - `blocked_reason` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for salon owners to manage their own data
    - Add policies for public to read available slots

  3. Functions
    - `generate_slots_for_period` - função para gerar slots automaticamente
    - `block_slot_by_user` - função para bloquear slot específico
    - `unblock_slot_by_user` - função para desbloquear slot específico
*/

-- Create working_hours table
CREATE TABLE IF NOT EXISTS working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_open boolean NOT NULL DEFAULT true,
  open_time time,
  close_time time,
  break_start time,
  break_end time,
  slot_duration integer DEFAULT 30 CHECK (slot_duration > 0),
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_working_hours_salon_id ON working_hours(salon_id);
CREATE INDEX IF NOT EXISTS idx_working_hours_day ON working_hours(day_of_week);

CREATE INDEX IF NOT EXISTS idx_slots_salon_date ON slots(salon_id, date);
CREATE INDEX IF NOT EXISTS idx_slots_status ON slots(status);
CREATE INDEX IF NOT EXISTS idx_slots_booking_id ON slots(booking_id);

-- Enable RLS
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for working_hours
CREATE POLICY "Salon owners can manage working hours"
  ON working_hours
  FOR ALL
  TO authenticated
  USING (salon_id IN (
    SELECT id FROM salons WHERE user_id = auth.uid()
  ))
  WITH CHECK (salon_id IN (
    SELECT id FROM salons WHERE user_id = auth.uid()
  ));

-- RLS Policies for slots
CREATE POLICY "Public can read available slots"
  ON slots
  FOR SELECT
  TO anon, authenticated
  USING (status = 'available');

CREATE POLICY "Salon owners can manage all slots"
  ON slots
  FOR ALL
  TO authenticated
  USING (salon_id IN (
    SELECT id FROM salons WHERE user_id = auth.uid()
  ))
  WITH CHECK (salon_id IN (
    SELECT id FROM salons WHERE user_id = auth.uid()
  ));

-- Create triggers for updated_at
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
  p_open_time time,
  p_close_time time,
  p_slot_duration integer,
  p_break_start time DEFAULT NULL,
  p_break_end time DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  current_date date;
  current_time time;
  day_of_week_num integer;
BEGIN
  -- Loop through each date in the period
  current_date := p_start_date;
  
  WHILE current_date <= p_end_date LOOP
    -- Get day of week (0 = Sunday, 6 = Saturday)
    day_of_week_num := EXTRACT(DOW FROM current_date);
    
    -- Skip Sundays (day 0) by default
    IF day_of_week_num != 0 THEN
      -- Generate slots for this date
      current_time := p_open_time;
      
      WHILE current_time < p_close_time LOOP
        -- Skip break time if specified
        IF p_break_start IS NOT NULL AND p_break_end IS NOT NULL THEN
          IF current_time >= p_break_start AND current_time < p_break_end THEN
            current_time := current_time + (p_slot_duration || ' minutes')::interval;
            CONTINUE;
          END IF;
        END IF;
        
        -- Insert slot if it doesn't exist
        INSERT INTO slots (salon_id, date, time_slot, status)
        VALUES (p_salon_id, current_date, current_time, 'available')
        ON CONFLICT (salon_id, date, time_slot) DO NOTHING;
        
        -- Move to next time slot
        current_time := current_time + (p_slot_duration || ' minutes')::interval;
      END LOOP;
    END IF;
    
    -- Move to next date
    current_date := current_date + interval '1 day';
  END LOOP;
END;
$$;

-- Function to block a specific slot
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
  user_salon_id uuid;
BEGIN
  -- Get the salon_id for the current user
  SELECT id INTO user_salon_id
  FROM salons
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  IF user_salon_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não possui salão associado';
  END IF;
  
  -- Update or insert the slot as blocked
  INSERT INTO slots (salon_id, date, time_slot, status, blocked_reason)
  VALUES (user_salon_id, p_date, p_time, 'blocked', p_reason)
  ON CONFLICT (salon_id, date, time_slot)
  DO UPDATE SET
    status = 'blocked',
    blocked_reason = p_reason,
    booking_id = NULL,
    updated_at = now();
END;
$$;

-- Function to unblock a specific slot
CREATE OR REPLACE FUNCTION unblock_slot_by_user(
  p_date date,
  p_time time
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_salon_id uuid;
BEGIN
  -- Get the salon_id for the current user
  SELECT id INTO user_salon_id
  FROM salons
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  IF user_salon_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não possui salão associado';
  END IF;
  
  -- Update the slot to available
  UPDATE slots
  SET
    status = 'available',
    blocked_reason = NULL,
    booking_id = NULL,
    updated_at = now()
  WHERE salon_id = user_salon_id
    AND date = p_date
    AND time_slot = p_time;
END;
$$;