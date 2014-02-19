// Hide all console logs when set to false.
var DEBUG = true;
if (!DEBUG) { console.log = function() {} };

var apiKey = 'fdc6a0be3d5663f9dc8b6e641d55a514';
var maxMinutesUntilNextReview = 60;

function httpGet(theUrl) {
    var xmlHttp = null;

    xmlHttp = new XMLHttpRequest();
    xmlHttp.open('GET', theUrl, false);
    xmlHttp.send(null);
    return xmlHttp.responseText;
}

function getStudyQueue(apiKey) {
    var requestURL = 'https://www.wanikani.com/api/user/' + apiKey + '/study-queue';
    console.log("Success API call");
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

function setReviewCount(reviewsAvailable) {
    chrome.storage.sync.set({"reviewsAvailable": reviewsAvailable});
    if (reviewsAvailable > 0) {
        // If reviews are available, change icon to saturated.
        chrome.browserAction.setIcon({path: 'icon_128.png'});
        showNotification();
    }
}

// If notifications are enabled, display a notification.
function showNotification() {
    var notification = webkitNotifications.createNotification(
        "icon_128.png",
        "WaniKani",
        "You have new reviews on WaniKani!"
    );
    notification.show();
}

function minutes(number) {
    // (seconds in a minute) * (miliseconds in a second) * number of minutes you need
    return 60 * 1000 * number;
}

function setMinutesUntilNextReview(nextReviewDate) {
    // First, calculate minutes until next review.
    var currentTime = Date.now().toString().substring(0, 10); // WaniKani doesn't give miliseconds.
    var minutesUntilNextReview = Math.floor((requestedInformation.next_review_date - currentTime) / 60);

    // Then, set it in storage and change the icon.
    chrome.storage.sync.set({"minutesUntilNextReview": minutesUntilNextReview});
    console.log("Set minutes until next review:", minutesUntilNextReview);
    chrome.browserAction.setIcon({path: 'timer.png'});

    if (minutesUntilNextReview < maxMinutesUntilNextReview) {
        // Reset alarm for 60 seconds from now to update icon.
        createCountdownAlarm(minutes(1));
    } else {
        // Reset alarm when it hits maxMinutesUntilNextReview minutes until review.
        createCountdownAlarm(minutesUntilNextReview - maxMinutesUntilNextReview);
    }
}

function createCountdownAlarm(minutesAway) {
    // Set a countdown alarm X minutes away.
    chrome.alarms.create("countdown", {when: Date.now() + minutesAway});
    console.log("Alarm to activate in how many minutes?", minutesAway);
}

function init() {
    // Get API key from Chrome's storage.
    chrome.storage.sync.get("apiKey", function(data) {
        // If the API key isn't set, we can't do anything
        handleNoAPIKey();

        // Retrieve data from the API.
        requestedInformation = getStudyQueue(apiKey).requested_information;

        // Set the review count or time until next review.
        if (requestedInformation.reviews_available) {
            setReviewCount(requestedInformation.reviews_available);
        } else {
            setMinutesUntilNextReview(requestedInformation.next_review_date);
        }
    });
}

chrome.alarms.onAlarm.addListener(function(alarm) {
    // TODO: Ignore the initial listen when the first alarm is created.
    if (alarm.name == 'countdown') {
        console.log("Countdown alarmed was called by a listener.");
        // Update local storage.
        chrome.storage.sync.get('minutesUntilNextReview', function(data) {
            // Decrement time until next review in storage.
            chrome.storage.sync.set({'minutesUntilNextReview': data.minutesUntilNextReview - 1});
            console.log("Minutes until next review:", data.minutesUntilNextReview);
            // Set the alarm to decrement in 1 minute.
            if (data.minutesUntilNextReview > 0) {
                chrome.alarms.create("countdown", {when: Date.now() + minutes(1)});
                console.log("Set alarm for timer to update next minute.");
            } else {
                showNotification();
                // TODO: It should update localstorage with reviews available.
                // You need an API call to retrieve the latest amount.
            }
        });
    }
});

init();
