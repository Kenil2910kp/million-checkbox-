import express from "express";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import { Redis, publisher, subscriber } from "./redis-connection.js";
import { channel } from "diagnostics_channel";

async function main() {
  const port = process.env.PORT || 8001;

  const app = express();
  const server = http.createServer(app);
  const checkbox_state_key = "ckeckbox-v1";
  const checkbox_count = 588;
  const state = {
    checkboxState: new Array(588).fill(false),
  };

  const io = new Server(server);

  await subscriber.subscribe("internal-server:checkbox-change");

  subscriber.on("message", (channel, message) => {
    if (channel === "internal-server:checkbox-change") {
      const { index, isChecked } = JSON.parse(message);
      io.emit("server:checkboxChange", { index, isChecked });
    }
  });

  //socket connections

  io.on("connection", (socket) => {
    socket.on("client:checkboxChange", async (data) => {
      state.checkboxState[data.index] = data.isChecked;
      const existing_state = await Redis.get(
        checkbox_state_key,
        JSON.stringify
      );
      const redis_data = JSON.parse(existing_state);
      redis_data[data.index] = data.isChecked;
      Redis.set(checkbox_state_key, JSON.stringify(redis_data));

      //   io.emit("server:checkboxChange", data);
      await publisher.publish(
        "internal-server:checkbox-change",
        JSON.stringify(data)
      );
    });
  });

  //express
  app.use(express.static(path.resolve("./public")));
  app.get("/health", (req, res) => {
    res.send("Server is healthy");
  });

  app.get("/checkbox", async (req, res) => {
    const existing_state = await Redis.get(checkbox_state_key);
    if (existing_state) {
      return res.json(JSON.parse(existing_state));
    }
    const initialState = new Array(checkbox_count).fill(false);

    await Redis.set(checkbox_state_key, JSON.stringify(initialState));

    return res.json(initialState);
  });

  server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

main();
