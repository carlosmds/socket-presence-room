const app = require('express')();
const logger = require('pino')();
const redis = require('redis');
const fs = require('fs');

const { parsed : env } = require('dotenv').config();

const log = logger.child({ level: env.LOG_LEVEL || 'info', prettyPrint: true });

const server = require('https').createServer({
    key: fs.readFileSync(env.SSL_KEY),
    cert: fs.readFileSync(env.SSL_CERTIFICATE),
    ca: fs.readFileSync(env.SSL_CA),
}, app);

const io = require('socket.io')(server);

const redisClient = redis.createClient({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    no_ready_check: true,
    auth_pass: env.REDIS_PASSWORD
});

const randomColor = require('randomcolor');

redisClient.on('connect', () => {   
    log.info("Redis connected");
}); 

redisClient.on('error', (err) => {
    log.error("Error " + err)
});

io.on('connection', socket => {

    let userData = socket.handshake.query;

    let user = { 
        id: userData.id,
        name: userData.name,
        room: userData.room,
        color: randomColor({
            luminosity: 'bright',
            hue: 'random'
        })
    };    

    log.debug(user, 'User connected');

    setRedisAndBroadcastConnectedUser(socket, user);
    sendPreviousConnectedUsers(socket, user);

    handleSocketEvents(socket, user);
});

function handleSocketEvents(socket, user)
{
    socket.on('userConnected', connectedUser => {
        setRedisAndBroadcastConnectedUser(socket, connectedUser);
    });

    socket.on('disconnect', () => {
        deleteRedisAndBroadcastDeletedUser(socket, user);
    });
}

async function sendPreviousConnectedUsers(socket, user)
{
    log.debug(user, 'Sending previous connected users to user');

    let previousConnectedUsers = await getPreviousConnectedUsers(user);

    socket.emit('previousConnectedUsers', {
        users: previousConnectedUsers,
        connectedUser: user
    });
}

function setRedisAndBroadcastConnectedUser(socket, user)
{
    log.debug(user, 'User connected');
    redisClient.set(`rooms:${user.room}:users:${user.id}`, JSON.stringify(user));
    socket.broadcast.emit('userConnected', user);
}

function deleteRedisAndBroadcastDeletedUser(socket, user)
{
    log.debug(user, 'User disconnected');
    redisClient.del(`rooms:${user.room}:users:${user.id}`);
    socket.broadcast.emit('userDisconnected', user);
}

function getPreviousConnectedUsers(user)
{
    return new Promise((resolve) => {
        redisClient.keys(`rooms:${user.room}:users:*`, function(err, keys) {  
            redisClient.mget(keys, function(err, users) {
                connectedUsers = users.map(user => JSON.parse(user));
                resolve(connectedUsers);
            });
        });
    });
}

server.listen(env.PORT, () => {
    log.info('Server running on port %d', env.PORT);
});

process.on('SIGINT', () => {
    log.info( "Shutting down from SIGINT (Ctrl-C)");
    process.exit(1);
});
