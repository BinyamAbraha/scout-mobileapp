-- Multi-Source API Integration Schema Migration
-- This migration adds support for tracking venues from multiple data sources

-- 1. Add multi-source tracking columns to venues table
ALTER TABLE venues ADD COLUMN IF NOT EXISTS data_quality_score DECIMAL(3,2) DEFAULT 0.5;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS last_verified TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE venues ADD COLUMN IF NOT EXISTS external_ids JSONB DEFAULT '{}';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS source_specific_data JSONB DEFAULT '{}';

-- 2. Create venue_data_sources table for tracking data sources per venue
CREATE TABLE IF NOT EXISTS venue_data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0.5,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT venue_data_sources_source_check 
    CHECK (source IN ('yelp', 'openstreetmap', 'foursquare', 'google_places', 'nyc_api', 'sf_api', 'la_api', 'internal')),
  CONSTRAINT venue_data_sources_confidence_check 
    CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT venue_data_sources_unique_venue_source 
    UNIQUE(venue_id, source)
);

-- 3. Create venue_mappings table for cross-API venue deduplication
CREATE TABLE IF NOT EXISTS venue_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  mapped_venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0.5,
  matching_fields TEXT[] DEFAULT '{}',
  conflicting_fields TEXT[] DEFAULT '{}',
  suggested_merge JSONB DEFAULT '{}',
  mapping_source TEXT NOT NULL DEFAULT 'automatic',
  is_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT venue_mappings_confidence_check 
    CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT venue_mappings_no_self_mapping 
    CHECK (primary_venue_id != mapped_venue_id),
  CONSTRAINT venue_mappings_source_check 
    CHECK (mapping_source IN ('automatic', 'manual', 'ml_algorithm')),
  CONSTRAINT venue_mappings_unique_mapping 
    UNIQUE(primary_venue_id, mapped_venue_id)
);

-- 4. Create api_sync_operations table for tracking sync operations
CREATE TABLE IF NOT EXISTS api_sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  records_processed INTEGER DEFAULT 0,
  records_success INTEGER DEFAULT 0,
  records_error INTEGER DEFAULT 0,
  errors TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Constraints
  CONSTRAINT api_sync_operations_source_check 
    CHECK (source IN ('yelp', 'openstreetmap', 'foursquare', 'google_places', 'nyc_api', 'sf_api', 'la_api', 'internal')),
  CONSTRAINT api_sync_operations_type_check 
    CHECK (operation_type IN ('full', 'incremental', 'venue_details')),
  CONSTRAINT api_sync_operations_status_check 
    CHECK (status IN ('pending', 'running', 'completed', 'failed'))
);

-- 5. Create api_health_status table for monitoring API health
CREATE TABLE IF NOT EXISTS api_health_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL UNIQUE,
  is_healthy BOOLEAN DEFAULT true,
  last_successful_call TIMESTAMP WITH TIME ZONE,
  last_failed_call TIMESTAMP WITH TIME ZONE,
  error_rate DECIMAL(3,2) DEFAULT 0,
  avg_response_time INTEGER DEFAULT 0,
  consecutive_failures INTEGER DEFAULT 0,
  circuit_breaker_state TEXT DEFAULT 'closed',
  circuit_breaker_last_failure TIMESTAMP WITH TIME ZONE,
  circuit_breaker_next_retry TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT api_health_status_source_check 
    CHECK (source IN ('yelp', 'openstreetmap', 'foursquare', 'google_places', 'nyc_api', 'sf_api', 'la_api', 'internal')),
  CONSTRAINT api_health_status_error_rate_check 
    CHECK (error_rate >= 0 AND error_rate <= 1),
  CONSTRAINT api_health_status_circuit_breaker_check 
    CHECK (circuit_breaker_state IN ('closed', 'open', 'half-open'))
);

-- 6. Create raw_venue_data table for storing original API responses
CREATE TABLE IF NOT EXISTS raw_venue_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL,
  source TEXT NOT NULL,
  venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
  raw_data JSONB NOT NULL,
  processed_data JSONB,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  is_processed BOOLEAN DEFAULT false,
  processing_errors TEXT[] DEFAULT '{}',
  
  -- Constraints
  CONSTRAINT raw_venue_data_source_check 
    CHECK (source IN ('yelp', 'openstreetmap', 'foursquare', 'google_places', 'nyc_api', 'sf_api', 'la_api', 'internal')),
  CONSTRAINT raw_venue_data_unique_external_source 
    UNIQUE(external_id, source)
);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_venues_data_quality_score ON venues(data_quality_score);
CREATE INDEX IF NOT EXISTS idx_venues_last_verified ON venues(last_verified);
CREATE INDEX IF NOT EXISTS idx_venues_external_ids_gin ON venues USING GIN(external_ids);

