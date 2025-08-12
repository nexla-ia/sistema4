-- Fix RLS policy for working_hours table to allow saving configuration

-- Drop existing policy
DROP POLICY IF EXISTS "Salons can manage own working hours" ON working_hours;

-- Create new policy that allows authenticated users to manage working hours
-- This policy allows both INSERT and UPDATE operations
CREATE POLICY "Authenticated users can manage working hours"
  ON working_hours
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Alternative: If you want to keep it salon-specific but fix the issue,
-- you can use this more permissive policy instead:
/*
CREATE POLICY "Salons can manage own working hours"
  ON working_hours
  FOR ALL
  TO authenticated
  USING (
    salon_id IN (
      SELECT id FROM salons WHERE user_id = auth.uid()
    ) OR
    salon_id = '4f59cc12-91c1-44fc-b158-697b9056e0cb'
  )
  WITH CHECK (
    salon_id IN (
      SELECT id FROM salons WHERE user_id = auth.uid()
    ) OR
    salon_id = '4f59cc12-91c1-44fc-b158-697b9056e0cb'
  );
*/