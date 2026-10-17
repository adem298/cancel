// Injected on demand (activeTab + scripting) when the customer clicks a step in the popup.
// It clicks one element the customer has approved and reports back. It never reads page data.
(() => {
  if (window.__stopbillContentLoaded) return;
  window.__stopbillContentLoaded = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'stopbill:click') return false;
    try {
      const element = document.querySelector(message.selector);
      if (!element) {
        sendResponse({ ok: false, error: 'That button was not found on this page. Do this step manually, then continue.' });
        return false;
      }
      element.click();
      sendResponse({ ok: true });
    } catch {
      sendResponse({ ok: false, error: 'This step is not valid for the page. Check the adapter definition.' });
    }
    return false;
  });
})();
