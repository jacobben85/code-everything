var webPage = require('webpage');
var fs = require('fs');

var urlList = [], processedUrlList = [], badUrls = [], cidCodes = [], processingTimes = [];
var generationList = [], generatedList = [], longRunningUrls = [], abortedUrls = [];
var requestTracker = [], startTime, endTime;

var enableDigging = false;
var enableGeneration = false;
var takeScreenShot = false;
var displayRequests = "";
var blockedDomains = ["m.univision.com", "adfarm.mediaplex.com", "adclick.g.doubleclick.net", "survey.112.2o7.net", 
                        "pubads.g.doubleclick.net", "macads.univision.com", "pix04.revsci.net", "www.google-analytics.com", 
                        "tpc.googlesyndication.com", "ping.chartbeat.net"];

/**
 * Request pages and report any failing sub-requests
 * @type {Boolean}
 */
var processing = false;

var username = "", password = "";

/**
 * loadUrl method
 * 
 * @param address    the url that is being requested
 * @param enableLogs enabled/disable logs
 */
loadUrl = function (address, enableLogs) {

    var page = webPage.create();

    if (username !== "") {
        page.settings.userName = username;
        page.settings.password = password;        
    }


    if (typeof (enableLogs) == 'undefined') {
        enableLogs = true;
    }

    if (enableLogs) console.log("Stating processing : " + address);

    var thisProcessStartTime = new Date().getTime();

    /**
     * On Resource Received
     */
    page.onResourceReceived = function(response) {
        processing = true;
        var _urlAccess = response.url;

        if (response.status != 200 && response.status != 201 && response.status != 304 && response.status != null) {
            
            if (enableLogs) console.log('Status : ' + response.status + ', ID : ' + response.id + ', URL : ' + _urlAccess.substring(0, 50) );

            if (address == _urlAccess) {
                addToList(badUrls, address);
            }
        }

        var currentTime = new Date().getTime();
        var processingTime = (currentTime - requestTracker[response.id]);
        if (processingTime > 1000) {
            if (enableLogs) { 
                longRunningUrls.push(processingTime + 'ms:'+_urlAccess);
            }
        }
    };

    /**
     * On Resource Requested
     */
    page.onResourceRequested = function(requestData, networkRequest) {
        
        if (displayRequests.length > 0) {
            var regex = new RegExp(displayRequests, "g");
            var match = requestData.url.match(regex);
            if (match != null) {
                console.log(decodeURIComponent(requestData.url));
            }
        }

        if (blockedDomains.length > 0) {
            var arrayLength = blockedDomains.length;
            for (var i = 0; i < arrayLength; i++) {
                var regex = new RegExp(blockedDomains[i], "g");
                var match = requestData.url.match(regex);
                if (match != null) {
                    if (enableLogs) { 
                        abortedUrls.push(decodeURIComponent(requestData.url));
                    }
                    networkRequest.abort();
                }
            }
        }

        requestTracker[requestData.id] = new Date().getTime();

    };

    /**
     * Phantom JS request opening request.
     */
    page.open(address, function (status) {

        if (enableLogs) processedUrlList.push(address);

        if (status !== 'success') {
            if (enableLogs) console.log('FAIL to load the address : ' + address);
            var thisProcessEndTime = new Date().getTime();
            processingTimes.push(thisProcessEndTime - thisProcessStartTime);

            if (processing == true) {
                badUrls.push(address);
                if (enableLogs) console.log("Page load failure. 20 seconds wait time.");
                setTimeout(function(){page.close();requestPage(true); }, 20000);
            }
        } else {
            processing = false;
            if (enableLogs) console.log("Processing completed : " + address);

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

            if (cid && enableLogs) {
                console.log(cid);
                cidCodes.push(cid);

                if(enableGeneration) addGenerationRequest(cid);
            }
            
            if (enableLogs) {
                if (enableDigging) validateUrlAndAdd(links, address, enableLogs);
                var thisProcessEndTime = new Date().getTime();
                processingTimes.push(thisProcessEndTime - thisProcessStartTime);
            }

            if (enableLogs && takeScreenShot) {
                var fileName = processedUrlList.length;
                page.render(fileName + getUrlDomain(address).replace('http://', '').replace(/\./g, '-') + ".png");
            }
        }

        /**
         * Close the running Phantom JS page
         */
        page.close();
        requestPage();
    });
};

