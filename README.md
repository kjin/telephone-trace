Spawns a chain of Hapi servers that each listen on one of a range of port numbers.

Except for the last server, each server relays `/write?name={name}&purpose={purpose}` and `/read` requests to the next one.

The last server interfaces with a MongoDB server. `/write` requests write to this DB, while `/read` requests read all of its data.

```bash
# Each of servers listening on ports 3000 - 3007 relays requests to the server
# listening on the smallest port higher than that of itself.
# The server on port 3008 reads and writes data to a MongoDB server
# (sold separately).
$ node index.js --port 3000 --last-port 3008
```

You can interface with this through the barebones `node add.js`. It sends a `/write` query to port 3000 and then a `/read` one.

For example:

```bash
# Makes a request to http://localhost:3000/write?name=peepa&purpose=walking%20the%20dogs
# then prints the results of http://localhost:3000/read
$ node add.js --name peepa --purpose "walking the dogs"
```

Currently accepting PR's for GUI clients.
