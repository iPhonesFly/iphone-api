const express = require("express");
const sequelize = require("./src/config/database");
const User = require("./src/models/User");
const Iphone = require("./src/models/Iphone");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const port = 3000;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

io.on("connection", (socket) => {
  console.log("a user connected");
});

sequelize
  .sync({ alter: true }) // Cria/atualiza as tabelas no banco de dados
  .then(() => {
    httpServer.listen(port, () =>
      console.log(
        `Database connected successfully and app listening on port ${port}`
      )
    );
  })
  .catch((error) => {
    console.log(error.message);
  });
