
$(document).ready(function() {
	function pingStatus() {
		var xmlhttp;
		if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
		 	xmlhttp=new XMLHttpRequest();
		} else {// code for IE6, IE5
		  xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
		}
		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState == 4) {
				if (xmlhttp.status == 200) {
					var uo = document.getElementById("usersOnline");
					uo.innerHTML = "";
					var jsonresponse = JSON.parse(xmlhttp.response).uns;
					if (typeof jsonresponse != 'undefined') {
						for (var i = 0; i < jsonresponse.length; i++) {
							var newEntry = document.createElement("li");
							var newUser = newEntry.appendChild(document.createElement("a"));
							newUser.setAttribute("href", "#");
							newUser.setAttribute("value", jsonresponse[i].username);
							newUser.addEventListener('click', function() {
								inviteUser(this.getAttribute("value"));
							});
							newUser.innerHTML = jsonresponse[i].username;
							uo.appendChild(newEntry);
						}
						setTimeout(pingStatus, 10000);
					} else {
						window.location = "../";
					}
				} else {
					window.location = "../";
				}
			}
		}
		xmlhttp.open("GET","/ping_status?t=" + Math.random(),true);
		xmlhttp.send();
	};
	pingStatus();
});

