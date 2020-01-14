var socket = io();
// listen for server connection
// get query params from url
var name = getQueryVariable("name") || 'Anonymous';

// fires when client successfully connects to the server
socket.on("connect", function() {
	console.log("Connected to Socket I/O Server!");
	
	// to join a specific room
	socket.emit('joinRoom', {
		name: name,
		room: "chatroom",
		status: "active"
	});
	socket.emit("message", {
		text: "@currentUsers",
		name: name,
	});
});

$('#status').change(function() {
	if ($(this).val() === 'Active') {
		socket.emit('status', {status:"active"});
	} else if ($(this).val() === 'Busy') {
		socket.emit('status', {status:"busy"});
	} else {
		socket.emit('status', {status:"away"});
	}
});

socket.on("activeUsers", function(message) {
	$("#activeUsers").empty();
	message.forEach(function(user) {
		if (user.name != name) {
			var button = document.createElement("button");
			button.innerHTML = user.name;
			button.onclick = function(){
				$('#room').hide();
				$('#pm').show();
				
				socket.emit('status', {status:"talking"});
				
				socket.emit('createChat', {
					name: name,
					socket: user.socket
				});
			};
			$("#activeUsers").append(button);
		}
	});
});

socket.on("busyUsers", function(message) {
	$("#busyUsers").empty();
	message.forEach(function(user) {
		if (user.name != name) {
			$("#busyUsers").append("<text>" + user.name + " </text><br>" );
		}
	});
});

socket.on("awayUsers", function(message) {
	$("#awayUsers").empty();
	message.forEach(function(user) {
		if (user.name != name) {
			$("#awayUsers").append( "<text>" + user.name + " </text><br>" );
		}
	});
});

socket.on("roomCreated", function(res) {
	$("#room-title").text("Room: " + res.room);
});

socket.on("call", function(roomName) {
	$('#room').hide();
	$('#pm').show();
	$("#room-title").text("Room: " + roomName);
	
	socket.emit('status', {status:"talking"});
	
	socket.emit('joinChat', {
		name: name,
		room: roomName,
	});
	
});

/*****************************
* After joining private chat *
*****************************/
 
// below code is to know when typing is there
var timeout;

function timeoutFunction() {
	typing = false;

	socket.emit('typing', {
		text: "" //name + " stopped typing"
	});
}

// if key is pressed typing message is seen else auto after 2 sec typing false message is send
$('#messagebox').keyup(function() {
	console.log('Someone is typing');
	typing = true;
	$("#icon-type").removeClass();
   
	socket.emit('typing', {
		text: name + " is typing ..."
	});
	clearTimeout(timeout);
	timeout = setTimeout(timeoutFunction, 1000);
});

// below is the checking for page visibility api
var hidden, visibilityChange;
if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
	hidden = "hidden";
	visibilityChange = "visibilitychange";
} else if (typeof document.mozHidden !== "undefined") {
	hidden = "mozHidden";
	visibilityChange = "mozvisibilitychange";
} else if (typeof document.msHidden !== "undefined") {
	hidden = "msHidden";
	visibilityChange = "msvisibilitychange";
} else if (typeof document.webkitHidden !== "undefined") {
	hidden = "webkitHidden";
	visibilityChange = "webkitvisibilitychange";
}

// if the page is shown, play the video
function handleVisibilityChange() {
	if (!document[hidden]) {
		socket.emit("userSeen", {
			text: name + " has seen message",
			read: true,
			user: name
		});
	}
}

// Warn if the browser doesn't support addEventListener or the Page Visibility API
if (typeof document.addEventListener === "undefined" || hidden === undefined) {
	console.log("This demo requires a browser, such as Google Chrome or Firefox, that supports the Page Visibility API.");
} else {
	// Handle page visibility change   
	document.addEventListener(visibilityChange, handleVisibilityChange, false);
}

//listening for typing  event
socket.on("typing", function(message) { 
	$(".typing").text(message.text); 
});

socket.on("userSeen", function(msg) {
	
    var icon = $("#icon-type");
    icon.removeClass();
    icon.addClass("fa fa-check-circle");
    if (msg.read) {
		//user read the message
		icon.addClass("msg-read");
    } else {
		// message delivered but not read yet
		icon.addClass("msg-delivered");
    }
    console.log(msg);
});

