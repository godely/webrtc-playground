'use strict';

var sendChannel, receiveChannel;
var sendButton = document.getElementById("sendButton");
var sendTextarea = document.getElementById("dataChannelSend");
var receiveTextarea = document.getElementById("dataChannelReceive");

sendButton.onclick = sendData;

var isChannelReady;
var isInitiator;
var isStarted;
var localStream;
var pc;
var remoteStream;
var turnReady;

var pc_config = webrtcDetectedBrowser === 'firefox' ?
  {'iceServers':[{'url':'stun:23.21.150.121'}]} : // number IP
  {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}, {'url': 'turn:localhost:8080'}]};

  var pc_constraints = {
  	'optional': [
  	{'DtlsSrtpKeyAgreement': true},
  	{'RtpDataChannels': true}
  	]};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {'mandatory': {
	'OfferToReceiveAudio':true,
	'OfferToReceiveVideo':true }};

/////////////////////////////////////////////

var user_name;
var user_token;
var room;

var cookies = JSON.parse(document.getElementById("cookies").value);
console.log(cookies);

var socket = io.connect('/chat');

socket.emit('connect', cookies);

socket.on('success', function(msg) {
	// CONNECTED SOCKET TO SERVER
	if (msg.connected) {
		console.log(msg.text);
		user_name = msg.user;
		user_token = msg.token;
	}

	// INVITED TO JOIN A ROOM
	if (msg.invited) {
		var accepted = confirm(msg.text);
		socket.emit('accept or reject invite', {'accepted': accepted, 'token': msg.from_token, 'from_token': user_token});
		if (accepted) room = msg.from_token;
	}

	// THE OTHER USER ACCEPTED TO JOIN THE ROOM
	if (msg.accepted) {
		console.log("Ele aceitou!");
		room = msg.token;
		isInitiator = true;
		maybeStart();
	}
});

socket.on('error', function(msg) {
	if (msg.not_connected) {
		console.log(msg.text);
		window.location = "../";
	}

	if (msg.user_leave) {
		if (msg.has_to_leave) {
			socket.emit('leave', {'leave_room': true, 'token': msg.from_token, 'from_token': user_token});
			handleRemoteHangup();
			console.log("The other user has left. Leaving room...")	;
		} else {
			socket.emit('leave', {'leave_room': false, 'token': msg.from_token, 'from_token': user_token});
			hangup();
			console.log("The other user has left. You are the owner of the room.")
		}
	}

	if (msg.invalid_token) {
		console.log(msg.text);
	}

	if (msg.rejected) {
		alert("The user rejected to join a room with you.");
	}
});


function inviteUser(user) {
	socket.emit('invite', {'from_user': user_name, 'from_token': user_token, 'to_user': user});
}

window.onbeforeunload = function(e) {
	if (room != null) socket.emit('leaving', {'token': user_token, 'room': room, 'is_owner': isInitiator});
	socket.disconnect();
}

socket.on('log', function (array) {
	console.log.apply(console, array);
});

function hangup() {
	console.log('Hanging up.');
	stop();
	sendMessage('bye');
}

function handleRemoteHangup() {
	console.log('Session terminated.');
	stop();
	isInitiator = false;
	room = null;
}

function stop() {
	isStarted = false;
 	// isAudioMuted = false;
 	// isVideoMuted = false;
 	pc.close();
 	pc = room = null;
}

////////////////////////////////////////////////

function sendMessage(message){
	socket.emit('message', {'room': room, 'text': message});
}

socket.on('message', function (message){
	console.log('Received message:', message);
	if (message.type === 'offer') {
		if (!isInitiator) {
			maybeStart();
		}
		pc.setRemoteDescription(new RTCSessionDescription(message));
		doAnswer();
	} else if (message.type === 'answer' && isStarted) {
		pc.setRemoteDescription(new RTCSessionDescription(message));
	} else if (message.type === 'candidate' && isStarted) {
		var candidate = new RTCIceCandidate({sdpMLineIndex:message.label,
			candidate:message.candidate});
		pc.addIceCandidate(candidate);
	} else if (message === 'bye' && isStarted) {
		handleRemoteHangup();
	}
});

////////////////////////////////////////////////////

requestTurn('https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913');

function maybeStart() {
	if (!isStarted) {
		console.log('Is starting!');
		createPeerConnection();
		isStarted = true;
		if (isInitiator) {
			doCall();
		}
	}
}

