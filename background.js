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

function getNextReviewDate() {
  var requestURL = 'https://www.wanikani.com/api/user/' + localStorage.get(apiKey) + '/study-queue';
  console.log("Retrieved next review date from the WaniKani API.");
  return JSON.parse(httpGet(requestURL)).requested_information.next_review_date;
}

function updateIcon() {
  if (!localStorage.hasOwnProperty('minutesUntilNextReview')) {
    console.log("Don't have minutes until next review in storage. :(");
    chrome.browserAction.setIcon({path: {'19': 'wanikani-no-api-key.png'}});
    chrome.browserAction.setBadgeBackgroundColor({color: [190, 190, 190, 230]});
    chrome.browserAction.setBadgeText({text:"?"});
  } else {
    chrome.browserAction.setIcon({path: {'19': 'wanikani.png'}});
    chrome.browserAction.setBadgeBackgroundColor({color: [161, 229, 255, 255]});
    chrome.browserAction.setBadgeText({text: localStorage.minutesUntilNextReview});
    console.log("Updated minutes until next review:", localStorage.minutesUntilNextReview);
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

function onAlarm(alarm) {
  if (alarm && alarm.name == 'watchdog') {
    onWatchdog();
  } else {
    startRequest({scheduleRequest:true});
  }
}

function onWatchdog() {
  chrome.alarms.get('refresh', function(alarm) {
    if (!alarm) {
      startRequest({scheduleRequest:true});
    }
  });
}

function getAPIkey(callback) {
  apiKey = chrome.storage.sync.get(apiKey);
  if (!apiKey) {
    chrome.tabs.create({ 'url': 'chrome://extensions/?options=' + chrome.runtime.id });
  }
  return apiKey;
}

function refresh() {
  startRequest({scheduleRequest: true});
}

function main() {
  chrome.alarms.onAlarm.addListener(onAlarm);
  chrome.browserAction.onClicked.addListener(goToWanikani());

  chrome.runtime.onStartup.addListener(function() {
    startRequest({scheduleRequest:false});
    updateIcon();
  });
}

main();