//setup for custom events
socket.on("message", function(message) {
	playSound();
	console.log("New Message !");
	console.log(message.text);
	// insert messages in container
	var $messages = $(".messages");
	var $message = $('<li class = "list-group-item"></li>');

	var momentTimestamp = moment.utc(message.timestamp).local().format("h:mm a");
	$message.append("<strong>" + momentTimestamp + " : " + message.name + "</strong> said ");
	$message.append("<p>" + message.text + "</p>");
	var $wrapper = $('<div class="totheleft"/>');
	$wrapper.append($message);
	$messages.append($wrapper);
	  
	// manage autoscroll
	var obj = $("ul.messages.list-group");
	var offset = obj.offset();
	var scrollLength = obj[0].scrollHeight;
	$("ul.messages.list-group").animate({
		scrollTop: scrollLength - offset.top
	});

	// try notify , only when user has not open chat view
	if (document[hidden]) {
		// also notify server that user has not seen message
		socket.emit("userSeen", {
			text: name + " has not seen message",
			read: false
		});
		notifyMe(message);
	} else {
		// notify  server that user has seen message
		socket.emit("userSeen", {
			text: name + " has seen message",
			read: true,
			user: name
		});
	}
});

$("#messagebox").click(function() {
	socket.emit("userSeen", {
		text: name + " has seen message",
		read: true,
		user: name
	});
});

// handles submitting of new message
var $form = $("#messageForm");
var $message1 = $form.find('input[name=message]');
$form.on("submit", function(event) {
	event.preventDefault();
	var msg = $message1.val();
	//prevent js injection attack
	msg = msg.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
	if (msg === "") return -1; //empty messages cannot be sent

	socket.emit("message", {
		text: msg,
		name: name
	});
	// show user messageForm
	var $messages = $(".messages");
	var $message = $('<li class = "list-group-item ownmessage"></li>');

	var momentTimestamp = moment().format("h:mm a");
	$message.append("<strong>" + momentTimestamp + " : " + name + "</strong> said ");
	$message.append($("<p>", {
		class: "ownmessage",
		text: $message1.val() 
	}));
	var $wrapper = $('<div class="totheright"/>');
	$wrapper.append($message);
	$messages.append($wrapper);
	$message1.val('');
	// manage autoscroll
	var obj = $("ul.messages.list-group");
	var offset = obj.offset();
	var scrollLength = obj[0].scrollHeight;
	$("ul.messages.list-group").animate({
		scrollTop: scrollLength - offset.top
	});
});

// notification message
function notifyMe(msg) {
	// Let's check if the browser supports notifications
	if (!("Notification" in window)) {
		alert("This browser does not support desktop notification,try Chromium!");
	}
	// Let's check whether notification permissions have already been granted
	else if (Notification.permission === "granted") {
		// If it's okay let's create a notification
		var notification = new Notification("Enius - Chat App", {
			body: msg.name + ": " + msg.text,
			icon: '/images/apple-icon.png' // optional
		});
		notification.onclick = function(event) {
			event.preventDefault();
			this.close();
			// assume user would see message so broadcast userSeen event
			socket.emit("userSeen", {
				text: name + " has seen message",
				read: true,
				user: name
			});
		};
	}
	// Otherwise, we need to ask the user for permission
	else if (Notification.permission !== 'denied') {
		Notification.requestPermission(function(permission) {
		// If the user accepts, let's create a notification
			if (permission === "granted") {
				var notification = new Notification('Chat App', {
					body: msg.name + ": " + msg.text,
					icon: '/images/apple-icon.png' // optional
				});
				notification.onclick = function(event) {
					event.preventDefault();
					this.close();
					//we assume user would see message so broadcast userSeen event
					socket.emit("userSeen", {
						text: name + " has seen message",
						read: true,
						user: name
					});
				};
			}
		});
	}
	// At last, if the user has denied notifications, and you
	// want to be respectful there is no need to bother them any more.
}

function playSound(){
	var mp3Source = '<source src="/sounds/notification.mp3" type="audio/mpeg">';
	document.getElementById("sound").innerHTML='<audio autoplay="autoplay">' + mp3Source + /*oggSource + embedSource +*/ '</audio>';
}


 