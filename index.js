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

  // Evento de buscar todos os iPhones
  socket.on('get-all-iphones', async () => {
    try {
      const iphones = await Iphone.findAll();
      socket.emit('all-iphones', iphones);
    } catch (error) {
      console.error("Error fetching iPhones:", error);
      socket.emit('error', 'Failed to fetch iPhones');
    }
  });

  // Evento de criar um novo iPhone - MELHORADO
  socket.on('create-iphone', async (data) => {
    try {
      const newIphone = await Iphone.create(data);
      
      // Notificar TODOS os clientes conectados (não apenas o que criou)
      io.emit('iphone-created', newIphone);
      
      // Opcional: também enviar a lista atualizada para todos
      const allIphones = await Iphone.findAll();
      io.emit('all-iphones', allIphones);
    } catch (error) {
      console.error("Error creating iPhone:", error);
      socket.emit('error', 'Failed to create iPhone');
    }
  });

  socket.on('update-iphone', async (data) => {
    try {
      console.log("✏️ Atualizando iPhone:", data.id, data);
      const { id, ...updateData } = data;
      
      // Verificar se o iPhone existe
      const iphone = await Iphone.findByPk(id);
      if (!iphone) {
        socket.emit('error', 'iPhone not found');
        return;
      }
      
      // Atualizar o iPhone
      await iphone.update(updateData);
      const updatedIphone = await Iphone.findByPk(id);
      
      // Notificar TODOS os clientes conectados
      io.emit('iphone-updated', updatedIphone);
      console.log("📢 iPhone atualizado notificado para todos os clientes:", id);
      
      // Enviar lista atualizada para todos
      const allIphones = await Iphone.findAll({
        order: [['id', 'ASC']]
      });
      io.emit('all-iphones', allIphones);
      
    } catch (error) {
      console.error("❌ Erro ao atualizar iPhone:", error);
      socket.emit('error', 'Failed to update iPhone');
    }
  });

  socket.on('delete-iphone', async (id) => {
    try {
      console.log("🗑️ Deletando iPhone:", id);
      
      // Verificar se o iPhone existe
      const iphone = await Iphone.findByPk(id);
      if (!iphone) {
        socket.emit('error', 'iPhone not found');
        return;
      }
      
      // Deletar o iPhone
      await iphone.destroy();
      
      // Notificar TODOS os clientes conectados
      io.emit('iphone-deleted', id);
      console.log("📢 iPhone deletado notificado para todos os clientes:", id);
      
      // Enviar lista atualizada para todos
      const allIphones = await Iphone.findAll({
        order: [['id', 'ASC']]
      });
      io.emit('all-iphones', allIphones);
      
    } catch (error) {
      console.error("❌ Erro ao deletar iPhone:", error);
      socket.emit('error', 'Failed to delete iPhone');
    }
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
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
