// Hide all console logs when set to false.
var DEBUG = true;
if (!DEBUG) { console.log = function() {} };

var maxMinutesUntilNextReview = 99;
var wanikaniReviewUrl = 'https://www.wanikani.com/review/';
var wanikaniHomeUrl = 'https://www.wanikani.com/';

function httpGet(theUrl) {
  var xmlHttp = null;
  xmlHttp = new XMLHttpRequest();
  xmlHttp.open('GET', theUrl, false);
  xmlHttp.send(null);
  return xmlHttp.responseText;
}

function getStudyQueue(APIKey) {
  var requestURL = 'https://www.wanikani.com/api/user/' + APIKey + '/study-queue';
  return JSON.parse(httpGet(requestURL));
}

function convertMinutesToMiliseconds(numberOfMinutes) {
  // (seconds in a minute) * (miliseconds in a second) * number of minutes
  return 60 * 1000 * numberOfMinutes;
}

function setMinutesUntilNextReview(nextReviewDate) {
  // First, calculate minutes until next review.
  var currentTime = Date.now().toString().substring(0, 10); // WaniKani doesn't give miliseconds.
  var minutesUntilNextReview = max(0, Math.floor((requestedInformation.next_review_date - currentTime) / 60));

  // Update icon.
  chrome.storage.sync.set({"minutesUntilNextReview": minutesUntilNextReview});
  console.log("Saved the number of minutes until the next review:", minutesUntilNextReview);
  updateIcon();

  // Set alarm.
  // TODO: Handle case where minutesUntilNextReview = 0.
  if (minutesUntilNextReview < maxMinutesUntilNextReview) {
    // Reset alarm in a minute to update the icon.
    createCountdownAlarm(convertMinutesToMiliseconds(1));
  } else {
    // Reset alarm when it hits maxMinutesUntilNextReview minutes until review.
    createCountdownAlarm(minutesUntilNextReview - maxMinutesUntilNextReview);
  }
  // Save it in storage.
  chrome.storage.sync.set({"minutesUntilNextReview": minutesUntilNextReview});
}

function updateIcon() {
  if (!localStorage.hasOwnProperty('minutesUntilNextReview')) {
  chrome.browserAction.setIcon({path: {'19': 'wanikani-no-api-key.png'}});
  chrome.browserAction.setBadgeBackgroundColor({color: [190, 190, 190, 230]});
  chrome.browserAction.setBadgeText({text:"?"});
  } else {
  chrome.browserAction.setIcon({path: {'19': 'wanikani.png'}});
  chrome.browserAction.setBadgeBackgroundColor({color: [161, 229, 255, 255]});
  chrome.browserAction.setBadgeText({text: localStorage.minutesUntilNextReview});
}

function createCountdownAlarm(minutesAway) {
  // Set a countdown alarm X minutes away.
  chrome.alarms.create("countdown", {when: Date.now() + minutesAway});
  console.log("Alarm to activate in", minutesAway, "minutes.");;
}

function openOptionsPage(){
  var optionsUrl = chrome.extension.getURL('options.html');
  chrome.tabs.query({url: optionsUrl}, function(tabs) {
  if (tabs.length) {
    chrome.tabs.update(tabs[0].id, {active: true});
  } else {
    chrome.tabs.create({url: optionsUrl});
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

function goToWanikani() {
  chrome.tabs.query({
      url: wanikaniReviewUrl
  }, function (tabs) {
    var tab = tabs[0];
    if (tab != undefined) {
      chrome.tabs.update(tab.id, { selected: true });
      chrome.windows.update(tab.windowId, { "focused": true });
      startRequest({ scheduleRequest: false, showLoadingAnimation: false });
      return;
    }
    chrome.tabs.create({ url: wanikaniReviewUrl });
  });
}

function refresh() {
  startRequest({scheduleRequest: true, showLoadingAnimation: false});
}

function startRequest(params) {
  if (params && params.scheduleRequest) scheduleRequest();
  getMinutesUntilReview(
    function(count) {
      updateMinutesUntilReview(count);
    },
    function() {
      updateIcon();
    }
  );
}

function main() {
  chrome.alarms.onAlarm.addListener(onAlarm);
  chrome.browserAction.onClicked.addListener(goToInbox);

  chrome.runtime.onStartup.addListener(function() {
    startRequest({scheduleRequest:false});
    updateIcon();
  });

  loadOptions(function () {
    refresh();
    chrome.storage.onChanged.addListener(function(changes, namespace) {
      loadOptions(function () {
        refresh();
      });
    });
  });
}




main();
