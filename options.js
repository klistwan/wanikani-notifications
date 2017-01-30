function restoreAPIKey() {
  chrome.storage.sync.get({
    apiKey: '0',
  }, function(items) {
    document.getElementById('apiKey').value = items.apiKey;
  });
}

function saveAPIKey(e) {
  e.preventDefault();

  var apiKey = document.getElementById('apiKey').value;

  chrome.storage.sync.set({
    apiKey: apiKey
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'API key saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 3000);
  });

  return false;
}

function main() {
  if (!chrome || !chrome.storage || !chrome.storage.sync) {
    var status = document.getElementById('status');
    status.style.cssText = 'color:red;';
    status.textContent = 'Error: Could not load settings. Please upgrade Chrome.';
    return;
  }
  document.getElementById('optionsForm').addEventListener('submit', saveAPIKey);
  document.addEventListener('DOMContentLoaded', restoreAPIKey);
}

main();