import http from "http";

export async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

export function isSvelteFile(file: string) {
  const fileParts = file.split(".");
  return fileParts[fileParts.length - 1] === "svelte" && fileParts.length == 2;
}

export function isFileParameters(file: string) {
  const fileParts = file.split(".");
  return fileParts[0][0] == "[" && fileParts[0][fileParts[0].length - 1] == "]";
}

export function listen({
  server,
  name = "server",
}: {
  server: http.Server;
  name: string;
}) {
  const addr = server.address();
  const bind =
    typeof addr === "string" ? "pipe " + addr : "http://localhost:" + addr.port;
  console.log(`Started ${name} on ` + bind);
}

export function error(err, port: number) {
	if (err.syscall !== 'listen') {
		throw error;
	}

	const bind = typeof port === 'string'
		? 'Pipe ' + port
		: 'Port ' + port;

	switch (err.code) {
		case 'EACCES':
			console.error(bind + ' requires elevated privileges');
			process.exit(1);
		case 'EADDRINUSE':
			console.error(bind + ' is already in use');
			process.exit(1);
		default:
			throw error;
	}
}

export function stop({
  server,
  name,
  callback,
}: {
  server: http.Server;
  name: string;
  callback?: Function;
}) {
  server.close();
  server.on("close", () => {
    console.log(`Stopped ${name} server`);
    if (callback) callback();
  });
}
