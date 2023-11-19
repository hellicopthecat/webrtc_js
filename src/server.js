import http from "http";
import SocketIO from "socket.io";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);

wsServer.on("connection", (socket) => {
  socket.on("room_create", (roomName) => {
    socket.join(roomName);
    socket.to(roomName).emit("join_room");
  });
  socket.on("send_offer", (roomname, offer) => {
    socket.to(roomname).emit("receive_offer", offer);
  });
  socket.on("received_doneSig", (doneSign, roomname) => {
    socket.to(roomname).emit("answer_offer", doneSign);
  });
  socket.on("send_ice", (ice, roomname) => {
    socket.to(roomname).emit("received_ice", ice);
  });
});

const handleListen = () => console.log(`Listening on http://localhost:3000`);
httpServer.listen(3000, handleListen);
