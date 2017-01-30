// Hide all console logs when set to false.
var DEBUG = true;
if (!DEBUG) { console.log = function() {} };

var maxMinutesUntilNextReview = 99;

function httpGet(theUrl) {
    var xmlHttp = null;

    xmlHttp = new XMLHttpRequest();
    xmlHttp.open('GET', theUrl, false);
    xmlHttp.send(null);
    return xmlHttp.responseText;
}

function getStudyQueue(apiKey) {
    var requestURL = 'https://www.wanikani.com/api/user/' + apiKey + '/study-queue';
    return JSON.parse(httpGet(requestURL));
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
        chrome.browserAction.setIcon({path: 'icon_128_saturated.png'});
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
    console.log("Minutes until next review:", minutesUntilNextReview);
    setNewIcon(minutesUntilNextReview);

    if (minutesUntilNextReview < maxMinutesUntilNextReview) {
        // Reset alarm in a minute to update the icon.
        createCountdownAlarm(minutes(1));
    } else {
        // Reset alarm when it hits maxMinutesUntilNextReview minutes until review.
        createCountdownAlarm(minutesUntilNextReview - maxMinutesUntilNextReview);
    }
}

function updateIcon() {
  if (!localStorage.hasOwnProperty('minutesUntilNextReview')) {
    chrome.browserAction.setIcon({path: {'19': 'wanikani-no-api-key.png'}});
    chrome.browserAction.setBadgeBackgroundColor({color: [190, 190, 190, 230]});
    chrome.browserAction.setBadgeText({text:"?"});
  } else {
    var minutesUntilNextReview = localStorage.minutesUntilNextReview != '0' ? localStorage.minutesUntilNextReview : '';
    chrome.browserAction.setIcon({path: {'19': 'wanikani.png'}});
    chrome.browserAction.setBadgeBackgroundColor({color: [161, 229, 255, 255]});
    chrome.browserAction.setBadgeText({text: minutesUntilNextReview});
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
        var requestedInformation = getStudyQueue(apiKey).requested_information;

        // If no data returned, escape.
        if (!requestedInformation) {
            console.log("Failed API call. No information retrieved.");
            return;

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
