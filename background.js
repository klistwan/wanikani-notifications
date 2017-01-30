// Hide all console logs when set to false.
var DEBUG = true;
if (!DEBUG) {
  console.log = function() {};
}

var options = {
  apiKey: ''
};

var wanikaniReviewUrl = 'https://www.wanikani.com/review/';

function httpGet(theUrl) {
  var xmlHttp = null;
  xmlHttp = new XMLHttpRequest();
  xmlHttp.open('GET', theUrl, false);
  xmlHttp.send(null);
  return xmlHttp.responseText;
}

function getNextReviewDate() {
  var requestURL = 'https://www.wanikani.com/api/user/' + options.apiKey + '/study-queue';
  console.log("Retrieved next review date from the WaniKani API.");
  return JSON.parse(httpGet(requestURL)).requested_information.next_review_date;
}

function getMinutesUntilNextReview() {
  var nextReviewDate = getNextReviewDate();
  var currentTime = Math.floor(Date.now() / 1000);
  var minutesUntilNextReview = Math.ceil((nextReviewDate - currentTime) / 60);
  return Math.max(0, minutesUntilNextReview);
}

function updateIcon() {
  if (!localStorage.hasOwnProperty('minutesUntilNextReview')) {
    console.log("Don't have minutes until next review in storage. :(");
    chrome.browserAction.setIcon({path: {'19': 'wanikani-no-api-key.png'}});
    chrome.browserAction.setBadgeBackgroundColor({color: [190, 190, 190, 230]});
    chrome.browserAction.setBadgeText({text:"?"});
  } else {
    chrome.browserAction.setIcon({path: {'19': 'wanikani-api-key.png'}});
    chrome.browserAction.setBadgeBackgroundColor({color: [255, 29, 0, 255]});
    chrome.browserAction.setBadgeText({text: localStorage.minutesUntilNextReview});
    console.log("Updated minutes until next review:", localStorage.minutesUntilNextReview);
  }
}

function goToWanikani() {
  chrome.tabs.query({
      url: wanikaniReviewUrl
  }, function (tabs) {
    var tab = tabs[0];
    if (tab !== undefined) {
      chrome.tabs.update(tab.id, { selected: true });
      chrome.windows.update(tab.windowId, { "focused": true });
      startRequest({ scheduleRequest: false });
      return;
    } else {
    chrome.tabs.create({ url: wanikaniReviewUrl });
    }
  });
}

function scheduleRequest() {
  chrome.alarms.create('refresh', {periodInMinutes: 1});
}

function updateMinutesUntilNextReview(minutes) {
  localStorage.minutesUntilNextReview = minutes;
  updateIcon();
}

function startRequest(params) {
  if (params && params.scheduleRequest) scheduleRequest();
  var minutes = getMinutesUntilNextReview();
  console.log("Got minutes until next review:", minutes);
  updateMinutesUntilNextReview(minutes);
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

function getAPIKey() {
  chrome.storage.sync.get(['apiKey'], function(items) {
    if (items.apiKey) {
      return items.apiKey;
    } else {
      console.log("No API key retrieved. Opening up options.html.");
      chrome.tabs.create({ 'url': 'chrome://extensions/?options=' + chrome.runtime.id });
    }
  });
}

function loadOptions(callback) {
  if (!chrome || !chrome.storage || !chrome.storage.sync) {
    callback(false);
    return;
  }

  chrome.storage.sync.get({
    apiKey: ''
  }, function(items) {
    options.apiKey = items.apiKey;
    callback(true);
  });
}

function refresh() {
  startRequest({scheduleRequest: true});
}

function main() {
  chrome.alarms.onAlarm.addListener(onAlarm);
  chrome.browserAction.onClicked.addListener(goToWanikani);

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