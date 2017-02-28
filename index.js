// Start the agent
require('@google/cloud-trace').start({
  samplingRate: 0,
  bufferSize: 1,
  logLevel: 4,
  enhancedDatabaseReporting: true
})

const _ = require('lodash')
const fork = require('child_process').fork
const Hapi = require('hapi')
const http = require('http')
const minimist = require('minimist')
const mongoose = require('mongoose')
const qs = require('qs')

// Process cmd line arguments
const args = (() => {
  let args = minimist(process.argv.slice(2))
  args = Object.keys(args).reduce((prev, curr) => {
    prev[_.camelCase(curr)] = args[curr]
    return prev
  }, {})
  return args
})()

const port = parseInt(args.port)
const lastPort = parseInt(args.lastPort)

async function main() {
  const server = new Hapi.Server()

  server.connection({
    port: port,
    host: 'localhost'
  })

  if (port < lastPort) {
    await new Promise(resolve => {
      const child = fork(
        '.',
        `--port ${port + 1} --last-port ${lastPort}`.split(' '),
        {}
      )
      // wait for child to emit 'ready' message
      child.on('message', (message) => {
        if (message === 'ready') {
          resolve()
        }
      })
    })

    server.route({
      method: 'GET',
      path: '/write',
      handler: (request, reply) => {
        http.get({
          host: 'localhost',
          port: port + 1,
          path: `/write${Object.keys(request.query).length > 0 ? `?${qs.stringify(request.query)}` : ''}`
        }, res => {
          let buffer = ''
          res.on('data', data => {
            buffer += data
          })
          res.on('end', () => {
            reply(`${port} ${buffer}`)
          })
        })
      }
    })

    server.route({
      method: 'GET',
      path: '/read',
      handler: (request, reply) => {
        http.get({
          host: 'localhost',
          port: port + 1,
          path: `/read`
        }, res => {
          let buffer = ''
          res.on('data', data => {
            buffer += data
          })
          res.on('end', () => {
            reply(buffer)
          })
        })
      }
    })
  } else {
    await new Promise(resolve => {
      mongoose.connect('mongodb://localhost/people3')
      const db = mongoose.connection
      db.once('open', () => {
        resolve()
      })
    })

    const personSchema = mongoose.Schema({
      name: String,
      purpose: String
    })

    const Person = mongoose.model('Person', personSchema)

    server.route({
      method: 'GET',
      path: '/write',
      handler: (request, reply) => {
        const person = new Person(qs.parse(request.query))
        new Promise((resolve, reject) => {
          person.save(err => {
            if (err) {
              reject()
            } else {
              resolve()
            }
          })
        }).then(() => {
          reply(`${port}`)
        }).catch(() => {
          reply(`error`)
        })
      }
    })

    server.route({
      method: 'GET',
      path: '/read',
      handler: (request, reply) => {
        Person.find((err, people) => {
          reply(JSON.stringify(people.map(person => ({ name: person.name, purpose: person.purpose }))))
        })
      }
    })
  }

  server.start(err => {
    if (err) {
      throw err
    }
    // tell parent that we're ready
    if (process.send) {
      process.send('ready')
    }
    console.log(`Server running at: ${server.info.uri}`)
  })
}

main()