CREATE INDEX IF NOT EXISTS idx_venue_data_sources_venue_id ON venue_data_sources(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_data_sources_source ON venue_data_sources(source);
CREATE INDEX IF NOT EXISTS idx_venue_data_sources_confidence ON venue_data_sources(confidence);
CREATE INDEX IF NOT EXISTS idx_venue_data_sources_active ON venue_data_sources(is_active);

CREATE INDEX IF NOT EXISTS idx_venue_mappings_primary_venue ON venue_mappings(primary_venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_mappings_mapped_venue ON venue_mappings(mapped_venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_mappings_confidence ON venue_mappings(confidence);
CREATE INDEX IF NOT EXISTS idx_venue_mappings_confirmed ON venue_mappings(is_confirmed);

CREATE INDEX IF NOT EXISTS idx_api_sync_operations_source ON api_sync_operations(source);
CREATE INDEX IF NOT EXISTS idx_api_sync_operations_status ON api_sync_operations(status);
CREATE INDEX IF NOT EXISTS idx_api_sync_operations_started_at ON api_sync_operations(started_at);

CREATE INDEX IF NOT EXISTS idx_api_health_status_source ON api_health_status(source);
CREATE INDEX IF NOT EXISTS idx_api_health_status_healthy ON api_health_status(is_healthy);

CREATE INDEX IF NOT EXISTS idx_raw_venue_data_source ON raw_venue_data(source);
CREATE INDEX IF NOT EXISTS idx_raw_venue_data_venue_id ON raw_venue_data(venue_id);
CREATE INDEX IF NOT EXISTS idx_raw_venue_data_processed ON raw_venue_data(is_processed);
CREATE INDEX IF NOT EXISTS idx_raw_venue_data_fetched_at ON raw_venue_data(fetched_at);
CREATE INDEX IF NOT EXISTS idx_raw_venue_data_gin ON raw_venue_data USING GIN(raw_data);

-- 8. Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_venue_data_sources_updated_at 
  BEFORE UPDATE ON venue_data_sources 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venue_mappings_updated_at 
  BEFORE UPDATE ON venue_mappings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_health_status_updated_at 
  BEFORE UPDATE ON api_health_status 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 9. Insert initial API health status records
INSERT INTO api_health_status (source) VALUES 
  ('yelp'),
  ('openstreetmap'),
  ('foursquare'),
  ('google_places'),
  ('nyc_api'),
  ('sf_api'),
  ('la_api'),
  ('internal')
ON CONFLICT (source) DO NOTHING;

-- 10. Create helper functions for data quality scoring
CREATE OR REPLACE FUNCTION calculate_venue_data_quality_score(venue_uuid UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  quality_score DECIMAL(3,2) := 0;
  venue_record RECORD;
  source_count INTEGER := 0;
  avg_confidence DECIMAL(3,2) := 0;
BEGIN
  -- Get venue record
  SELECT * INTO venue_record FROM venues WHERE id = venue_uuid;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Base score from completeness of data
  quality_score := 0.3; -- Base score
  
  -- Add points for having required fields
  IF venue_record.name IS NOT NULL AND LENGTH(venue_record.name) > 0 THEN
    quality_score := quality_score + 0.1;
  END IF;
  
  IF venue_record.address IS NOT NULL AND LENGTH(venue_record.address) > 0 THEN
    quality_score := quality_score + 0.1;
  END IF;
  
  IF venue_record.coordinates IS NOT NULL THEN
    quality_score := quality_score + 0.1;
  END IF;
  
  IF venue_record.rating IS NOT NULL AND venue_record.rating > 0 THEN
    quality_score := quality_score + 0.1;
  END IF;
  
  IF venue_record.phone IS NOT NULL AND LENGTH(venue_record.phone) > 0 THEN
    quality_score := quality_score + 0.05;
  END IF;
  
  IF venue_record.website IS NOT NULL AND LENGTH(venue_record.website) > 0 THEN
    quality_score := quality_score + 0.05;
  END IF;
  
  -- Add points based on number of data sources and their confidence
  SELECT COUNT(*), AVG(confidence) 
  INTO source_count, avg_confidence 
  FROM venue_data_sources 
  WHERE venue_id = venue_uuid AND is_active = true;
  
  -- Bonus for multiple sources
  IF source_count > 1 THEN
    quality_score := quality_score + (source_count - 1) * 0.05;
  END IF;
  
  -- Weight by average confidence
  quality_score := quality_score * COALESCE(avg_confidence, 0.5);
  
  -- Ensure score is between 0 and 1
  quality_score := GREATEST(0, LEAST(1, quality_score));
  
  RETURN quality_score;
END;
$$ LANGUAGE plpgsql;

-- 11. Create view for venues with source information
CREATE OR REPLACE VIEW venues_with_sources AS
SELECT 
  v.*,
  array_agg(vds.source ORDER BY vds.confidence DESC) as data_sources,
  array_agg(vds.confidence ORDER BY vds.confidence DESC) as source_confidences,
  COUNT(vds.source) as source_count,
  AVG(vds.confidence) as avg_confidence
FROM venues v
LEFT JOIN venue_data_sources vds ON v.id = vds.venue_id AND vds.is_active = true
GROUP BY v.id;

-- 12. Create function to find potential venue duplicates
CREATE OR REPLACE FUNCTION find_potential_venue_duplicates(
  venue_name TEXT,
  venue_lat DECIMAL,
  venue_lng DECIMAL,
  distance_threshold_meters INTEGER DEFAULT 100
)
RETURNS TABLE(
  venue_id UUID,
  name TEXT,
  distance_meters DECIMAL,
  name_similarity DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.name,
    ST_Distance(
      ST_Point(venue_lng, venue_lat)::geography,
      ST_Point((v.coordinates->>'lng')::DECIMAL, (v.coordinates->>'lat')::DECIMAL)::geography
    ) as distance_meters,
    similarity(venue_name, v.name) as name_similarity
  FROM venues v
  WHERE 
    v.coordinates IS NOT NULL AND
    ST_DWithin(
      ST_Point(venue_lng, venue_lat)::geography,
      ST_Point((v.coordinates->>'lng')::DECIMAL, (v.coordinates->>'lat')::DECIMAL)::geography,
      distance_threshold_meters
    ) AND
    similarity(venue_name, v.name) > 0.6
  ORDER BY distance_meters ASC, name_similarity DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON MIGRATION IS 'Multi-Source API Integration Schema - Adds support for tracking venues from multiple data sources with deduplication, quality scoring, and health monitoring';