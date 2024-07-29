var conId = 1; // Connection Id (auto increment, start at 1)
var colors = ["#DDFFAA", "#95E0C8", "#E18060", "#FFCBA4"]; //highlight colors.
var users = {}; //user datas

module.exports = function (io, nsp) {
  var server = io.of(nsp); //Set Namespace
  server.on("connection", function (socket) {
    users[socket.id] = {}; //Create Users

    users[socket.id].user = socket.user = "user" + conId; //set username
    users[socket.id].admin = socket.admin = false; //set admin
    users[socket.id].color = socket.color = colors[conId % colors.length]; //set highight colors

    conId++; //UserId increment
    console.log("[Socket.IO] [" + nsp + "] : Connect " + socket.id); //print connect
    if (Object.keys(server.sockets.connected).length === 1) {
      socket.emit("admin"); //alert Admin
      socket.admin = true;
      users[socket.id].admin = true;
      // import file data from database
      // socket.emit('resetdata', data)
    } else socket.emit("userdata", Object.values(users)); //send Connected User data
    socket.broadcast.emit("connected", {
      user: socket.user,
      color: socket.color,
    }); //Alert New Connect

    socket.on("selection", function (data) {
      //Content Select Or Cursor Change Event
      data.color = socket.color;
      data.user = socket.user;
      socket.broadcast.emit("selection", data);
    });
    socket.on("filedata", function (data) {
      socket.broadcast.emit("resetdata", data);
    });
    socket.on("disconnect", function (data) {
      console.log("[Socket.IO] [" + nsp + "] : disConnect " + socket.id);
      socket.broadcast.emit("exit", users[socket.id].user);
      delete users[socket.id];
    });
    socket.on("key", function (data) {
      data.user = socket.user;
      socket.broadcast.emit("key", data);
    });
  });
  return server;
};
