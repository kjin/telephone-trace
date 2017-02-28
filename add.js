const http = require('http')
const minimist = require('minimist')
const qs = require('qs')

const args = minimist(process.argv.slice(2))

async function request(path) {
  return await new Promise((resolve, reject) => {
    http.get({
      host: 'localhost',
      port: 3000,
      path: path
    }, (res) => {
      let buffer = ''
      res.on('err', () => {
        reject()
      })
      res.on('data', data => {
        buffer += data
      })
      res.on('end', () => {
        resolve(buffer)
      })
    })
  })
}

async function main() {
  await request(`/write?${qs.stringify(args)}`)
  const all = await request('/read')
  console.log(JSON.parse(all))
}

main()
