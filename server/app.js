const db = require('diskdb');
const axios = require('axios');
const app = require('express')();
const bodyParser = require('body-parser')
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const TABLES = ['connections', 'services'].map(e => e.toUpperCase());
db.connect('./', TABLES);
const PORT = 8888;

app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.json({root: '/'});
});

app.get('/connections', (req, res) => {
    const conn = db.CONNECTIONS.find();
    res.json(conn);
});

app.get('/services', (req, res) => {
    const services = db.SERVICES.find();
    res.json(services);
});

app.post('/register', async (req, res) => {
    const info = req.body;
    db.SERVICES.save(info);
    const {data} = await axios.get(`${info.address}/test`);
    console.log('test response', data);
    return res.json({success: false});
});

io.on('connection', (socket) => {
    console.log('new service connected', socket.id);
    socket.emit('register', {id: socket.id});
    socket.on('register', (data) => {
        db.CONNECTIONS.save({
            id: socket.id,
            address: data.address
        });
    });
    socket.on('disconnect', (reason) => {
        console.log('socket disconnected', socket.id, reason);
        db.CONNECTIONS.remove({id: socket.id});
    });
});

http.listen(PORT, '0.0.0.0', () => {
    console.log(`Discovery Service Listening on ${PORT}`);
});

process.on('SIGINT', function() {
    console.log("Shutting down server...");
    db.CONNECTIONS.remove();
    db.SERVICES.remove();
});

/*
Client starts, connects to server via socket for 'alive' status
use http req to register itself on the server, server tests connection and confirms addition
server adds client to db of available services
all routes are visible, as well as regex for things it can handle
 */