/////////////////////////////////////////////////////////

function createPeerConnection() {
	try {
		console.log("Antes");
		pc = new RTCPeerConnection(pc_config, pc_constraints);
		console.log("Depois");
		pc.onicecandidate = handleIceCandidate;
		console.log('Created RTCPeerConnnection with:\n' +
			'  config: \'' + JSON.stringify(pc_config) + '\';\n' +
			'  constraints: \'' + JSON.stringify(pc_constraints) + '\'.');
	} catch (e) {
		console.log('Failed to create PeerConnection, exception: ' + e.message);
		alert('Cannot create RTCPeerConnection object.');
		return;
	}

	if (isInitiator) {
		try {
	  // Reliable Data Channels not yet supported in Chrome
	  sendChannel = pc.createDataChannel("sendDataChannel",
	  	{reliable: false});
	  trace('Created send data channel');
	} catch (e) {
		alert('Failed to create data channel. ' +
			'You need Chrome M25 or later with RtpDataChannel enabled');
		trace('createDataChannel() failed with exception: ' + e.message);
	}
	sendChannel.onopen = handleSendChannelStateChange;
	sendChannel.onclose = handleSendChannelStateChange;
	sendChannel.onmessage = receiveData;
	sendChannel.onerror = function() {
		console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
		console.log(arguments);
	};
} else {
	pc.ondatachannel = gotReceiveChannel;
}
}

function sendData() {
	var data = user_name + ": " + sendTextarea.value;
	if (isInitiator) sendChannel.send(data);
	else receiveChannel.send(data);
	receiveTextarea.value += data+"\n";
	receiveTextarea.scrollTop = receiveTextarea.scrollHeight;
	sendTextarea.focus();
	sendTextarea.value = "";

	trace('Sent data: ' + data);
}

function receiveData(event) {
	trace('Received message: ' + event.data);
	receiveTextarea.value += event.data+"\n";
	receiveTextarea.scrollTop = receiveTextarea.scrollHeight;
}

function gotReceiveChannel(event) {
	trace('Receive Channel Callback');
	receiveChannel = event.channel;
	receiveChannel.onmessage = receiveData;
	receiveChannel.onopen = handleReceiveChannelStateChange;
	receiveChannel.onclose = handleReceiveChannelStateChange;
	receiveChannel.onerror = function() {
		console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
		console.log(arguments);
	};
}

function searchKeyPress(e){
	console.log("apertei enter") 
  // look for window.event in case event isn't passed in
  if (typeof e == 'undefined' && window.event) { e = window.event; }
  if (e.keyCode == 13)
  {
  	sendButton.click();
  }
}

function handleSendChannelStateChange() {
	var readyState = sendChannel.readyState;
	trace('Send channel state is: ' + readyState);
	if (readyState == "open") {
		sendTextarea.disabled = false;
		sendTextarea.focus();
		sendTextarea.placeholder = "";
		sendButton.disabled = false;
//    closeButton.disabled = false;
} else {
	trace(sendTextarea.disabled);
	sendTextarea.disabled = true;
	sendButton.disabled = true;
	sendTextarea.value = "";
	sendTextarea.placeholder = "Press Start, enter some text, then press Send.";
	receiveTextarea.value = "";
  //    closeButton.disabled = true;
}
}

function handleReceiveChannelStateChange() {
	var readyState = receiveChannel.readyState;
	trace('Receive channel state is: ' + readyState);
	trace("Buuuuuuuuuuu"+sendTextarea.disabled);
	if (readyState == "open") {
		sendTextarea.focus();
		sendTextarea.placeholder = "";
		sendTextarea.disabled = false;
		sendButton.disabled = false;
	} else {
		sendTextarea.placeholder = "Press Start, enter some text, then press Send.";
		sendTextarea.value = "";
		receiveTextarea.value = "";
		sendTextarea.disabled = true;
		sendButton.disabled = true;
	}
}

function handleIceCandidate(event) {
  //console.log('handleIceCandidate event: ', event);
  if (event.candidate) {
  	sendMessage({
  		type: 'candidate',
  		label: event.candidate.sdpMLineIndex,
  		id: event.candidate.sdpMid,
  		candidate: event.candidate.candidate});
  } else {
  	console.log('End of candidates.');
  }
}

