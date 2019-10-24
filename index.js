const express = require("express");
const http = require("http");
let port = 8081;
const app = new express();
const server = http.createServer(app);
app.all("/*", express.static("samples"));
console.log(`http server: http://localhost:${port}`);
server.listen(port);
