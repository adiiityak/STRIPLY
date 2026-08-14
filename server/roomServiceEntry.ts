import { createRoomHttpServer } from './roomServer';

const { server } = createRoomHttpServer();

// Vercel detects the HTTP server from this listen() call at module startup, so it
// must run in production too. The port only matters locally: on Vercel the platform
// routes to the server over an internal port and this one is never exposed.
//
// Deliberately no default export. This is an http.Server, not a request handler, so
// exporting it as the module default is the shape that made the old api/socket-io.ts
// function crash with FUNCTION_INVOCATION_FAILED.
const port = Number(process.env.PORT) || 3001;
server.listen(port, '0.0.0.0', () => {
  console.log(`Room service listening on port ${port}`);
});
