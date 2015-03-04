var http = require('http');
var express = require('express');
var fs = require('fs');

// CONFIGURATION SERVER ----------------------------------------------------------------------------
var app = express();
var bodyParser = require('body-parser');
var multer = require('multer');

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(multer()); // for parsing multipart/form-data

app.post('/host', function(req, res) {
    if(!req.body.name || !req.body.port || !req.body.address) {
        res.send(400);
        return;
    }

    map.push({name: req.body.name, address: req.body.address, port: req.body.port});
    res.send(200);
});

app.listen(process.env.PORT_CONFIG || 8081, function() {
    console.log("Configuration server listening.");
});

// MAIN SERVER ------------------------------------------------------------------------------------
var map = JSON.parse(fs.readFileSync('host-map.json', 'utf8'));
map = map.hosts;

if (!map || map.length == 0) {
    console.log("No hosts found. Continuing...");
} else {
    console.log(map.length + " hosts found.");
}

for (var i = 0; i < map.length; i++) {
    var host = map[i];
    console.log("Will map " + host.name + " to " + host.address + ":" + host.port + "...");
}

var server = http.createServer();
server.addListener("request", requestHandler);
server.listen(process.env.PORT || 8080);

function requestHandler(req, res) {
    var vhost = req.headers.host;
    console.log("Just got request for " + vhost);
    console.log("Got it!");
    console.log("Host is " + getSubDomain(vhost));
    var subdomain = getSubDomain(vhost);
    // maybe some error handling
    var host = matchKnownSubdomains(subdomain);
    if (host != false) {
        var proxy = http.createClient(host.port, host.address);

        proxy.addListener("error", function (socketException) {
            res.statusCode = 404;
            res.end();
        });

        req.headers["X-Forwarded-For"] = req.connection.remoteAddress;

        var proxy_request = proxy.request(req.method, req.url, req.headers);

        proxy_request.addListener('response', function (proxy_response) {
            res.writeHead(proxy_response.statusCode, proxy_response.headers);
            if (proxy_response.statusCode === 304) {
                res.end();
                return;
            }

            proxy_response.addListener('data', function (chunk) {
                res.write(chunk, 'binary');
            });

            proxy_response.addListener('end', function () {
                res.end();
            });
        });

        req.addListener('data', function (chunk) {
            proxy_request.write(chunk, 'binary');
        });

        req.addListener('end', function () {
            proxy_request.end();
        });
    } else {
        res.statusCode = 404;
        res.end();
    }
}

function matchKnownSubdomains(subdomain) {
    for (var i = 0; i < map.length; i++) {
        var host = map[i];
        if (host.name == subdomain) {
            return host;
        }
    }
    return false;
}

function getSubDomain(hostname) {
    var res = hostname.match(/[\d\w-_]+\./g);
    var host = res[0];
    return host.substring(0, host.length - 1);
}
