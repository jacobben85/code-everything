var page = require('webpage').create();
var fs = require('fs');

var urlList = [];
var processedUrlList = [];
var badUrls = [];

/**
 * Request pages and report any failing sub-requests
 * @type {Boolean}
 */
var processing = false;
loadUrl = function (address) {
    console.log("Stating processing : " + address);
    page.onResourceReceived = function(response) {
        processing = true;
        if (response.status != 200) {
            var _urlAccess = response.url;
            console.log('Status : ' + response.status + ', URL : ' + _urlAccess.substring(0, 50) );
        }
    };

    page.open(address, function (status) {

        processedUrlList.push(address);

        if (status !== 'success') {
            console.log('FAIL to load the address');
        } else {
            processing = false;
            console.log("Processing completed : " + address);

            var links = page.evaluate(function() {
                return [].map.call(document.querySelectorAll('a'), function(link) {
                    return link.getAttribute('href');
                });
            });

            validateUrlAndAdd(links, address);
        }

        requestPage();
    });
}

requestPage = function () {
    if (urlList.length < 1) {
        stop();
    }

    if (processing == false) {
        loadUrl(urlList.shift());
    }
}

cleanupUrl = function(url) {
    if (url.indexOf('?') > -1) {
        url = url.split("?")[0];
    }

    if (url.charAt(url.length - 1) == '/') {
        url = url.substr(0, url.length - 1);
    }

    return url;
}

addUrl = function (address) {
    address = cleanupUrl(address);
    if (processedUrlList.indexOf(address) < 0 && urlList.indexOf(address) < 0) {
        urlList.push(address);
    }
}

getUrlDomain = function(url) {
    var domain = "http://www.google.com";

    var match = url.match('^http:\/\/(.*)\.(com|org)/?(.*)');
    if (match.length > 2) {
        domain = 'http://' + match[1] + '.' + match[2];
    }
    return domain;
}

validateUrlAndAdd = function (links, requester) {
    for (var i = 0; i < links.length; i++) {
        var beingProcessed = links[i];

        if (beingProcessed.charAt(0) == '/') {
            beingProcessed = requester + beingProcessed;
        }

        var domain = getUrlDomain(requester);

        if (beingProcessed.indexOf(domain) > -1) {
            addUrl(beingProcessed.substring(0, 100));
        }
    }

    console.log(urlList.length);
}

getUrlFromFile = function () {
    var file_h = fs.open('file.txt', 'r');
    var line = file_h.readLine();

    while(line) {
        addUrl(line);
        line = file_h.readLine();
    }
    file_h.close();
}

printReports = function () {
    console.log(processedUrlList);
}

stop = function() {
    printReports();
    phantom.exit();
}

start = function() {
    getUrlFromFile();
    requestPage();
}

start();