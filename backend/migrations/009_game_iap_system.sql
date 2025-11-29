-- Game In-App Purchase System
-- Tables for lives, energy, power-ups, and consumables

-- User Game Wallet (Lives, Energy, Coins)
CREATE TABLE IF NOT EXISTS user_game_wallet (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  lives INTEGER DEFAULT 5 NOT NULL CHECK (lives >= 0),
  max_lives INTEGER DEFAULT 5 NOT NULL,
  energy INTEGER DEFAULT 100 NOT NULL CHECK (energy >= 0),
  max_energy INTEGER DEFAULT 100 NOT NULL,
  coins INTEGER DEFAULT 0 NOT NULL CHECK (coins >= 0),
  gems INTEGER DEFAULT 0 NOT NULL CHECK (gems >= 0),
  last_life_refill TIMESTAMPTZ DEFAULT NOW(),
  last_energy_refill TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_game_wallet_user_id ON user_game_wallet(user_id);

-- IAP Products Catalog
CREATE TABLE IF NOT EXISTS iap_products (
  id TEXT PRIMARY KEY, -- e.g., 'lives_5', 'energy_50', 'powerup_doubleXP'
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('lives', 'energy', 'coins', 'gems', 'powerup', 'bundle', 'booster')),
  value INTEGER NOT NULL, -- Quantity of resource granted
  price_usd DECIMAL(10, 2) NOT NULL,
  stripe_price_id TEXT, -- Stripe Price ID for payment
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  icon_url TEXT,
  badge TEXT, -- 'POPULAR', 'BEST VALUE', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_iap_products_type ON iap_products(type);
CREATE INDEX idx_iap_products_active ON iap_products(is_active);

-- User IAP Purchases History
CREATE TABLE IF NOT EXISTS user_iap_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  product_id TEXT REFERENCES iap_products(id) NOT NULL,
  quantity INTEGER DEFAULT 1 NOT NULL,
  amount_paid DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'usd' NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  refunded_at TIMESTAMPTZ
);

CREATE INDEX idx_user_iap_purchases_user_id ON user_iap_purchases(user_id);
CREATE INDEX idx_user_iap_purchases_product_id ON user_iap_purchases(product_id);
CREATE INDEX idx_user_iap_purchases_status ON user_iap_purchases(status);

-- User Power-ups Inventory
CREATE TABLE IF NOT EXISTS user_powerups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  powerup_type TEXT NOT NULL CHECK (powerup_type IN ('doubleXP', 'shieldProtection', 'bonusLife', 'energyBoost', 'hintReveal', 'timeFreeze')),
  quantity INTEGER DEFAULT 0 NOT NULL CHECK (quantity >= 0),
  expires_at TIMESTAMPTZ, -- NULL for permanent powerups
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, powerup_type)
);

CREATE INDEX idx_user_powerups_user_id ON user_powerups(user_id);
CREATE INDEX idx_user_powerups_expires ON user_powerups(expires_at);

-- User Energy/Lives Refill Transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'refill', 'spend', 'reward', 'refund')),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('lives', 'energy', 'coins', 'gems')),
  amount INTEGER NOT NULL, -- Can be negative for spending
  balance_after INTEGER NOT NULL,
  reason TEXT, -- 'Purchased Lives Pack', 'Daily Quest Reward', 'Used for game session'
  metadata JSONB, -- Store additional context
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(transaction_type);
CREATE INDEX idx_wallet_transactions_resource ON wallet_transactions(resource_type);
CREATE INDEX idx_wallet_transactions_created ON wallet_transactions(created_at DESC);

-- IAP Bundles (Special Offers)
CREATE TABLE IF NOT EXISTS iap_bundles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  contents JSONB NOT NULL, -- [{"type": "lives", "value": 10}, {"type": "energy", "value": 50}]
  price_usd DECIMAL(10, 2) NOT NULL,
  original_price_usd DECIMAL(10, 2), -- For showing discount
  stripe_price_id TEXT,
  is_active BOOLEAN DEFAULT true,
  is_limited_time BOOLEAN DEFAULT false,
  available_until TIMESTAMPTZ,
  display_order INTEGER DEFAULT 0,
  badge TEXT, -- 'LIMITED', '50% OFF', 'BEST VALUE'
  icon_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_iap_bundles_active ON iap_bundles(is_active);
CREATE INDEX idx_iap_bundles_available ON iap_bundles(available_until);

-- Insert Default IAP Products
INSERT INTO iap_products (id, name, description, type, value, price_usd, display_order, badge) VALUES
-- Lives
('lives_5', '5 Lives', 'Get 5 extra lives to keep learning', 'lives', 5, 0.99, 1, NULL),
('lives_10', '10 Lives', 'Get 10 extra lives', 'lives', 10, 1.99, 2, 'POPULAR'),
('lives_25', '25 Lives', 'Get 25 extra lives', 'lives', 25, 3.99, 3, 'BEST VALUE'),
('lives_unlimited', 'Unlimited Lives', '24 hours of unlimited lives', 'lives', 999, 4.99, 4, 'SPECIAL'),

-- Energy
('energy_50', '50 Energy', 'Refill 50 energy points', 'energy', 50, 0.99, 5, NULL),
('energy_100', '100 Energy', 'Refill 100 energy points', 'energy', 100, 1.99, 6, 'POPULAR'),
('energy_250', '250 Energy', 'Refill 250 energy points', 'energy', 250, 3.99, 7, 'BEST VALUE'),
('energy_unlimited', 'Unlimited Energy', '24 hours of unlimited energy', 'energy', 999, 4.99, 8, 'SPECIAL'),

