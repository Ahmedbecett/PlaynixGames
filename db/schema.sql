-- ============================================================================
-- Playnix database schema.
-- Portable by design: TEXT / INTEGER / REAL only, ISO-8601 UTC timestamps as
-- TEXT, booleans as INTEGER (0/1), UUID-style TEXT primary keys.
-- Runs unchanged on SQLite (development) and PostgreSQL (production).
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id                TEXT PRIMARY KEY,
  telegram_id       TEXT NOT NULL UNIQUE,
  username          TEXT,
  first_name        TEXT,
  last_name         TEXT,
  photo_url         TEXT,
  language          TEXT NOT NULL DEFAULT 'en',
  role              TEXT NOT NULL DEFAULT 'user',
  status            TEXT NOT NULL DEFAULT 'active',
  suspended_reason  TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  last_seen_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at);

CREATE TABLE IF NOT EXISTS categories (
  id               TEXT PRIMARY KEY,
  slug             TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  name_ar          TEXT,
  name_fr          TEXT,
  description      TEXT,
  description_ar   TEXT,
  description_fr   TEXT,
  icon             TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS games (
  id                  TEXT PRIMARY KEY,
  title               TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  short_description   TEXT,
  description         TEXT,
  cover_url           TEXT,
  developer           TEXT,
  publisher           TEXT,
  category_id         TEXT REFERENCES categories(id) ON DELETE SET NULL,
  game_url            TEXT,
  game_type           TEXT NOT NULL DEFAULT 'html5',
  source              TEXT,
  license             TEXT,
  pricing_type        TEXT NOT NULL DEFAULT 'free',
  publication_status  TEXT NOT NULL DEFAULT 'draft',
  featured            INTEGER NOT NULL DEFAULT 0,
  released_at         TEXT,
  supported_devices   TEXT,
  controls            TEXT,
  languages           TEXT,
  orientation         TEXT,
  play_count          INTEGER NOT NULL DEFAULT 0,
  rating_avg          REAL NOT NULL DEFAULT 0,
  rating_count        INTEGER NOT NULL DEFAULT 0,
  search_text         TEXT,
  verified_at         TEXT,
  created_by          TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  published_at        TEXT
);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(publication_status);
CREATE INDEX IF NOT EXISTS idx_games_category ON games(category_id);
CREATE INDEX IF NOT EXISTS idx_games_pricing ON games(pricing_type);
CREATE INDEX IF NOT EXISTS idx_games_featured ON games(featured);
CREATE INDEX IF NOT EXISTS idx_games_popularity ON games(play_count);
CREATE INDEX IF NOT EXISTS idx_games_published_at ON games(published_at);

CREATE TABLE IF NOT EXISTS game_images (
  id          TEXT PRIMARY KEY,
  game_id     TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  image_type  TEXT NOT NULL DEFAULT 'screenshot',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_game_images_game ON game_images(game_id);

CREATE TABLE IF NOT EXISTS favorites (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id     TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  UNIQUE (user_id, game_id)
);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

CREATE TABLE IF NOT EXISTS play_history (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id     TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  started_at  TEXT NOT NULL,
  ended_at    TEXT,
  duration    INTEGER NOT NULL DEFAULT 0,
  source      TEXT
);
CREATE INDEX IF NOT EXISTS idx_play_history_user ON play_history(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_play_history_game ON play_history(game_id);

CREATE TABLE IF NOT EXISTS reviews (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id      TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  rating       INTEGER NOT NULL,
  review_text  TEXT,
  status       TEXT NOT NULL DEFAULT 'published',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  UNIQUE (user_id, game_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_game ON reviews(game_id, status);

CREATE TABLE IF NOT EXISTS plans (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  name_ar        TEXT,
  name_fr        TEXT,
  description    TEXT,
  price          INTEGER NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'XTR',
  duration_days  INTEGER NOT NULL,
  features       TEXT,
  status         TEXT NOT NULL DEFAULT 'active',
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id      TEXT REFERENCES plans(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'active',
  started_at   TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  canceled_at  TEXT,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id, status);

CREATE TABLE IF NOT EXISTS payments (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id             TEXT REFERENCES plans(id) ON DELETE SET NULL,
  provider            TEXT NOT NULL DEFAULT 'telegram_stars',
  transaction_id      TEXT NOT NULL UNIQUE,
  payload             TEXT,
  amount              INTEGER NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'XTR',
  status              TEXT NOT NULL DEFAULT 'pending',
  raw_payload         TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

CREATE TABLE IF NOT EXISTS game_reports (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id      TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  reason       TEXT NOT NULL,
  details      TEXT,
  status       TEXT NOT NULL DEFAULT 'open',
  created_at   TEXT NOT NULL,
  resolved_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON game_reports(status);

CREATE TABLE IF NOT EXISTS admin_logs (
  id           TEXT PRIMARY KEY,
  admin_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,
  entity_type  TEXT,
  entity_id    TEXT,
  metadata     TEXT,
  ip           TEXT,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at);

CREATE TABLE IF NOT EXISTS banners (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  subtitle    TEXT,
  image_url   TEXT,
  cta_label   TEXT,
  cta_url     TEXT,
  game_id     TEXT REFERENCES games(id) ON DELETE SET NULL,
  badge       TEXT,
  active      INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS announcements (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  locale      TEXT NOT NULL DEFAULT 'en',
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  body        TEXT,
  url         TEXT,
  audience    TEXT NOT NULL DEFAULT 'all',
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_notification_reads (
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_id  TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  read_at          TEXT NOT NULL,
  PRIMARY KEY (user_id, notification_id)
);

CREATE TABLE IF NOT EXISTS ad_placements (
  id          TEXT PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  enabled     INTEGER NOT NULL DEFAULT 0,
  image_url   TEXT,
  target_url  TEXT,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ad_campaigns (
  id            TEXT PRIMARY KEY,
  game_id       TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft',
  budget_stars  INTEGER NOT NULL DEFAULT 0,
  spent_stars   INTEGER NOT NULL DEFAULT 0,
  starts_at     TEXT,
  ends_at       TEXT,
  impressions   INTEGER NOT NULL DEFAULT 0,
  clicks        INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS search_queries (
  id             TEXT PRIMARY KEY,
  user_id        TEXT REFERENCES users(id) ON DELETE SET NULL,
  query          TEXT NOT NULL,
  results_count  INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_search_queries_created ON search_queries(created_at);

CREATE TABLE IF NOT EXISTS game_suggestions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  url         TEXT,
  note        TEXT,
  status      TEXT NOT NULL DEFAULT 'new',
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS telegram_updates (
  update_id    TEXT PRIMARY KEY,
  processed_at TEXT NOT NULL
);
