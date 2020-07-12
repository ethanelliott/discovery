const PORT = 3000;
const DISCOVERY_ADDRESS = 'http://localhost:8888';
const app = require('express')();
const http = require('http').createServer(app);
const socket = require('socket.io-client')(DISCOVERY_ADDRESS);
const axios = require('axios');

const METADATA = {
    address: `http://localhost:${PORT}`,
    name: 'Test Service',
    description: 'This is a test description of the service!',
    colour: '#ff0000',
    matcher: [
        {
            type: 'IP_ADDRESS',
            route: '/api/echo?q=%s'
        }
    ]
};

const ROUTES = [
    {
        route: '/api/echo',
        method: 'get',
        name: 'EchoParam',
        description: 'echos the ip address sent to it.',
        urlParams: ['q'],
        hidden: false,
        action: (req, res) => {
            const ip = req.query.q;
            return res.json({ip});
        }
    }
];

ROUTES.push({
    route: '/test',
    method: 'get',
    name: 'Test',
    description: 'Test route for the discovery service.',
    hidden: true,
    action: (req, res) => res.json({success: true})
});

ROUTES.forEach(e => app[e.method](e.route, e.action));

http.listen(PORT, '0.0.0.0', () => {
    console.log(`${METADATA.name} listening on ${PORT}`);
});

socket.on('register', async ({socketId}) => {
    await axios.post(`${DISCOVERY_ADDRESS}/register`, {
        ...METADATA,
        socketId,
        routes: ROUTES.filter(e => !e.hidden).map(({method, route, name, description, urlParams}) => ({
            method,
            route,
            urlParams,
            name,
            description
        }))
    });
});
