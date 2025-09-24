# Integração do Chat com Frontend React

## Como adaptar seu componente FloatingChat para trabalhar com a API

### 1. Instalação do Socket.IO no Frontend

```bash
npm install socket.io-client
```

### 2. Configuração do Socket.IO no seu componente React

Substitua as simulações pelo código real do Socket.IO:

```typescript
import { io, Socket } from 'socket.io-client';

// No início do componente, adicione:
const [socket, setSocket] = useState<Socket | null>(null);

// Substitua o useEffect de simulação por:
useEffect(() => {
  // Inicializar socket
  const newSocket = io('http://localhost:3000'); // Substitua pela URL da sua API
  setSocket(newSocket);

  // Status da conexão
  newSocket.on('connect', () => {
    console.log('Conectado ao servidor');
  });

  newSocket.on('disconnect', () => {
    console.log('Desconectado do servidor');
  });

  // Cleanup
  return () => {
    newSocket.close();
  };
}, []);

// Quando o usuário se identificar, substitua por:
const handleIdentify = () => {
  if (userName.trim() && socket) {
    socket.emit('join-chat', { userName: userName.trim() });
    setIsUserIdentified(true);
  }
};
```

### 3. Eventos do Socket.IO para implementar

```typescript
useEffect(() => {
  if (!socket || !isUserIdentified) return;

  // Receber histórico de mensagens
  socket.on('message-history', (messages: any[]) => {
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      text: msg.text,
      sender: msg.sender,
      timestamp: new Date(msg.timestamp),
      isCurrentUser: msg.sender === userName
    }));
    setMessages(formattedMessages);
  });

  // Receber nova mensagem
  socket.on('new-message', (message: any) => {
    const formattedMessage = {
      id: message.id,
      text: message.text,
      sender: message.sender,
      timestamp: new Date(message.timestamp),
      isCurrentUser: message.sender === userName
    };
    setMessages(prev => [...prev, formattedMessage]);
  });

  // Usuários online
  socket.on('users-online', (data: { users: any[], count: number }) => {
    setOnlineUsers(data.users);
    setOnlineCount(data.count);
  });

  // Limpeza dos listeners
  return () => {
    socket.off('message-history');
    socket.off('new-message');
    socket.off('users-online');
  };
}, [socket, isUserIdentified, userName]);
```

### 4. Enviar mensagem

```typescript
const handleSendMessage = () => {
  if (currentMessage.trim() && socket && isUserIdentified) {
    socket.emit('send-message', {
      text: currentMessage.trim(),
      sender: userName
    });
    setCurrentMessage('');
  }
};
```

### 5. Remover simulações

Remova ou comente todo o código de simulação:
- `simulatedUsers`
- `simulatedMessages`
- Os `setInterval` que simulam usuários entrando/saindo
- Os `setInterval` que simulam mensagens automáticas

### 6. Estrutura completa do useEffect principal

```typescript
useEffect(() => {
  if (!socket || !isUserIdentified) return;

  // Eventos do socket
  socket.on('message-history', handleMessageHistory);
  socket.on('new-message', handleNewMessage);
  socket.on('users-online', handleUsersOnline);
  socket.on('error', handleSocketError);

  // Cleanup
  return () => {
    socket.off('message-history');
    socket.off('new-message');
    socket.off('users-online');
    socket.off('error');
  };
}, [socket, isUserIdentified, userName]);

// Funções handler
const handleMessageHistory = (messages: any[]) => {
  const formattedMessages = messages.map(msg => ({
    id: msg.id,
    text: msg.text,
    sender: msg.sender,
    timestamp: new Date(msg.timestamp),
    isCurrentUser: msg.sender === userName
  }));
  setMessages(formattedMessages);
};

const handleNewMessage = (message: any) => {
  const formattedMessage = {
    id: message.id,
    text: message.text,
    sender: message.sender,
    timestamp: new Date(message.timestamp),
    isCurrentUser: message.sender === userName
  };
  setMessages(prev => [...prev, formattedMessage]);
};

const handleUsersOnline = (data: { users: any[], count: number }) => {
  setOnlineUsers(data.users);
  setOnlineCount(data.count);
};

const handleSocketError = (error: any) => {
  console.error('Socket error:', error);
};
```

## Eventos disponíveis na API

### Eventos que você pode emitir:
- `join-chat` - Para entrar no chat
- `send-message` - Para enviar uma mensagem

### Eventos que você pode escutar:
- `message-history` - Histórico de mensagens quando entra
- `new-message` - Nova mensagem de qualquer usuário
- `users-online` - Lista de usuários online
- `error` - Erros do servidor

## Endpoints REST disponíveis

- `GET /api/messages` - Buscar histórico de mensagens
- `GET /api/messages/user/:sender` - Mensagens de um usuário
- `GET /api/chat/stats` - Estatísticas do chat
- `DELETE /api/messages/:id` - Deletar mensagem (admin)

## Teste da funcionalidade

1. Inicie o servidor: `npm run dev`
2. Acesse: `http://localhost:3000/chat.html`
3. Teste o chat em múltiplas abas/janelas

O chat agora está totalmente funcional em tempo real!