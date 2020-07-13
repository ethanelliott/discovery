const PORT = 8888;
const db = require('diskdb');
const axios = require('axios');
const app = require('express')();
const bodyParser = require('body-parser')
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const TABLES = ['services'].map(e => e.toUpperCase());
db.connect('./', TABLES);
app.use(bodyParser.json());

const TYPES = {
    IP_ADDRESS: {
        regex: new RegExp('^((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])(\\.(?!$)|$)){4}$', 'g'),
        matches: []
    },
    PHONE_NUMBER: {
        regex: new RegExp('^(\\+\\d{1,2}\\s?)?1?\\-?\\.?\\s?\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}$', 'g'),
        matches: []
    }
};

const ROUTES = [
    {
        route: '/',
        method: 'get',
        action: (req, res) => {
            return res.json({
                name: 'Discovery Service',
                version: '0.0.1',
                description: 'Central repository for operating services, including tests to ensure services are running.'
            });
        }
    },
    {
        route: '/services',
        method: 'get',
        action: (req, res) => {
            return res.json(db.SERVICES.find());
        }
    },
    {
        route: '/match',
        method: 'get',
        urlParams: ['q'],
        action: (req, res) => {
            const q = req.query.q;
            const results = Object.keys(TYPES)
                .map(type => q.match(TYPES[type].regex) ? type : null)
                .filter(t => t !== null)
                .map(type => ({
                    type,
                    match_services: TYPES[type].matches.map(e => {
                        e.route = e.route.replace('%s', q);
                        return e;
                    })
                }));
            return res.json({q, results});
        }
    },
    {
        route: '/register',
        method: 'post',
        bodyParams: [],
        action: async (req, res) => {
            const info = req.body;
            console.log(info);
            const {data} = await axios.get(`${info.address}/test`);
            db.SERVICES.save(info);
            info.matcher.forEach(match => {
                if (TYPES[match.type]) {
                    TYPES[match.type].matches.push({
                        id: info._id,
                        route: `${info.address}${match.route}`
                    });
                } else {
                    console.log(`unknown type: ${match.type}`);
                }
            });
            console.log(`${info.name} has been registered!`);
            return res.json({success: data.success});

        }
    }
];

ROUTES.forEach(e => app[e.method](e.route, e.action));

http.listen(PORT, '0.0.0.0', () => {
    console.log(`Discovery Service Listening on ${PORT}`);
});

io.on('connection', (socket) => {
    socket.emit('register', {socketId: socket.id, remoteAddress: socket.request.connection.remoteAddress});
    socket.on('disconnect', (reason) => {
        console.log('service disconnected', socket.id, reason);
        const service = db.SERVICES.findOne({socketId: socket.id});
        db.SERVICES.remove({socketId: socket.id});
        Object.keys(TYPES).forEach(e => {
            TYPES[e].matches = TYPES[e].matches.filter(m => m.id !== service._id)
        })
    });
});

process.on('SIGINT', function () {
    console.log("Shutting down server...");
    TABLES.forEach(e => db[e].remove());
});
