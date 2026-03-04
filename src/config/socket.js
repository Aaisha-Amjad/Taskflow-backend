//socket.io configuration
//handles websocket connection for real time communication

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

//Online users Tracking
//Stores which users are currently online

const onlineUsers = new Map(); //User id -> {socketId, email, projects: Set()}

//initialise socket.js
//called from server.js after Express server starts

const initializeSocket = (server) => {
  console.log("🔧 [SOCKET.JS] Starting Socket.io initialization...");

  console.log();
  //create socket.io instance
  const io = new Server(server, {
    cors: {
      origin: "*", //Allow all origins(restrict in production)
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"], // Allow fallback to polling
    allowEIO3: true, //Backwards compatibility
  });

  console.log(
    "🔧 [SOCKET.JS] Socket.io instance created:",
    io ? "SUCCESS" : "FAILED",
  ); // ← ADD THIS

  //authentication middleware for socket.io
  //verify JWT token before allowing connection

  io.use((socket, next) => {
    console.log("Socket authentication attempt");
    try {
      //get token from handshake query or auth header
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        console.log("No token provided");
        return next(new Error("Authentication error: No token provided"));
      }

      //Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      //Attach user info to socket
      socket.userId = decoded.userId;
      socket.userEmail = decoded.email;

      console.log(`Socket authenticated: User ${decoded.email}`);

      console.log("Socket authenticated: User ${decoded.email}");
      next();
    } catch (error) {
      console.error("socket auth error: ", error.messsage);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  //Connection Event
  //Fires when a client connects

  io.on("connection", (socket) => {
    console.log(
      ` New WebSocket connection: ${socket.id} (User: ${socket.userEmail})`,
    );

    //Track user as online
    onlineUsers.set(socket.userId, {
      socketId: socket.id,
      email: socket.userEmail,
      projects: new Set(),
    });

    console.log(`Online users: ${onlineUsers.size}`);

    //Send current online count to user
    socket.emit("user_connected", {
      userId: socket.userId,
      onlineCount: onlineUsers.size,
    });

    socket.on("ping", (message) => {
      console.log(` Received ping from ${socket.userEmail}: ${message}`);
      socket.emit("pong", `Server received: ${message}`);
    });

    socket.on("join_project", (projectId) => {
      socket.join(`project_${projectId}`);

      //Track with projects user has joined
      const user = onlineUsers.get(socket.userId);
      if (user) {
        user.projects.add(projectId);
      }

      console.log(` User ${socket.userEmail} joined project ${projectId}`);

      // Get all online users in this project
      const projectUsers = Array.from(onlineUsers.entries())
        .filter(([userId, data]) => data.projects.has(projectId))
        .map(([userId, data]) => ({
          userId,
          email: data.email,
        }));

      // Notify user they joined
      socket.emit("joined_project", {
        projectId,
        message: "Successfully joined project room",
        onlineUsers: projectUsers,
      });

      //Notify others in project that new user joined
      socket.to(`project_${projectId}`).emit("user_joined_project", {
        projectId,
        user: {
          userId: socket.userId,
          email: socket.userEmail,
        },
      });
    });

    socket.on("leave_project", (projectId) => {
      socket.leave(`project_${projectId}`);

      //Remove project from user's tracking
      const user = onlineUsers.get(socket.userId);
      if (user) {
        user.projects.delete(projectId);
      }

      console.log(` User ${socket.userEmail} left project ${projectId}`);

      //Notify others in the project that user has left
      socket.io(`project_${projectId}`).emit("user_left_project", {
        projectId,
        user: {
          userId: socket.userId,
          email: socket.userEmail,
        },
      });
    });

    socket.on("disconnect", () => {
      console.log(
        ` Websocket disconnected: ${socket.id} (User: ${socket.userEmail})`,
      );

      // Get user's projects before removing
      const user = onlineUsers.get(socket.userId);
      if (user) {
        //Notify all projects user was in
        user.projects.forEach((projectId) => {
          io.to(`project_${projectId}`).emit("user_left_project", {
            projectId,
            user: {
              userId: socket.userId,
              email: socket.userEmail,
            },
          });
        });
      }

      //Remove user from online tracking
      onlineUsers.delete(socket.userId);
      console.log(` Online users: ${onlineUsers.size}`);
    });
  });

  console.log(" Socket.io event handlers registered");
  console.log(" Socket.js returning io instance to server.js");
  return io;
};

//Export

module.exports = { initializeSocket };
