var http = require('http');
var fs = require('fs');
var map = JSON.parse(fs.readFileSync('host-map.json', 'utf8'));
map = map.hosts;

if (!map || map.length == 0) {
    console.log("No hosts found. Continuing...");
} else {
    console.log(map.length + " hosts found.");
}

var server = http.createServer();
server.addListener("request", requestHandler);
server.listen(process.env.PORT || 8080);

for (var i = 0; i < map.length; i++) {
    var host = map[i];
    console.log("Mapping " + host.name + " to " + host.address + ":" + host.port + "...");
}

function requestHandler(req, res) {
    var vhost = req.headers.host;
    console.log("Just got request for " + vhost);
    console.log("Got it!");
    console.log("Host is " + getSubDomain(vhost));
    var subdomain = getSubDomain(vhost);
    // maybe some error handling
    var host = matchKnownSubdomains(subdomain);
    if (host != false) {
        console.log("Matched!");

        proxyThrough(req, res, host);

        req.addListener('data', function (chunk) {
            proxy_request.write(chunk, 'binary');
        });

        req.addListener('end', function () {
            proxy_request.end();
        });
    }
    res.end("jhbdkf");
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

function proxyThrough(req, res, host) {
    var proxy = http.createClient(host.port, host.address);

    proxy.addListener("error", function (socketException) {
        console.log("Request failed.");
        res.end("Unreachable.");
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
}