/**
 * Page requester
 * 
 * Decides if the next page is ready or look up for more Url requests
 * @param reset
 */
requestPage = function (reset) {

    requestTracker = [];

    if (typeof(reset) != 'undefined' && reset == true) {
        processing = false;
    }

    if (urlList.length < 1) {
        stop();
    }

    if (generationList.length > 0) {
        var genUrl = generationList.shift();
        generatedList.push(genUrl);
        loadUrl(genUrl, false);
    } else if (processing == false) {
        loadUrl(urlList.shift());
    }
};

/**
 * Clean up Urls -
 * 
 * Remove the query params
 * 
 * @param url
 * @returns
 */
cleanupUrl = function(url) {
    if (url.indexOf('?') > -1) {
        url = url.split("?")[0];
    }

    if (url.charAt(url.length - 1) == '/') {
        url = url.substr(0, url.length - 1);
    }

    return url;
};

/**
 * Generation requester - specific to WCM generation
 * @param cid
 */
addGenerationRequest = function (cid) {
    var generationUrl = 'http://wcm-jbjohn.univision.com/working/sendGeneration.php?object=' + cid;

    if (generatedList.indexOf(generationUrl)) {
        generationList.push(generationUrl);
    }
};

/**
 * Add Url to array of urls to be processed
 * @param address
 */
addUrl = function (address) {
    address = cleanupUrl(address);
    if (processedUrlList.indexOf(address) < 0 && urlList.indexOf(address) < 0) {
        urlList.push(address);
    }
};

/**
 * Method to make life easy, add an item to an array
 * @param list
 * @param address
 */
addToList = function (list, address) {
    address = cleanupUrl(address);
    if (list.indexOf(address) < 0) {
        list.push(address);
    }
};

/**
 * Strip the domain name from a URL - regex its bad
 * @param url
 * @returns {String}
 */
getUrlDomain = function(url) {
    var domain = "http://www.univision.com";

    var match = url.match('^http:\/\/(.*)\.(com|org)/?(.*)');
    if (match.length > 2) {
        domain = 'http://' + match[1] + '.' + match[2];
    }
    return domain;
};

/**
 * Add to the urls to be processed, after checking it was processed already once
 * @param links
 * @param requester
 * @param enableLogs
 */
validateUrlAndAdd = function (links, requester, enableLogs) {

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

    if (enableLogs) console.log(urlList.length);
};

/**
 * File reader - that is how we start now. 
 */
getUrlFromFile = function () {
    var file_h = fs.open('file.txt', 'r');
    var line = file_h.readLine();

    while(line) {
        addUrl(line);
        line = file_h.readLine();
    }
    file_h.close();
};

/**
 * Print reports
 */
printReports = function () {
    console.log("Processed URL list : ");
    console.log(processedUrlList);

    console.log("Processed CID list : ");
    console.log(cidCodes);

    console.log("Bad url list : ");
    console.log(badUrls);

    console.log("Number of pages processed : " + processedUrlList.length);
    console.log("The processing took : " + (endTime - startTime)/1000 + " seconds");

    var total=0, avg=0;
    for(var i in processingTimes) { total += processingTimes[i]; }

    if (total > 0) {
        avg = (total/processingTimes.length)/1000;
    }

    console.log("Average page load time : " + avg + " seconds");

    console.log("Pages with long response times ");
    console.log(longRunningUrls);
};

/**
 * On end process
 */
stop = function() {

    endTime = new Date().getTime();

    printReports();
    phantom.exit();
};

/**
 * On process start
 */
start = function() {

    startTime = new Date().getTime();
    
    getUrlFromFile();
    requestPage();
};

/**
 * Start from here - initial request.
 */
start();
