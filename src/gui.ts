import net from 'net'
import http from 'http'
import path from 'path'
import dayjs from 'dayjs'
import { Towait, TowaitTemplate } from 'towait'
import { ConohaStorage } from '.'

const html = `
<!DOCTYPE html>
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="shortcut icon" href="/favicon.ico" type="image/vnd.microsoft.ico"/>
<title>conoha-storage</title>
<style>
* {
  box-sizing: border-box;
}
html {
  font-size: 14px;
  line-height: 1.4;
}
body {
  margin: 0;
  display: flex;
}
a {
  text-decoration: none;
}
input, button {
  vertical-align: middle;
  margin-left: .5rem;
}
.sidebar {
  border-right: 1px solid #e0e0e0;
  min-width: 14rem;
  padding: 1rem;
  min-height: 100vh;
}
.sidebar a {
  display: table;
  width: 100%;
  margin-bottom: .5em;
}
.sidebar a:first-child {
  margin-bottom: 1em;
}
.sidebar a span {
  display: table-cell;
}
.sidebar a span:last-child {
  width: 1.4rem;
  text-align: center;
  color: black;
  background: #e0e0e0;
  border-radius: 1em;
}
main {
  padding: 1rem;
  min-width: 30rem;
}
.actions{
  margin-bottom: .5rem;
}
.actions *{
  display: inline-block;
  margin-left: .5rem;
}
.actions span:first-child{
  margin-right: 1rem;
}
table th {
  background: #e0e0e0;
  font-weight: normal;
}
table tr:nth-child(2n) td {
  background: #f3f3f3;
}
table td {
  padding: .2em .5em;
  min-width: 7em;
}
table td:nth-child(1) {
  min-width: 0;
}
table td:nth-child(2) {
  min-width: 16rem;
}
table td.r {
  text-align: right;
}
.preview {
  border-left: .5rem solid #e0e0e0;
  min-height: 100vh;
  font-size: 0;
  position: sticky;
  top: 0;
}
.preview .status-bar{
  width: 100%;
  height: 1.5rem;
  font-size: 1rem;
  padding: .25rem 1rem;
}
.preview .status-bar span{
  color: grey;
}
.preview iframe{
  width: 100%;
  height: calc(100vh - 2rem);
}
.hide {
  visibility: hidden !important;
}
</style>

<body>
  <div class="sidebar">
    <a href="/">
      <span>/</span>
      <span>{| containers.length |> locale |}</span>
    </a>
    ::: for item in containers
    <a href="/{| item.name |}">
      <span>{| item.name |}</span>
      <span>{| item.count |> locale |}</span>
    </a>
    ::: end
  </div>

::: if page === 'Index'
  <main>
    <h2>
      <input type="text" class="container">
      <button>mkdir</button>
    </h2>
  </main>
::: end

::: if page === 'Files'
  <main class="files">
    ::: if data.length
    <h2>/{| container.name |}</h2>
    ::: else
    <h2>/{| container.name |}<button>rmdir</button></h2>
    ::: end

    <div class="actions">
      <span>All: {| data.length |}</span>
      <span class="file-action hide"></span>
      <button class="file-action hide">delete</button>
    </div>

    ::: if data.length
    <table>
      <thead>
        <th><input type="checkbox"></th>
        <th><b>name</b></th>
        <th>bytes</th>
        <th>last_modified</th>
      </thead>
      <tbody>
        ::: for item in data
        <tr>
          <td><input type="checkbox" data-object="{| container.name |}/{| item.name |}"></td>
          <td><b><a class="view" data-url="/{| container.name |}/{| item.name |}" href="javascript:void(0)">{| item.name |}</a></b></td>
          <td class="r">{| item.bytes |> locale |}</td>
          <td>{| item.last_modified |> date |}</td>
        </tr>
        ::: end
      </tbody>
    </table>
    ::: end
  </main>

  <div>
    <div class="preview">
      <div class="status-bar">
        <span>Preview area</span>
      </div>
      <iframe src="" frameborder="0"></iframe>
    </div>
  </div>
::: end

</body>

<script>
document.addEventListener('click', event => {
  const action = (url, data) => fetch('/mkdir', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (event.target.tagName === 'BUTTON') {
    switch (event.target.innerHTML) {
      case 'mkdir':
        if (document.querySelector('.container').value) {
          action('/mkdir', {
            container: document.querySelector('.container').value,
            options: { archive: false }
          }).then(() => location.reload())
        }
        break

      ::: if page === 'Files'
      case 'delete':
        const objects = []
        document.querySelectorAll('.files td input:checked').forEach(element => {
          objects.push(element.dataset.object)
        })
        action('/delete', { objects }).then(() => location.reload())
        break

      case 'rmdir':
        action('/rmdir', { container: '{| container.name |}' }).then(() => location.replace('/'))
        break
      ::: end
    }
  }
})

::: if page === 'Files'
document.querySelector('.files').addEventListener('click', event => {
  if (event.target.classList.contains('view')) {
    document.querySelector('.preview .status-bar span').innerHTML = \`{| process.env.CONOHA_ENDPOINT |}\${event.target.dataset.url}\`
    document.querySelector('.preview iframe').src = event.target.dataset.url
  }
})

document.addEventListener('change', event => {
  if (event.target.tagName === 'INPUT') {
    if (event.target.parentNode.tagName === 'TH') {
      document.querySelectorAll('.files td input').forEach(element => {
        element.checked = event.target.checked
      })
    }
    var count = document.querySelectorAll('.files td input:checked').length
    document.querySelector('.files th input').checked = count === document.querySelectorAll('.files td input').length
    if (count) {
      document.querySelector('span.file-action').innerHTML = \`Selected: \${count.toLocaleString()}\`
      document.querySelectorAll('.file-action').forEach(element => element.classList.remove('hide'))
    } else {
      document.querySelectorAll('.file-action').forEach(element => element.classList.add('hide'))
    }
  }
})
::: end
</script>
`

