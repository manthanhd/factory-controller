# factory-controller

Written in Node.js, this is a dynamic reverse proxy server application. While this project was created with API Factory in mind, the application is quite extensible and can be used for wide range of purposes.

## Prerequesites
1. Node.js and NPM must be installed on the server.
2. CNAME record in DNS configuration must resemble the following:
```
*.subdomain.domain.com. 1800 IN CNAME subdomain.domain.com.
 ```

## Quickstart guide
Clone the repository on to your machine using the following `git clone` command:
```
git clone https://github.com/manthanhd/factory-controller.git
```

`cd` into the project folder:
```
cd factory-controller
```

Install the required node modules:
```
npm install
```

Start the application:
```
npm start
```
Open up your browser and navigate to:
```
http://subdomain.domain.com:8080
```
Note: Default server port is 8080 and configuration port is 8081.
