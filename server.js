var express = require('express');
var app = express();
var path = require('path');


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.bodyParser());


app.listen(4142);
console.log('Listening on port 4142');


/*
arborescence:
	.
	server.js
	public
		| index.html
		| ...
		| ...
	
*/