import express from "express";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import { Redis, publisher, subscriber } from "./redis-connection.js";

async function main() {
  const port = process.env.PORT || 8001;

  const app = express();
  const server = http.createServer(app);
  const state = {
    checkboxState: new Array(588).fill(false),
  };

  const io = new Server(server);

  //socket connections

  io.on("connection", (socket) => {
    socket.on("client:checkboxChange", (data) => {
      console.log(data);
      state.checkboxState[data.index] = data.isChecked;
      console.log(state.checkboxState[data.index]);
      io.emit("server:checkboxChange", data);
    });
  });

  //express
  app.use(express.static(path.resolve("./public")));
  app.get("/health", (req, res) => {
    res.send("Server is healthy");
  });

  app.get("/checkbox", (req, res) => {
    res.json(state.checkboxState);
  });

  server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

main();