-- Coins
('coins_100', '100 Coins', 'Get 100 learning coins', 'coins', 100, 0.99, 9, NULL),
('coins_500', '500 Coins', 'Get 500 learning coins', 'coins', 500, 4.99, 10, 'POPULAR'),
('coins_1000', '1000 Coins', 'Get 1000 learning coins', 'coins', 1000, 8.99, 11, 'BEST VALUE'),
('coins_2500', '2500 Coins', 'Get 2500 learning coins', 'coins', 2500, 19.99, 12, NULL),

-- Gems (Premium Currency)
('gems_10', '10 Gems', 'Get 10 premium gems', 'gems', 10, 0.99, 13, NULL),
('gems_50', '50 Gems', 'Get 50 premium gems', 'gems', 50, 4.99, 14, 'POPULAR'),
('gems_100', '100 Gems', 'Get 100 premium gems', 'gems', 100, 8.99, 15, 'BEST VALUE'),
('gems_250', '250 Gems', 'Get 250 premium gems', 'gems', 250, 19.99, 16, NULL),

-- Power-ups
('powerup_doubleXP', 'Double XP', '2x XP for 1 hour', 'powerup', 1, 1.99, 17, NULL),
('powerup_shield', 'Shield Protection', 'Protect from losing a life 3 times', 'powerup', 3, 2.99, 18, NULL),
('powerup_hint', 'Hint Reveals', 'Get 5 AI hints for difficult questions', 'powerup', 5, 1.99, 19, NULL),
('powerup_timeFreeze', 'Time Freeze', 'Pause timer for 3 challenges', 'powerup', 3, 2.99, 20, NULL);

-- Insert Starter Bundles
INSERT INTO iap_bundles (id, name, description, contents, price_usd, original_price_usd, display_order, badge) VALUES
('bundle_starter', 'Starter Pack', 'Perfect for new learners!', 
 '[{"type":"lives","value":10},{"type":"energy","value":100},{"type":"coins","value":200}]'::jsonb,
 4.99, 7.97, 1, 'BEST VALUE'),

('bundle_learner', 'Learner Pack', 'Everything you need for a week of learning',
 '[{"type":"lives","value":25},{"type":"energy","value":250},{"type":"coins","value":500},{"type":"gems","value":10}]'::jsonb,
 9.99, 15.96, 2, 'POPULAR'),

('bundle_master', 'Master Pack', 'Unlimited learning for serious students',
 '[{"type":"lives","value":999},{"type":"energy","value":999},{"type":"coins","value":1000},{"type":"gems","value":50}]'::jsonb,
 19.99, 34.95, 3, 'ULTIMATE');

-- Function to initialize game wallet for new users
CREATE OR REPLACE FUNCTION initialize_game_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_game_wallet (user_id, lives, energy, coins, gems)
  VALUES (NEW.id, 5, 100, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create wallet when user signs up
DROP TRIGGER IF EXISTS trigger_initialize_game_wallet ON user_profiles;
CREATE TRIGGER trigger_initialize_game_wallet
AFTER INSERT ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION initialize_game_wallet();

-- Function to refill lives over time (1 life every 30 minutes)
CREATE OR REPLACE FUNCTION refill_lives()
RETURNS void AS $$
BEGIN
  UPDATE user_game_wallet
  SET 
    lives = LEAST(max_lives, lives + FLOOR(EXTRACT(EPOCH FROM (NOW() - last_life_refill)) / 1800)::INTEGER),
    last_life_refill = NOW()
  WHERE lives < max_lives
    AND EXTRACT(EPOCH FROM (NOW() - last_life_refill)) >= 1800;
END;
$$ LANGUAGE plpgsql;

-- Function to refill energy over time (1 energy every 5 minutes)
CREATE OR REPLACE FUNCTION refill_energy()
RETURNS void AS $$
BEGIN
  UPDATE user_game_wallet
  SET 
    energy = LEAST(max_energy, energy + FLOOR(EXTRACT(EPOCH FROM (NOW() - last_energy_refill)) / 300)::INTEGER),
    last_energy_refill = NOW()
  WHERE energy < max_energy
    AND EXTRACT(EPOCH FROM (NOW() - last_energy_refill)) >= 300;
END;
$$ LANGUAGE plpgsql;

-- Views for analytics
CREATE OR REPLACE VIEW iap_revenue_summary AS
SELECT 
  DATE(purchased_at) as date,
  product_id,
  COUNT(*) as purchases_count,
  SUM(amount_paid) as total_revenue,
  AVG(amount_paid) as avg_purchase_value
FROM user_iap_purchases
WHERE status = 'completed'
GROUP BY DATE(purchased_at), product_id
ORDER BY date DESC, total_revenue DESC;

CREATE OR REPLACE VIEW top_spenders AS
SELECT 
  u.user_id,
  up.email,
  up.full_name,
  COUNT(*) as total_purchases,
  SUM(u.amount_paid) as lifetime_value,
  MAX(u.purchased_at) as last_purchase
FROM user_iap_purchases u
JOIN user_profiles up ON u.user_id = up.id
WHERE u.status = 'completed'
GROUP BY u.user_id, up.email, up.full_name
ORDER BY lifetime_value DESC
LIMIT 100;

COMMENT ON TABLE user_game_wallet IS 'Stores user game resources: lives, energy, coins, gems';
COMMENT ON TABLE iap_products IS 'Catalog of all in-app purchase products';
COMMENT ON TABLE user_iap_purchases IS 'History of all IAP purchases by users';
COMMENT ON TABLE user_powerups IS 'User inventory of power-ups and boosters';
COMMENT ON TABLE wallet_transactions IS 'Audit log of all wallet changes';
COMMENT ON TABLE iap_bundles IS 'Special bundle offers and limited-time deals';
