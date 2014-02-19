function httpGet(theUrl) {
    var xmlHttp = null;

    xmlHttp = new XMLHttpRequest();
    xmlHttp.open('GET', theUrl, false);
    xmlHttp.send(null);
    return xmlHttp.responseText;
}

var apiKey = 'fdc6a0be3d5663f9dc8b6e641d55a514';

function getStudyQueue(apiKey) {
    var requestURL = 'https://www.wanikani.com/api/user/' + apiKey + '/study-queue';
    return JSON.parse(httpGet(requestURL));
}

function getRequestedInformation(request) {
    return request.requested_information;
}

function handleNoAPIKey() {
    if (!apiKey) {
        chrome.browserAction.setTitle({"title": "Click to add your API key!"});
    }
}

// Set the number of reviews available and notify the user.
function setReviewCount(reviewsAvailable) {
    chrome.storage.local.set({"reviewsAvailable": reviewsAvailable});
    if (reviewsAvailable > 0) {
        // showNotification();
        // If reviews are available, change icon to saturated.
        chrome.browserAction.setIcon({path: 'icon_128.png'});
    } else {
        // If none are available, change icon to desaturated.
        chrome.browserAction.setIcon({path: 'icon_128_desaturated.png'});
    }
}

chrome.browserAction.onClicked.addListener(function() {
    // TOOD: Only let this happen when the user has reviews.
    chrome.tabs.create({url: "https://www.wanikani.com"});
});

// If notifications are enabled, display a notification.
function showNotification() {
    var notification = webkitNotifications.createNotification(
        "icon_128.png",
        "WaniKani",
        "You have new reviews on WaniKani!"
    );
    notification.show();
}

function init() {
    // Get API key from Chrome's storage.
    chrome.storage.sync.get("apiKey", function(data) {
        // If the API key isn't set, we can't do anything
        handleNoAPIKey();

        // Retrieve data from the API.
        requestedInformation = getStudyQueue(apiKey).requested_information;

        // Set the review count
        setReviewCount(requestedInformation.reviews_available);

        // Set the next review date
        var nextReviewTime = requestedInformation.next_review_date;
        chrome.storage.local.set({"nextReviewTime": nextReviewTime});

        // Schedule the next refresh
        chrome.alarms.create("refresh", {when: nextReviewTime} );
    });
}

// When a "refresh" alarm goes off, fetch new data.
chrome.alarms.onAlarm.addListener(function(alarm) {
    if (alarm.name === "refresh") {
        init();
    }
});

init();
