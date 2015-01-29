var page = require('webpage').create(),
    system = require('system'),
    t, address;

page.settings.userName = 'debug';
page.settings.password = 'Xoong1ee';

var displayRequests = "";
var blockedDomains = ["m.univision.com"];
var requestTracker  = [];


page.onResourceReceived = function(response) {
    processing = true;
    var _urlAccess = response.url;

    if (response.status !== 200 && response.status !== 201 && response.status !== 304 && response.status !== null) {

        console.log('Status : ' + response.status + ', ID : ' + response.id + ', URL : ' + _urlAccess.substring(0, 50) );
    }

    var currentTime = new Date().getTime();
    var processingTime = (currentTime - requestTracker[response.id]);
    if (processingTime > 1000) {
        console.log(processingTime + 'ms:'+_urlAccess);
    }
};

page.onResourceRequested = function(requestData, networkRequest) {

    if (displayRequests.length > 0) {
        var regex = new RegExp(displayRequests, "g");
        var match = requestData.url.match(regex);
        if (match !== null) {
            console.log(decodeURIComponent(requestData.url));
        }
    }

    if (blockedDomains.length > 0) {
        var arrayLength = blockedDomains.length;
        for (var i = 0; i < arrayLength; i++) {
            var regex = new RegExp(blockedDomains[i], "g");
            var match = requestData.url.match(regex);
            if (match !== null) {
                networkRequest.abort();
            }
        }
    }

    requestTracker[requestData.id] = new Date().getTime();
};

if (system.args.length === 1) {
    console.log('Usage: phantomjs secure-page.js <some URL>');
    phantom.exit();
} else {
    t = Date.now();
    address = system.args[1];
    page.open(address, function (status) {
        if (status !== 'success') {
            console.log('FAIL to load the address');
        } else {
            t = Date.now() - t;
            console.log('Page title is ' + page.evaluate(function () {
                return document.title;
            }));
            console.log('Loading time ' + t + ' msec');
        }
        phantom.exit();
    });
}