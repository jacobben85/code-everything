var page = require('webpage').create();
var fs = require('fs');

var urlList = [];
var processedUrlList = [];
var badUrls = [];
var cidCodes = [];
var processingTimes = [];
var startTime, endTime;

/**
 * Request pages and report any failing sub-requests
 * @type {Boolean}
 */
var processing = false;
loadUrl = function (address) {
    console.log("Stating processing : " + address);

    var thisProcessStartTime = new Date().getTime();

    page.onResourceReceived = function(response) {
        processing = true;
        if (response.status != 200 && response.status != 201 && response.status != 304) {
            var _urlAccess = response.url;
            console.log('Status : ' + response.status + ', URL : ' + _urlAccess.substring(0, 50) );
        }

        var urlCalled = response.url;

        if (urlCalled.indexOf('http://m.univision.com') == 0) {
            //console.log(urlCalled);
        }
    };

    page.open(address, function (status) {

        processedUrlList.push(address);

        if (status !== 'success') {
            console.log('FAIL to load the address : ' + address);
            var thisProcessEndTime = new Date().getTime();
            processingTimes.push(thisProcessEndTime - thisProcessStartTime);

            if (processing == true) {
                badUrls.push(address);
                console.log("Page load failure. 20 seconds wait time.");
                setTimeout(function(){requestPage(true); }, 20000);
            }
        } else {
            processing = false;
            console.log("Processing completed : " + address);

            var links = page.evaluate(function() {
                return [].map.call(document.querySelectorAll('a'), function(link) {
                    return link.getAttribute('href');
                });
            });

            var cid = page.evaluate(function() {
                if (typeof (cid) != 'undefined') {
                    return cid;
                }
                return false;
            });

            if (cid) {
                console.log(cid);
                cidCodes.push(cid);

                //addGenerationRequest(cid);
            }
            
            validateUrlAndAdd(links, address);
            var thisProcessEndTime = new Date().getTime();
            processingTimes.push(thisProcessEndTime - thisProcessStartTime);
        }

        requestPage();
    });
}

requestPage = function (reset) {
    if (typeof(reset) != 'undefined' && reset == true) {
        processing = false;
    }

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

// addGenerationRequest = function (cid) {
//     var generationUrl = 'http://wcm-jbjohn.univision.com/working/sendGeneration.php?object=' + cid;
//     urlList.unshift(generationUrl);
// }

addUrl = function (address) {
    address = cleanupUrl(address);
    if (processedUrlList.indexOf(address) < 0 && urlList.indexOf(address) < 0) {
        urlList.push(address);
    }
}

getUrlDomain = function(url) {
    var domain = "http://www.univision.com";

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

        if (beingProcessed.indexOf(domain) == 0) {
            addUrl(beingProcessed);
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
    console.log("Processed URL list : ");
    console.log(processedUrlList);

    console.log("Processed CID list : ");
    console.log(cidCodes);

    console.log("Bad url list : ");
    console.log(badUrls);

    console.log("Number of pages processed : " + processedUrlList.length);
    console.log("The processing took : " + (endTime - startTime)/1000 + " seconds");

    var total=0;
    for(var i in processingTimes) { total += processingTimes[i]; }

    console.log("Average page load time : " + (total/processingTimes.length)/1000 + " seconds");
}

stop = function() {

    endTime = new Date().getTime();

    printReports();
    phantom.exit();
}

start = function() {

    startTime = new Date().getTime();
    
    getUrlFromFile();
    requestPage();
}

start();