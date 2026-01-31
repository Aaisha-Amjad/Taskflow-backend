//socket.io configuration
//handles websocket connection for real time communication

const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");

//initialise socket.js
//called from server.js after Express server starts

const initializeSocket = (server) => {
  //create socket.io instance
  const io = socketIo(server, {
    cors: {
      origin: "*", //Allow all origins(restrict in production)
      methods: ["GET", "POST"],
    },
  });

  //authentication middleware for socket.io
  //verify JWT token before allowing connection

  io.use((socket, next) => {
    try {
      //get token from handshake query or auth header
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      //Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      //Attach user info to socket
      socket.userId = decoded.userId;
      socket.userEmail = decoded.email;

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

    //Test event - "hello world" for websocket
    //client sends: socket.emit('ping','hello server')
    //server responds with: socket.emit('pong','hello client')

    socket.on("ping", (message) => {
      console.log(` Received ping from ${socket.userEmail}: ${message}`);
      socket.emit("pong", `Server received: ${message}`);
    });

    //join project rooms
    //Allows users to receive updates for specific projects
    socket.on("join_project", (projectId) => {
      socket.join("project_${projectId}");
      console.log(` User ${socket.userEmail} joined project ${projectId}`);
      socket.emit("joined_project", {
        projectId,
        message: "Successfully joined project room",
      });
    });

    //leave project room
    socket.on("leave_project", (projectId) => {
      socket.leave(`project_${projectId}`);
      console.log(` User ${socket.userEmail} left project ${projectId}`);
    });

    //disconnect event
    //fires when client disconnects

    socket.on("disconnect", () => {
      console.log(
        ` Websocket disconnected: ${socket.id} {User: ${socket.userEmail}`,
      );
    });
  });

  return io;
};

//Export

module.exports = { initializeSocket };
