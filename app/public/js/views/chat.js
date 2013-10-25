
$(document).ready(function() {
	function pingStatus() {
		var xmlhttp;
		if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
		 	xmlhttp=new XMLHttpRequest();
		} else {// code for IE6, IE5
		  xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
		}
		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
				window.setTimeout(pingStatus,180000);
			}
		}
		xmlhttp.open("GET","/ping_status?t=" + Math.random(),true);
		xmlhttp.send();
	};
	pingStatus();
})