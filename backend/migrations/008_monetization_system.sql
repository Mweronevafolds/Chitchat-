-- Monetization System Tables
-- Creates tables for subscriptions, IAP, usage tracking, and creator earnings

-- User Subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'plus', 'pro', 'team')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  expires_at TIMESTAMPTZ NOT NULL,
  next_billing_date TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);

-- Subscription Payment Intents
CREATE TABLE IF NOT EXISTS subscription_intents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  tier TEXT NOT NULL,
  billing_cycle TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_intent_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_subscription_intents_user_id ON subscription_intents(user_id);
CREATE INDEX idx_subscription_intents_payment_intent_id ON subscription_intents(payment_intent_id);

-- In-App Purchases
CREATE TABLE IF NOT EXISTS iap_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  iap_id TEXT NOT NULL,
  iap_type TEXT NOT NULL CHECK (iap_type IN ('credits', 'storage', 'subscription')),
  amount DECIMAL(10, 2) NOT NULL,
  value INTEGER, -- credits amount, storage GB, or NULL for lifetime
  payment_intent_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_iap_purchases_user_id ON iap_purchases(user_id);
CREATE INDEX idx_iap_purchases_status ON iap_purchases(status);

-- AI Credits Balance
CREATE TABLE IF NOT EXISTS ai_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_credits_user_id ON ai_credits(user_id);

-- Usage Tracking
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  usage_type TEXT NOT NULL CHECK (usage_type IN ('messages', 'storage', 'ai_calls', 'paths')),
  date DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  bytes_used BIGINT, -- for storage tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, usage_type, date)
);

CREATE INDEX idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX idx_usage_tracking_date ON usage_tracking(date);
CREATE INDEX idx_usage_tracking_type ON usage_tracking(usage_type);

-- Content Purchases (for creator economy)
CREATE TABLE IF NOT EXISTS content_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('path', 'course', 'tutoring')),
  content_id UUID NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  platform_fee DECIMAL(10, 2) NOT NULL,
  creator_earnings DECIMAL(10, 2) NOT NULL,
  payment_intent_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_purchases_buyer_id ON content_purchases(buyer_id);
CREATE INDEX idx_content_purchases_creator_id ON content_purchases(creator_id);
CREATE INDEX idx_content_purchases_status ON content_purchases(status);

-- Creator Payouts
CREATE TABLE IF NOT EXISTS creator_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('paypal', 'stripe', 'bank_transfer', 'crypto')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  stripe_transfer_id TEXT,
  paypal_batch_id TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX idx_creator_payouts_creator_id ON creator_payouts(creator_id);
CREATE INDEX idx_creator_payouts_status ON creator_payouts(status);

-- Content Ratings (for creator analytics)
CREATE TABLE IF NOT EXISTS content_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_type, content_id)
);

CREATE INDEX idx_content_ratings_creator_id ON content_ratings(creator_id);
CREATE INDEX idx_content_ratings_content ON content_ratings(content_type, content_id);

-- Add creator tier to user profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'creator_tier'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN creator_tier TEXT CHECK (creator_tier IN ('free', 'plus', 'pro', 'team'));
  END IF;
END $$;

-- Function to update usage tracking
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_usage_type TEXT,
  p_count INTEGER DEFAULT 1,
  p_bytes BIGINT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO usage_tracking (user_id, usage_type, date, count, bytes_used)
  VALUES (p_user_id, p_usage_type, CURRENT_DATE, p_count, p_bytes)
  ON CONFLICT (user_id, usage_type, date)
  DO UPDATE SET
    count = usage_tracking.count + p_count,
    bytes_used = COALESCE(p_bytes, usage_tracking.bytes_used),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to check daily usage limit
CREATE OR REPLACE FUNCTION check_daily_limit(
  p_user_id UUID,
  p_usage_type TEXT,
  p_limit INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COALESCE(count, 0) INTO v_count
  FROM usage_tracking
  WHERE user_id = p_user_id
    AND usage_type = p_usage_type
    AND date = CURRENT_DATE;
  
  RETURN v_count < p_limit;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON user_subscriptions TO service_role;
GRANT ALL ON subscription_intents TO service_role;
GRANT ALL ON iap_purchases TO service_role;
GRANT ALL ON ai_credits TO service_role;
GRANT ALL ON usage_tracking TO service_role;
GRANT ALL ON content_purchases TO service_role;
GRANT ALL ON creator_payouts TO service_role;
GRANT ALL ON content_ratings TO service_role;

-- Comments
COMMENT ON TABLE user_subscriptions IS 'Stores user subscription tiers and billing information';
COMMENT ON TABLE subscription_intents IS 'Tracks subscription payment intents from Stripe';
COMMENT ON TABLE iap_purchases IS 'Records in-app purchases for credits, storage, etc.';
COMMENT ON TABLE ai_credits IS 'Tracks AI credit balance for pay-as-you-go users';
COMMENT ON TABLE usage_tracking IS 'Daily usage tracking for enforcing tier limits';
COMMENT ON TABLE content_purchases IS 'Records purchases of creator content for revenue sharing';
COMMENT ON TABLE creator_payouts IS 'Tracks payout requests and processing for creators';
COMMENT ON TABLE content_ratings IS 'Stores ratings and reviews for creator content';
