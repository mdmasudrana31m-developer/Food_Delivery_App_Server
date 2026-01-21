import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:5174"],
      methods: ["GET", "POST", "PUT"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("register", (data) => {
      try {
        if (data?.admin) {
          socket.join("admin");
          console.log(`Socket ${socket.id} joined admin room`);
        }
        if (data?.userId) {
          socket.join(`user_${data.userId}`);
          console.log(`Socket ${socket.id} joined user_${data.userId}`);
        }
      } catch (err) {
        console.error("register handler error:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
};

export const getIo = () => io;
