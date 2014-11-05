code-everything
===============

Requires Phantomjs setup
    refer http://phantomjs.org/download.html
    
To run the script
'phantomjs header.js'

To update the Urls to be digged
update the file.txt

Configurations and settings

var enableDigging = false;     // True or False to enable or disable crawling the site

var enableGeneration = false;  // Enable/Disable generation - specific for my proj

var takeScreenShot = false;    // True to have screen shots taken for completed page requests

var displayRequests = "";      // If needs to log requests - when the string matches the URL

var blockedDomains = ["m.univision.com"]; // Urls requests to be blocked for instance, Ad calls.
