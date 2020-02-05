# chatApp
Implementation of chating, combining the use of a main public chat room and many private rooms.

### Socket-signalling server
The setup of the socket-signalling server was made using socket.io, nodejs, express amongst other technologies.
The corresponding code can be found in "server.js" and the server can be run using the "server" batch file, 
or through the command line executing "node server.js", or in debug mode (use Chrome nodejs debug tools) via 
"serverDebug" batch file

### Socket client and application interface
Javascript with jquerry are used for the front-end application, which you can find in "public" folder.
"chat.js" runs all the interactions and events between the socket clients and socket server.


