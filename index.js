const express = require("express");
const sequelize = require("./src/config/database");
const User = require("./src/models/User");
const Iphone = require("./src/models/Iphone");
const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

sequelize
  .sync({ alter: true }) // Cria/atualiza as tabelas no banco de dados
  .then(() => {
    app.listen(port, () =>
      console.log(
        `Database connected successfully and app listening on port ${port}`
      )
    );
  })
  .catch((error) => {
    console.log(error.message);
  });
