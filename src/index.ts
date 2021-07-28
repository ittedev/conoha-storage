import fs from 'fs'
// import { pipeline, PassThrough } from 'stream'
import { finished, pipeline } from 'stream/promises'
import got from 'got'
import { Got } from 'got/dist/source/types'
import { Progress } from 'got/dist/source'

export interface ConohaStorageConfig {
  endpoint: string
  tenantId: string
  username: string
  password: string
}

export interface ConohaToken {
  id: string
  expires?: string
　[prop: string]: any
}

export class ConohaStorage {
  private client: Got
  private config: ConohaStorageConfig
  private token: ConohaToken

  constructor (config: ConohaStorageConfig) {
    this.config = config
    this.client = got.extend({
      prefixUrl: this.config.endpoint
    })
  }

  async auth(token?: ConohaToken | string) {
    const strageUrl = new URL(this.config.endpoint)
    const identityEndpoint = `${strageUrl.origin.replace('object-storage', 'identity')}/v2.0/tokens`
    const data = await got.post(identityEndpoint, {
      json: {
        auth: {
          tenantId: this.config.tenantId,
          passwordCredentials: {
            username: this.config.username,
            password: this.config.password
          }
        }
      }
    }).json() as { access: { token: ConohaToken } }

    // console.log(data)
    this.token = data.access.token as ConohaToken

    this.client = got.extend({
      headers: { 'X-Auth-Token': this.token.id }
    }, this.client)
  }

  async list(container: string = '') {
    return await this.client.get(container).json()
  }

  async mkdir(container: string, options: any) {
    if (options.archive) {
      await this.client.put(options.archive)
      await this.client.put(container, {
        headers: {
          'X-Versions-Location': options.archive,
          'X-Auth-Token': this.token.id
        }
      })
    } else {
      await this.client.put(container)
    }
  }

  async rmdir(container: string) {
    return await this.client.delete(container)
  }

  async delete(conoha_object: string) {
    return await this.client.delete(conoha_object)
  }

  async put(localFile: string, remoteObject: string, options: any = {}, loading?: (progress: Progress) => void, error?: (error: Error) => void) {

    // エラーが発生した後もuploadProgressイベントが発生するのを防ぐ
    const loadingCallback = (progress: Progress) => loading(progress)
    const errorCallback = (e: Error) => {
      loading = () => {}
      error(e)
    }

    const stream = this.client.stream.put(remoteObject)
    if (loading) stream.on('uploadProgress', loadingCallback)
    if (error) stream.on('error', errorCallback)

    const source = localFile === '-' ? process.stdin : fs.createReadStream(localFile)
    await pipeline(
      source,
      stream
    )

    if (options.deleteAfter) {
      await this.client.post(remoteObject, {
        headers: {
          'X-Delete-After': options.deleteAfter,
          'X-Auth-Token': this.token.id
        }
      })
    }
  }

  async get(source: string, localFile?: string, loading?: (progress: Progress) => void, error?: (error: Error) => void) {
    if (localFile) {
      const stream = this.client.stream(source)
      if (loading) stream.on('downloadProgress', loading)
      if (error) stream.on('error', error)

      const target = localFile === '-' ? process.stdout : fs.createWriteStream(localFile)
      await pipeline(
        stream,
        target
      )
    } else {
      return this.client.get(source)
    }
  }
}