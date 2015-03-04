var http = require('http');
var express = require('express');
var fs = require('fs');

// CONFIGURATION SERVER ----------------------------------------------------------------------------
var app = express();
var bodyParser = require('body-parser');
var multer = require('multer');

var portForConfigurationServer = process.env.CONFIG_PORT || 8081;
var portForServer = process.env.PORT || 8080;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer());

function updateHostMapFile() {
    var data = JSON.stringify({hosts: map});
    fs.writeFile("host-map.json", data, function(err){
        if(err) console.log(err);
    });
}

setInterval(updateHostMapFile, 5000);

app.post('/host', function(req, res) {
    if(!req.body.name || !req.body.port || !req.body.address) {
        res.sendStatus(400);
        return;
    }

    map.push({name: req.body.name, address: req.body.address, port: req.body.port});
    res.sendStatus(200);
});

app.get('/host', function(req, res) {
    res.send({hosts: map});
});

app.put('/host/:name', function(req, res) {
    var hostToModify = req.params.name;
    if(!hostToModify) {
        res.sendStatus(400);
        return;
    }

    if(!req.body.name && !req.body.port && !req.body.address) {
        res.sendStatus(400);
        return;
    }

    for(var i = 0; i < map.length; i++){
        var host = map[i];

        if(host.name == hostToModify) {
            if(req.body.name) {
                host.name = req.body.name;
            }

            if(req.body.port) {
                host.port = req.body.port;
            }

            if(req.body.address) {
                host.address = req.body.address;
            }
            res.sendStatus(200);
            return;
        }
    }

    res.sendStatus(404);
});

app.delete('/host/:name', function(req, res) {
    var hostToDelete = req.params.name;
    if(!hostToDelete) {
        res.sendStatus(400);
        return;
    }

    var deletionIndex = -1;
    for(var i = 0; i < map.length; i++){
        var host = map[i];

        if(host.name == hostToDelete) {
            deletionIndex = i;
            break;
        }
    }

    if(deletionIndex == -1) {
        res.sendStatus(404);
        return;
    }

    map.splice(deletionIndex, 1);
    res.sendStatus(200);
});

app.listen(portForConfigurationServer, function() {
    console.log("Configuration server listening on " + portForConfigurationServer);
    console.log("GET, POST, PUT and DELETE available on /host.");
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
server.listen(portForServer);

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

// UTILITY FUNCTIONS ----------------------------------------------------------------
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
