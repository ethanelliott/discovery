const PORT = 3000;
const DISCOVERY_ADDRESS = 'http://localhost:8888';
const app =  require('express')();
const http = require('http').createServer(app);
const socket = require('socket.io-client')(DISCOVERY_ADDRESS);
const axios = require('axios');

const ROUTES = [
    {
        route: '/api/hello',
        method: 'get',
        action: (req, res) => {
            console.log('saying hello');
            return res.json({message: 'Hello!'});
        }
    }
];

// super easy route making
ROUTES.forEach(e => app[e.method](e.route, e.action));

socket.on('connect', () => {
    console.log('connected to discovery');
});

socket.on('register', (data) => {
    axios.post(`${DISCOVERY_ADDRESS}/register`, {
        address: `http://localhost:${PORT}`,
        name: 'Test',
        description: 'This is a test description of the service!',
        colour: '#ff0000',
        routes: ROUTES.map(({method, route}) => ({method, route}))
    }).then(({ data }) => {
        console.log(data);
    }).catch(console.error);
   socket.emit('register', {
       id: data.id,
       address: `http://localhost:${PORT}`
   });
});

socket.on('disconnect', () => {
    console.log('disconnected from discovery');
});

app.get('/test', (req, res) => {
    res.json({response: 200});
});

http.listen(PORT, '0.0.0.0', () => {
    console.log(`Test Service listening on ${PORT}`);
});
