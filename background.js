// Hide all console logs when set to false.
var DEBUG = true;
if (!DEBUG) {
  console.log = function() {};
}

var maxMinutesUntilNextReview = 99;
var wanikaniReviewUrl = 'https://www.wanikani.com/review/';

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
  var minutesUntilNextReview = Math.max(0, Math.floor((nextReviewDate - currentTime) / 60));

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
}

function createCountdownAlarm(minutesAway) {
  // Set a countdown alarm X minutes away.
  chrome.alarms.create("countdown", {when: Date.now() + minutesAway});
  console.log("Alarm to activate in", minutesAway, "minutes.");
}

function goToWanikani() {
  chrome.tabs.query({
      url: wanikaniReviewUrl
  }, function (tabs) {
    var tab = tabs[0];
    if (tab !== undefined) {
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

function scheduleRequest() {
  chrome.alarms.create('refresh', {periodInMinutes: 1});
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
  chrome.browserAction.onClicked.addListener(goToWanikani());

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
