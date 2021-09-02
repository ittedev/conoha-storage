# conoha-storage

ConoHaオブジェクトストレージのためのnode.js製クライアントとコマンド

## インストール

```bash
npm install -g conoha-storage
```

node.jsはv15.0.0以上に対応しています。

## セットアップ

ConoHaオブジェクトストレージの情報を.envファイルに記載します。
[ConoHa API情報](https://manage.conoha.jp/API/)にログインして以下の例のように設定情報を記載します。

```
CONOHA_ENDPOINT=https://object-storage....
CONOHA_TENANTID=0e844...
CONOHA_USERNAME=gncu5...
CONOHA_PASSWORD=T3Zfo...
```

`auth`コマンドを実行して次のように出力されれば認証成功です。

```bash
$ conoha-storage auth
token  : 9b07a...
expires: 2021-...
```

## 使い方

### `auth`コマンド

認証を行い、トークンを発行します。

```bash
conoha-storage auth
```

### `list`コマンド

コンテナの一覧を取得します。

```bash
conoha-storage list
```

コンテナを指定することでそのコンテナ内のオブジェクト一覧を取得します。

```bash
conoha-storage list container
```

### `mkdir`コマンド

コンテナを追加します。

```bash
conoha-storage mkdir container
```

`--archive`オプションを使うことでバージョン管理用のコンテナを指定できます。

```bash
conoha-storage mkdir container --archive=archive_dir
```

### `put`コマンド

ローカルファイルをストレージにアップロードします。

```bash
conoha-storage put log.txt container/log.txt
```

ローカルファイルに`-`を指定することで標準入力から入力を受け付けます（Linuxのみ）。

```bash
echo 'hello' | conoha-storage put - container/log.txt
```

`put -`は省略できます。

```bash
echo 'hello' | conoha-storage container/log.txt
```

### `get`コマンド

ストレージからファイルをダウンロードします。

```bash
conoha-storage get container/log.txt log.txt
```

ローカルファイルに`-`を指定することでファイル内容を標準出力に出力します。

```bash
conoha-storage get container/log.txt -
```

`get -`には別の記法があります。

```bash
conoha-storage cat container/log.txt
```

### `studio`コマンド

管理用GUIサーバーを立ち上げます。

```bash
conoha-storage studio
```

### その他

その他の使い方は`conoha-storage --help`で確認できます。

## バックアップ例

MySQLのバックアップを行う例を記します。

予めバックアップ用のコンテナを準備しておきます。

```bash
conoha-storage mkdir backup --archive=backup_archive
```

`mysqldump`の出力をファイルに保存せずに直接ストレージに保存します。
ここでは`--delete-after`オプションで30日後に自動的に削除されるようにしています。

```
mysqldump -x -A | conoha-storage backup/backup.sql --delete-after=2592000
```

## 今後の開発予定

- CSV出力
- `list`コマンドに検索条件やページングを追加