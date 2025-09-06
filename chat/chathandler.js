// chat/chatHandler.js
const activeRooms = new Map();
const userSockets = new Map();
const roomMessages = new Map();

function initializeChat(io) {
  io.on('connection', (socket) => {
    console.log('🔌 New chat client connected:', socket.id);

    // Handle user joining a room
    socket.on('join_room', (data) => {
      const { user, room } = data;
      
      console.log(`👤 User ${user} joining room ${room}`);
      
      try {
        // Leave any previous rooms
        const prevUserData = userSockets.get(socket.id);
        if (prevUserData) {
          socket.leave(prevUserData.room);
          if (activeRooms.has(prevUserData.room)) {
            activeRooms.get(prevUserData.room).delete(prevUserData.username);
          }
        }
        
        // Join the new room
        socket.join(room);
        userSockets.set(socket.id, { username: user, room: room });
        
        // Update room data
        if (!activeRooms.has(room)) {
          activeRooms.set(room, new Set());
        }
        activeRooms.get(room).add(user);
        
        // Initialize room messages
        if (!roomMessages.has(room)) {
          roomMessages.set(room, []);
        }
        
        // Send confirmation and recent messages
        socket.emit('join_confirmation', {
          success: true,
          message: `Successfully joined room: ${room}`,
          room: room,
          user: user
        });
        
        // Send message history
        const recentMessages = roomMessages.get(room).slice(-50);
        socket.emit('message_history', recentMessages);
        
        // Notify others
        socket.to(room).emit('user_joined', {
          message: `${user} joined the room`,
          user: user,
          timestamp: new Date().toISOString(),
          type: 'system'
        });
        
        // Update user list
        const roomUsers = Array.from(activeRooms.get(room));
        io.to(room).emit('room_users', {
          room: room,
          users: roomUsers,
          count: roomUsers.length
        });
        
      } catch (error) {
        console.error('Error in join_room:', error);
        socket.emit('join_error', {
          success: false,
          message: 'Failed to join room'
        });
      }
    });

    // Handle sending messages
    socket.on('send_msg', (data) => {
      const { room, user, message } = data;
      
      console.log(`💬 Message from ${user} in room ${room}: ${message}`);
      
      try {
        const userData = userSockets.get(socket.id);
        if (!userData || userData.room !== room || userData.username !== user) {
          socket.emit('send_error', { message: 'Invalid room or user' });
          return;
        }
        
        const messageData = {
          id: Date.now() + Math.random(),
          user: user,
          message: message,
          timestamp: new Date().toISOString(),
          room: room,
          type: 'user'
        };
        
        // Store message
        if (!roomMessages.has(room)) {
          roomMessages.set(room, []);
        }
        roomMessages.get(room).push(messageData);
        
        // Keep only last 100 messages
        if (roomMessages.get(room).length > 100) {
          roomMessages.set(room, roomMessages.get(room).slice(-100));
        }
        
        // Broadcast message
        io.to(room).emit('receive_msg', messageData);
        
      } catch (error) {
        console.error('Error in send_msg:', error);
        socket.emit('send_error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
      const { room, user } = data;
      socket.to(room).emit('user_typing', {
        user: user,
        isTyping: true
      });
    });

    socket.on('stop_typing', (data) => {
      const { room, user } = data;
      socket.to(room).emit('user_typing', {
        user: user,
        isTyping: false
      });
    });

    // Handle room list request
    socket.on('get_rooms', () => {
      try {
        const roomList = Array.from(activeRooms.entries()).map(([room, users]) => ({
          name: room,
          userCount: users.size,
          users: Array.from(users)
        }));
        
        socket.emit('rooms_list', {
          success: true,
          rooms: roomList
        });
      } catch (error) {
        console.error('Error in get_rooms:', error);
        socket.emit('rooms_error', { message: 'Failed to get rooms' });
      }
    });

    // Handle manual leave
    socket.on('leave_room', () => {
      try {
        const userData = userSockets.get(socket.id);
        if (userData) {
          const { username, room } = userData;
          handleUserLeave(socket, username, room, io, activeRooms, userSockets, roomMessages);
          socket.emit('leave_confirmation', {
            success: true,
            message: 'Successfully left the room'
          });
        }
      } catch (error) {
        console.error('Error in leave_room:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log('🔌 Chat client disconnected:', socket.id, 'Reason:', reason);
      
      const userData = userSockets.get(socket.id);
      if (userData) {
        const { username, room } = userData;
        handleUserLeave(socket, username, room, io, activeRooms, userSockets, roomMessages);
      }
    });
  });

  // Return chat stats for API endpoints
  return {
    getActiveRooms: () => activeRooms,
    getUserSockets: () => userSockets,
    getRoomMessages: () => roomMessages
  };
}

// Helper function to handle user leaving
function handleUserLeave(socket, username, room, io, activeRooms, userSockets, roomMessages) {
  try {
    if (activeRooms.has(room)) {
      activeRooms.get(room).delete(username);
      
      if (activeRooms.get(room).size === 0) {
        activeRooms.delete(room);
        roomMessages.delete(room);
        console.log(`🗑️ Empty room ${room} deleted`);
      } else {
        socket.to(room).emit('user_left', {
          message: `${username} left the room`,
          user: username,
          timestamp: new Date().toISOString(),
          type: 'system'
        });
        
        const roomUsers = Array.from(activeRooms.get(room));
        socket.to(room).emit('room_users', {
          room: room,
          users: roomUsers,
          count: roomUsers.length
        });
      }
    }
    
    userSockets.delete(socket.id);
    socket.leave(room);
    console.log(`👋 ${username} left room ${room}`);
    
  } catch (error) {
    console.error('Error in handleUserLeave:', error);
  }
}

module.exports = initializeChat;