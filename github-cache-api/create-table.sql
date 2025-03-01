-- GitHub Cache テーブルを作成するためのSQLスクリプト

-- テーブル作成
CREATE TABLE IF NOT EXISTS github_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  path TEXT NOT NULL,
  url TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL,
  last_accessed TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 検索用インデックス
CREATE INDEX IF NOT EXISTS github_cache_lookup_idx ON github_cache (owner, repo, path, content_type);

-- 最近アクセスされたファイルを素早く見つけるためのインデックス
CREATE INDEX IF NOT EXISTS github_cache_last_accessed_idx ON github_cache (last_accessed DESC);

-- 説明コメント
COMMENT ON TABLE github_cache IS 'GitHub APIからのレスポンスをキャッシュするテーブル';
COMMENT ON COLUMN github_cache.id IS 'レコードの一意識別子';
COMMENT ON COLUMN github_cache.created_at IS 'レコードが作成された日時';
COMMENT ON COLUMN github_cache.owner IS 'GitHubのリポジトリ所有者';
COMMENT ON COLUMN github_cache.repo IS 'GitHubのリポジトリ名';
COMMENT ON COLUMN github_cache.path IS 'ファイルまたはディレクトリのパス';
COMMENT ON COLUMN github_cache.url IS 'GitHubのURL';
COMMENT ON COLUMN github_cache.content IS 'API応答の内容（ファイルの内容またはディレクトリ構造のJSON）';
COMMENT ON COLUMN github_cache.content_type IS 'コンテンツのタイプ（file または directory）';
COMMENT ON COLUMN github_cache.last_accessed IS '最後にアクセスされた日時';

-- RLS (Row Level Security) ポリシー
-- すべてのユーザーに読み取りアクセスを許可し、サービスロールのみが書き込み可能
ALTER TABLE github_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON github_cache
    FOR SELECT
    USING (true);

CREATE POLICY "Enable write access for service role only" ON github_cache
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable update access for service role only" ON github_cache
    FOR UPDATE
    USING (auth.role() = 'service_role'); 