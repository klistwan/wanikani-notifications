function saveAPIKey(e) {
  e.preventDefault();

  var quietHours = document.getElementById('apiKey').value;

  chrome.storage.sync.set({
    apiKey: apiKey
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
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
  document.getElementById('optionsForm').addEventListener('submit', saveOptions);
}

main();