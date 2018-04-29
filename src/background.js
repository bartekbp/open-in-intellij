(function () {

  var ports = new Set();
  chrome.runtime.onConnect.addListener(function (port) {
    if (port.name !== "openinintellij") return;
    ports.add(port);
    port.onDisconnect = () => {
      console.error('disconnect', port)
      ports.delete(port);
    }
  });

  var sendMessage = function (msg) {
    if (ports.length !== 0) {
      ports.forEach(port => {
        try {
          port.postMessage(msg)
        } catch (e) {
          console.eror(port)
          console.error(e);
        }
      });
    } else {
      alert('Sorry, please open DevTools first!');
    }
  };

  const activatedTabs = new Map();
  chrome.tabs.onActivated.addListener(({tabId, windowId}) => {
    if (!tabId) {
      return;
    }

    let windowActivatedTabs = activatedTabs.get(windowId);
    if (!windowActivatedTabs) {
      windowActivatedTabs = [];
    }

    windowActivatedTabs.push(tabId);
    if (windowActivatedTabs.length > 10) {
      windowActivatedTabs.shift();
    }

    activatedTabs.set(windowId, [...windowActivatedTabs]);
  });

  chrome.tabs.onRemoved.addListener((tabId, {windowId}) => {
    const windowActivatedTabs = activatedTabs.get(windowId) || [];
    activatedTabs.set(windowId, windowActivatedTabs.filter(activeTab => activeTab !== tabId));
  });

  chrome.windows.onRemoved.addListener(windowId => {
    activatedTabs.delete(windowId);
  });

  chrome.tabs.onCreated.addListener(function (tab) {
    if (tab && tab.url) {
      var url = tab.url; // http://openfile/?/Users/johnny/Coding/_Tools/chrome-openinintellij/src/openinide.js&200
      if (url.startsWith('http://localhost/openinintellij.extension')) {

        chrome.tabs.remove(tab.id);
        const activeTabs = activatedTabs.get(tab.windowId) || [];
        const activeNotNewlyCreatedTab = activeTabs.filter(activeTab => activeTab.id !== tab.id);
        if(activeNotNewlyCreatedTab.length !== 0) {
          const tabToActivate = activeNotNewlyCreatedTab.pop();
          chrome.tabs.update(tabToActivate, {
            active: true,
          });
        }

        var parts = url.split('?');
        var params = parts[1].split('&');
        var filePath = params[0].split("=")[1];
        var lineNumber = params[1].split("=")[1];

        sendMessage({
          file: filePath,
          line: lineNumber
        });
      }

    }
  });


})();