export class ConohaStorageServer {
  server: net.Server
  storage: ConohaStorage
  template: TowaitTemplate

  constructor (storage: ConohaStorage) {
    this.storage = storage
    this.server = http.createServer(this.listener())

    const root = path.join(__dirname, '..', 'templates')

    const towait = new Towait({ root })
    towait.let('locale', n => n.toLocaleString())
    towait.let('date', d => dayjs(d).format('YYYY-MM-DD HH:mm:ss'))
    this.template = towait.compile(html)
  }

  listen (port: number) {
    this.server.listen(port)
  }

  close() {
    this.server.close()
  }

  get listening(): boolean {
    return this.server.listening
  }

  listener() {
    return async (request: http.IncomingMessage, response: http.ServerResponse) => {
      const data: any = { request, process }
      const url = request.url

      if (request.method === 'GET') {
        if ('/favicon.ico' === url) {
          return response.writeHead(404).end()
        }

        data.containers = await this.storage.list() as any
        switch (true) {
          case '/' === url:
            data.page = 'Index'
            break
          case /^\/[^\/]+\/?$/.test(url):
            const containerName = url.split('/')[1]
            data.container = data.containers.find(container => container.name === containerName)
            if (data.container) {
              data.data = await this.storage.list(containerName) as any
              data.page = 'Files'
            } else {
              data.page = '404'
            }
            break
          case /^\/[^\/]+\/.+?$/.test(url):
            const res = await this.storage.get(url.slice(1))
            return response.end(res.body)
          default:
            break
        }
        response.end(this.template.render(data))

      } else {
        const body = []
        request.on('data', chunk => body.push(chunk))
        request.on('end', async () => {
          const data = JSON.parse(body.join())
          console.log(url, data)
          switch (url) {
            case '/mkdir':
              await this.storage.mkdir(data.container, data.options)
              break
            case '/rmdir':
              await this.storage.rmdir(data.container)
              break
            case '/delete':
              for (const obj of data.objects) {
                await this.storage.delete(obj)
              }
              break
          }

          response.end()
        })
      }
    }
  }
}