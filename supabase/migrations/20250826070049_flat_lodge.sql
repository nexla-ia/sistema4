/*
  # Create secure booking RPC function

  1. New Functions
    - `book_slot_and_create_booking` - Handles entire booking process with elevated privileges
  
  2. Security
    - Executes with SECURITY DEFINER (elevated privileges)
    - Bypasses RLS policies for slot updates
    - Maintains data integrity with transactions
  
  3. Features
    - Find or create customer
    - Create booking record
    - Update slot status atomically
    - Create booking services
    - Return complete booking data
*/

-- Create the secure booking function
CREATE OR REPLACE FUNCTION book_slot_and_create_booking(
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT DEFAULT NULL,
  p_booking_date DATE,
  p_booking_time TIME,
  p_service_ids UUID[],
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_salon_id UUID;
  v_customer_id UUID;
  v_booking_id UUID;
  v_slot_id UUID;
  v_service RECORD;
  v_total_price NUMERIC := 0;
  v_total_duration INTEGER := 0;
  v_result JSON;
BEGIN
  -- Get the first active salon
  SELECT id INTO v_salon_id
  FROM salons
  WHERE active = true
  LIMIT 1;
  
  IF v_salon_id IS NULL THEN
    RAISE EXCEPTION 'No active salon found';
  END IF;
  
  -- Find available slot
  SELECT id INTO v_slot_id
  FROM slots
  WHERE salon_id = v_salon_id
    AND date = p_booking_date
    AND time_slot = p_booking_time
    AND status = 'available'
  LIMIT 1;
  
  IF v_slot_id IS NULL THEN
    RAISE EXCEPTION 'Slot not available';
  END IF;
  
  -- Find or create customer
  SELECT id INTO v_customer_id
  FROM customers
  WHERE phone = p_customer_phone;
  
  IF v_customer_id IS NULL THEN
    INSERT INTO customers (name, phone, email)
    VALUES (p_customer_name, p_customer_phone, p_customer_email)
    RETURNING id INTO v_customer_id;
  END IF;
  
  -- Calculate totals from services
  FOR v_service IN
    SELECT * FROM services WHERE id = ANY(p_service_ids)
  LOOP
    v_total_price := v_total_price + v_service.price;
    v_total_duration := v_total_duration + v_service.duration_minutes;
  END LOOP;
  
  -- Create booking
  INSERT INTO bookings (
    salon_id,
    customer_id,
    booking_date,
    booking_time,
    status,
    total_price,
    total_duration_minutes,
    notes
  )
  VALUES (
    v_salon_id,
    v_customer_id,
    p_booking_date,
    p_booking_time,
    'confirmed',
    v_total_price,
    v_total_duration,
    p_notes
  )
  RETURNING id INTO v_booking_id;
  
  -- Update slot status (this bypasses RLS due to SECURITY DEFINER)
  UPDATE slots
  SET status = 'booked', booking_id = v_booking_id
  WHERE id = v_slot_id;
  
  -- Create booking services
  INSERT INTO booking_services (booking_id, service_id, price)
  SELECT v_booking_id, unnest(p_service_ids), s.price
  FROM services s
  WHERE s.id = ANY(p_service_ids);
  
  -- Return the created booking
  SELECT json_build_object(
    'id', b.id,
    'salon_id', b.salon_id,
    'customer_id', b.customer_id,
    'booking_date', b.booking_date,
    'booking_time', b.booking_time,
    'status', b.status,
    'total_price', b.total_price,
    'total_duration_minutes', b.total_duration_minutes,
    'notes', b.notes,
    'created_at', b.created_at
  ) INTO v_result
  FROM bookings b
  WHERE b.id = v_booking_id;
  
  RETURN v_result;
END;
$$;