function doCall() {
	var constraints = {'optional': [], 'mandatory': {'MozDontOfferDataChannel': true}};
  // temporary measure to remove Moz* constraints in Chrome
  if (webrtcDetectedBrowser === 'chrome') {
  	for (var prop in constraints.mandatory) {
  		if (prop.indexOf('Moz') !== -1) {
  			delete constraints.mandatory[prop];
  		}
  	}
  }
  constraints = mergeConstraints(constraints, sdpConstraints);
  console.log('Sending offer to peer, with constraints: \n' +
  	'  \'' + JSON.stringify(constraints) + '\'.');
  pc.createOffer(setLocalAndSendMessage, null, constraints);
}

function doAnswer() {
	console.log('Sending answer to peer.');
	pc.createAnswer(setLocalAndSendMessage, null, sdpConstraints);
}

function mergeConstraints(cons1, cons2) {
	var merged = cons1;
	for (var name in cons2.mandatory) {
		merged.mandatory[name] = cons2.mandatory[name];
	}
	merged.optional.concat(cons2.optional);
	return merged;
}

function setLocalAndSendMessage(sessionDescription) {
  // Set Opus as the preferred codec in SDP if Opus is present.
  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
  pc.setLocalDescription(sessionDescription);
  sendMessage(sessionDescription);
}

function requestTurn(turn_url) {
	var turnExists = false;
	for (var i in pc_config.iceServers) {
		if (pc_config.iceServers[i].url.substr(0, 5) === 'turn:') {
			turnExists = true;
			turnReady = true;
			break;
		}
	}
	if (!turnExists) {
		console.log('Getting TURN server from ', turn_url);
	// No TURN server. Get one from computeengineondemand.appspot.com:
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function(){
		if (xhr.readyState === 4 && xhr.status === 200) {
			var turnServer = JSON.parse(xhr.responseText);
			console.log('Got TURN server: ', turnServer);
			pc_config.iceServers.push({
				'url': 'turn:' + turnServer.username + '@' + turnServer.turn,
				'credential': turnServer.password
			});
			turnReady = true;
		}
	};
	xhr.open('GET', turn_url, true);
	xhr.send();
}
}

///////////////////////////////////////////

// Set Opus as the default audio codec if it's present.
function preferOpus(sdp) {
	var sdpLines = sdp.split('\r\n');
	var mLineIndex;
  // Search for m line.
  for (var i = 0; i < sdpLines.length; i++) {
  	if (sdpLines[i].search('m=audio') !== -1) {
  		mLineIndex = i;
  		break;
  	}
  }
  if (mLineIndex === null) {
  	return sdp;
  }

  // If Opus is available, set it as the default in m line.
  for (i = 0; i < sdpLines.length; i++) {
  	if (sdpLines[i].search('opus/48000') !== -1) {
  		var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
  		if (opusPayload) {
  			sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
  		}
  		break;
  	}
  }

  // Remove CN in m line and sdp.
  sdpLines = removeCN(sdpLines, mLineIndex);

  sdp = sdpLines.join('\r\n');
  return sdp;
}

function extractSdp(sdpLine, pattern) {
	var result = sdpLine.match(pattern);
	return result && result.length === 2 ? result[1] : null;
}

// Set the selected codec to the first in m line.
function setDefaultCodec(mLine, payload) {
	var elements = mLine.split(' ');
	var newLine = [];
	var index = 0;
	for (var i = 0; i < elements.length; i++) {
	if (index === 3) { // Format of media starts from the fourth.
	  newLine[index++] = payload; // Put target payload to the first.
	}
	if (elements[i] !== payload) {
		newLine[index++] = elements[i];
	}
}
return newLine.join(' ');
}

// Strip CN from sdp before CN constraints is ready.
function removeCN(sdpLines, mLineIndex) {
	var mLineElements = sdpLines[mLineIndex].split(' ');
  // Scan from end for the convenience of removing an item.
  for (var i = sdpLines.length-1; i >= 0; i--) {
  	var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
  	if (payload) {
  		var cnPos = mLineElements.indexOf(payload);
  		if (cnPos !== -1) {
		// Remove CN payload from m line.
		mLineElements.splice(cnPos, 1);
	}
	  // Remove CN line in sdp
	  sdpLines.splice(i, 1);
	}
}

sdpLines[mLineIndex] = mLineElements.join(' ');
return sdpLines;
}