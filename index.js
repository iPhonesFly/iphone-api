const express = require("express");
const sequelize = require("./src/config/database");
const User = require("./src/models/User");
const Iphone = require("./src/models/Iphone");
const Message = require("./src/models/Message");
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

// Armazenar usuários conectados no chat
const connectedUsers = new Map();

app.use(express.json());
app.use(express.static('public'));

app.get("/", (req, res) => {
  res.send("iPhone Fly API - Socket.IO & Chat enabled!");
});

// === ENDPOINTS REST PARA MENSAGENS ===

// Buscar histórico de mensagens
app.get("/api/messages", async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    const messages = await Message.findAndCountAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['timestamp', 'DESC']]
    });

    res.json({
      messages: messages.rows.reverse(), // Inverter para mostrar mais antigas primeiro
      total: messages.count,
      page: parseInt(page),
      totalPages: Math.ceil(messages.count / limit)
    });
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar mensagens de um usuário específico
app.get("/api/messages/user/:sender", async (req, res) => {
  try {
    const { sender } = req.params;
    const { limit = 50 } = req.query;

    const messages = await Message.findAll({
      where: { sender },
      limit: parseInt(limit),
      order: [['timestamp', 'DESC']]
    });

    res.json(messages.reverse());
  } catch (error) {
    console.error('Erro ao buscar mensagens do usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Estatísticas do chat
app.get("/api/chat/stats", async (req, res) => {
  try {
    const totalMessages = await Message.count();
    const userMessages = await Message.count({
      where: { messageType: 'user' }
    });
    const systemMessages = await Message.count({
      where: { messageType: 'system' }
    });

    // Usuários mais ativos
    const activeUsers = await Message.findAll({
      attributes: [
        'sender',
        [sequelize.fn('COUNT', sequelize.col('sender')), 'messageCount']
      ],
      where: { messageType: 'user' },
      group: ['sender'],
      order: [[sequelize.fn('COUNT', sequelize.col('sender')), 'DESC']],
      limit: 10
    });

    // Usuários online agora
    const onlineUsers = Array.from(connectedUsers.values());

    res.json({
      totalMessages,
      userMessages,
      systemMessages,
      activeUsers,
      onlineUsers,
      onlineCount: onlineUsers.length
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar mensagem (apenas para fins administrativos)
app.delete("/api/messages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCount = await Message.destroy({
      where: { id }
    });

    if (deletedCount) {
      // Notificar todos os clientes sobre a exclusão
      io.emit('message-deleted', { id });
      res.json({ message: 'Mensagem deletada com sucesso' });
    } else {
      res.status(404).json({ error: 'Mensagem não encontrada' });
    }
  } catch (error) {
    console.error('Erro ao deletar mensagem:', error);
    res.status(400).json({ error: 'Erro ao deletar mensagem' });
  }
});

io.on("connection", (socket) => {
  console.log("Usuario conectado:", socket.id);

  // === FUNCIONALIDADE CHAT ===
  
  // Usuário entra no chat
  socket.on('join-chat', async (userData) => {
    try {
      const { userName } = userData;
      
      // Armazenar dados do usuário
      connectedUsers.set(socket.id, {
        id: socket.id,
        name: userName,
        joinedAt: new Date()
      });

      // Criar mensagem de sistema para entrada
      const joinMessage = await Message.create({
        text: `${userName} entrou no chat! 👋`,
        sender: 'Sistema',
        messageType: 'system'
      });

      // Emitir mensagem de entrada para todos
      io.emit('new-message', {
        id: joinMessage.id,
        text: joinMessage.text,
        sender: joinMessage.sender,
        timestamp: joinMessage.timestamp,
        messageType: 'system'
      });

      // Enviar lista de usuários online para todos
      const onlineUsers = Array.from(connectedUsers.values());
      io.emit('users-online', {
        users: onlineUsers,
        count: onlineUsers.length
      });

      // Enviar histórico de mensagens para o usuário que acabou de entrar
      const recentMessages = await Message.findAll({
        limit: 50,
        order: [['timestamp', 'DESC']]
      });

      socket.emit('message-history', recentMessages.reverse());

    } catch (error) {
      console.error('Erro ao entrar no chat:', error);
      socket.emit('error', { message: 'Erro ao entrar no chat' });
    }
  });

  // Enviar mensagem
  socket.on('send-message', async (messageData) => {
    try {
      const { text, sender } = messageData;
      
      // Criar mensagem no banco
      const newMessage = await Message.create({
        text,
        sender,
        messageType: 'user'
      });

      // Emitir mensagem para todos os usuários conectados
      io.emit('new-message', {
        id: newMessage.id,
        text: newMessage.text,
        sender: newMessage.sender,
        timestamp: newMessage.timestamp,
        messageType: 'user'
      });

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      socket.emit('error', { message: 'Erro ao enviar mensagem' });
    }
  });

  // === FUNCIONALIDADE iPHONES ===

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

  socket.on("disconnect", async () => {
    try {
      const user = connectedUsers.get(socket.id);
      
      if (user) {
        // Criar mensagem de sistema para saída
        const leaveMessage = await Message.create({
          text: `${user.name} saiu do chat`,
          sender: 'Sistema',
          messageType: 'system'
        });

        // Emitir mensagem de saída para todos
        socket.broadcast.emit('new-message', {
          id: leaveMessage.id,
          text: leaveMessage.text,
          sender: leaveMessage.sender,
          timestamp: leaveMessage.timestamp,
          messageType: 'system'
        });

        // Remover usuário da lista
        connectedUsers.delete(socket.id);

        // Atualizar lista de usuários online
        const onlineUsers = Array.from(connectedUsers.values());
        socket.broadcast.emit('users-online', {
          users: onlineUsers,
          count: onlineUsers.length
        });
      }

      console.log("Usuario desconectado:", socket.id);
    } catch (error) {
      console.error('Erro ao processar desconexão:', error);
    }
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
