/*
  # Create reviews table

  1. New Tables
    - `reviews`
      - `id` (uuid, primary key)
      - `salon_id` (uuid, foreign key to salons)
      - `customer_name` (text, required)
      - `customer_identifier` (text, required - phone or email for uniqueness)
      - `rating` (integer, 1-5 stars)
      - `comment` (text, required)
      - `approved` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `reviews` table
    - Add policy for public to create reviews
    - Add policy for public to read approved reviews
    - Add policy for salon owners to manage their reviews

  3. Indexes
    - Index on salon_id for faster queries
    - Index on approved status
    - Index on rating for analytics
    - Unique index on salon_id + customer_identifier to prevent duplicate reviews

  4. Constraints
    - Rating must be between 1 and 5
    - Prevent duplicate reviews from same customer
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
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_salon_id ON reviews(salon_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(approved);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- Create unique constraint to prevent duplicate reviews from same customer
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_customer 
ON reviews(salon_id, customer_identifier);

-- Enable Row Level Security
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Public can create reviews
CREATE POLICY "Public can create reviews"
  ON reviews
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Public can read approved reviews
CREATE POLICY "Public can read approved reviews"
  ON reviews
  FOR SELECT
  TO anon, authenticated
  USING (approved = true);

-- Policy: Salons can manage own reviews
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

-- Create trigger function for updating updated_at
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();