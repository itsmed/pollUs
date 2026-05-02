import app from '../app';
import debugLib from 'debug';
import http from 'node:http';

const debug = debugLib('server:server');

const port = normalizePort(process.env.PORT ?? '4000');
app.set('port', port);

const server = http.createServer(app);

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

function normalizePort(val: string): number | string | false {
  const portNum = Number.parseInt(val, 10);
  if (Number.isNaN(portNum)) return val;
  if (portNum >= 0) return portNum;
  return false;
}

function onError(error: NodeJS.ErrnoException): void {
  if (error.syscall !== 'listen') throw error;

  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

  switch (error.code) {
    case 'EACCES': {
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    }
    case 'EADDRINUSE': {
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    }
    default: {
      throw error;
    }
  }
}

function onListening(): void {
  const addr = server.address();
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr!.port}`;
  debug(`Listening on ${bind}`);
}
