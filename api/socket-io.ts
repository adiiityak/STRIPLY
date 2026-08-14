import { createServer } from 'node:http';
import { attachRoomSocketServer } from '../server/roomSocket';

// Vercel deploys files under api/ as Functions. Exporting the HTTP server lets
// the platform route /api/socket-io/socket.io to this function. Vercel strips
// the function prefix before handing the upgrade to Socket.IO, whose internal
// path remains the standard /socket.io.
const server = createServer();
attachRoomSocketServer(server);

export default server;
