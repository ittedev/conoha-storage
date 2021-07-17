import dotenv from 'dotenv'
import fs from 'fs'
import { Command } from 'commander';
import { ConohaStorage, ConohaStorageConfig } from './'

dotenv.config()
const program = new Command()
const packageDefs = require('../package.json')
const config: ConohaStorageConfig = {
  endpoint: process.env.CONOHA_ENDPOINT || '',
  tenantId: process.env.CONOHA_TENANTID || '',
  username: process.env.CONOHA_USERNAME || '',
  password: process.env.CONOHA_PASSWORD || ''
}

const createStorate = async (config: ConohaStorageConfig, options: any): Promise<ConohaStorage> => {
  const storage = new ConohaStorage(config)
  if (options.auth) {
    await storage.auth()
  }
  return storage
}

// スペース埋め
const pad = (value: string, width: number, isLeft: boolean = false): string =>
  isLeft ?
    (value + ' '.repeat(width)).slice(0, width) :
    (' '.repeat(width) + value).slice(-width)

program
  .name('conoha-storage')
  .usage('[options] [sub command] [args...]')
  .version(`conoha-storage ── Version ${packageDefs.version} ──`, '-v, -V, --version', 'バージョンを表示します。')
  .helpOption('', 'conoha-storageの使い方を表示します。')
  .addHelpText('before', `conoha-storage ── Version ${packageDefs.version} ──

  ConoHaオブジェクトストレージのための管理コマンドです。
  使用する前に.envファイルにCONOHA_ENDPOINT, CONOHA_TENANTID, CONOHA_USERNAME, CONOHA_PASSWORDを設定してください。
  設定情報が不明な場合や、認証が上手く行かない場合は下記のURLからConoHaにログインして設定情報を確認してください。
  https://manage.conoha.jp/API/

  詳しい使い方は下記URLを参照してください。
  https://github.com/ittedev/conoha-storage
  `)

program
  .option('--archive <container>', 'コンテナ追加の際にアーカイブ用のコンテナを指定します。')
  .option('--no-auth', '認証なしにストレージにアクセスします。')
  .option('-s, --silent', 'コンソールに結果を出力しません。')
  .option('--delete-after <secound>', 'オブジェクト追加の際に何秒後に削除するか追加します。')

  // mysqldump -x -B test_db | ts-node ./src/cli.ts test_dir/mydump --delete-after=60
program
  .argument('<remote_object>', 'サブコマンドを指定しない場合は標準入力をオブジェクトに追加します。\n（Windowsはサポートされません）')
  .action(async (remoteObject: string) => {
    const options = program.opts()
    const storage = await createStorate(config, options)
    await storage.put('-', remoteObject, options)
  })

program
  .command('list')
  .alias('ls')
  .argument('[container]')
  .description('コンテナ/オブジェクトの一覧を表示します。')
  .action(async (container: string = '') => {
    try {
      const options = program.opts();

      const storage = await createStorate(config, options)
      const data = await storage.list(container) as any

      // リスト表示
      const headers = container ? ['name', 'bytes', 'last_modified', 'hash'] : ['name', 'count', 'bytes']
      const widths = []
      for (const header of headers) {
        widths.push(Math.max(header.length + 2, Math.min(30, data.reduce((num, item) => Math.max(num, item[header].toString().length), 0))))
      }
      console.log()
      console.log(headers.map((header, index) => ` ${pad(header, widths[index], index === 0)} `).join('   '))
      console.log(headers.map((header, index) => '─'.repeat(widths[index]+2)).join('───'))
      for (const item of data) {
        console.log(headers.map((header, index) => ` ${pad(item[header], widths[index], index === 0)} `).join('   '))
      }
      console.log()
    } catch(error) {
      console.log(error.message)
    }
  })

program
  .command('mkdir')
  .argument('<container>')
  .description('コンテナを新しく作成します。')
  .action(async (container: string) => {
    const options = program.opts();
    const storage = await createStorate(config, options)
    await storage.mkdir(container, options)
  })

program
  .command('rmdir')
  .argument('<container>')
  .description('コンテナを削除します。')
  .action(async (container: string) => {
    const options = program.opts();
    const storage = await createStorate(config, options)
    await storage.rmdir(container)
  })

program
  .command('put')
  .arguments('<local_file> <remote_target>')
  .description('オブジェクトを追加します。')
  .action(async ( localFile: string, remoteObject: string ) => {
    const options = program.opts();
    const storage = await createStorate(config, options)
    const size = localFile === '-' ? 0 : fs.statSync(localFile).size
    await storage.put(localFile, remoteObject, options,
    progress => {
      if (size !== 0 && !options.silent) {
        process.stdout.write(`\r${localFile} ${pad((Math.round(progress.transferred * 1000 / size) / 10).toFixed(), 5)}%`)
      }
    },
    error => {
      if (!options.silent) {
        process.stdout.write(`\r${error.message}`)
      }
    })
    if (size !== 0 && !options.silent) {
      console.log()
    }
  })

program
  .command('get')
  .arguments('<remote_source> [target]')
  .description('オブジェクトを取得します。')
  .action(async ( remote_source: string, local_file: string ) => {
    const options = program.opts();
    const storage = await createStorate(config, options)
    await storage.get(remote_source, local_file, progress => {
      if (!options.silent) {
        process.stdout.write(`\r${remote_source}  ${pad((Math.round(progress.percent * 1000) / 10).toFixed(1), 5)}%`)
      }
    }, error => {
      if (!options.silent) {
        process.stdout.write(`\r${error.message}`)
      }
    })
  })

program
  .command('cat')
  .argument('<remote_object>')
  .description('オブジェクトを標準出力に表示します。\n（Windowsはサポートされません）')
  .action(async ( remoteObject: string ) => {
    const options = program.opts();
    const storage = await createStorate(config, options)
    await storage.get(remoteObject, '-')
  })

program
  .command('delete')
  .arguments('<remote_object>')
  .description('オブジェクトを削除します。')
  .action(async (remote_object: string) => {
    const options = program.opts();
    const storage = await createStorate(config, options)
    await storage.delete(remote_object)
  })

program
  .parse(process.argv)