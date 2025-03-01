# GitHub Cache テーブル作成方法

GitHub APIのレート制限に対応するためのキャッシュテーブルをSupabaseに作成するための手順です。

## テーブル作成手順

1. Supabaseのダッシュボードにログインします。
2. 「Table Editor」セクションに移動します。
3. 「Create a new table」をクリックします。
4. 以下の設定でテーブルを作成します:

**テーブル名**: `github_cache`

**列**:
- `id` (type: uuid, primary key, default: `uuid_generate_v4()`)
- `created_at` (type: timestamp with time zone, default: `now()`)
- `owner` (type: text, not null)
- `repo` (type: text, not null)
- `path` (type: text, not null)
- `url` (type: text, not null)
- `content` (type: text, not null)
- `content_type` (type: text, not null)
- `last_accessed` (type: timestamp with time zone, default: `now()`)

**RLS (Row Level Security)**: 必要に応じて設定

## REST API経由での作成方法

以下のcURLコマンドを使用して、REST API経由でテーブルを作成することもできます:

```bash
curl -X POST 'https://YOUR_SUPABASE_URL/rest/v1/rpc/create_table' \
-H "apikey: YOUR_SUPABASE_API_KEY" \
-H "Authorization: Bearer YOUR_SUPABASE_API_KEY" \
-H "Content-Type: application/json" \
-d '{
  "table_name": "github_cache",
  "columns": [
    {
      "name": "id",
      "type": "uuid",
      "is_primary": true,
      "default_value": "uuid_generate_v4()"
    },
    {
      "name": "created_at",
      "type": "timestamp with time zone",
      "default_value": "now()"
    },
    {
      "name": "owner",
      "type": "text",
      "is_nullable": false
    },
    {
      "name": "repo",
      "type": "text",
      "is_nullable": false
    },
    {
      "name": "path",
      "type": "text",
      "is_nullable": false
    },
    {
      "name": "url",
      "type": "text",
      "is_nullable": false
    },
    {
      "name": "content",
      "type": "text",
      "is_nullable": false
    },
    {
      "name": "content_type",
      "type": "text",
      "is_nullable": false
    },
    {
      "name": "last_accessed",
      "type": "timestamp with time zone",
      "default_value": "now()"
    }
  ]
}'
```

> 注意: 実際にREST APIでテーブルを作成するには、カスタム関数を定義する必要があります。上記のコマンドは一例であり、実際のSupabase環境に合わせて調整が必要です。

## インデックスの作成

効率的なクエリのために、以下のようなインデックスの作成をお勧めします:

```sql
-- 主要検索クエリのためのインデックス
CREATE INDEX github_cache_lookup_idx ON github_cache (owner, repo, path, content_type);

-- 最近アクセスされたファイルを見つけるためのインデックス
CREATE INDEX github_cache_last_accessed_idx ON github_cache (last_accessed DESC);
```

## テーブルの利用方法

このテーブルは次のように利用されます:

1. GitHub APIからコードを取得する際、まずキャッシュを確認します。
2. キャッシュにヒットした場合、そのデータを使用します。
3. キャッシュにヒットしなかった場合、GitHub APIからデータを取得し、キャッシュに保存します。
4. GitHub APIのレート制限に達した場合、キャッシュからランダムにデータを取得します。 