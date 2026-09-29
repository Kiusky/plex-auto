let ignoredUsers = [];
let blockedUsers = [];
let maxSessions = 2;
let stopMessage = '';
let blockedMessage = '';
let enabled = false;

function normalizeName(name) {
  return name.trim().toLowerCase();
}

function loadSettings() {
  chrome.storage.local.get(
    ['ignoredUsers', 'blockedUsers', 'maxSessions', 'stopMessage', 'blockedMessage', 'extensionEnabled'],
    (result) => {
      ignoredUsers = (result.ignoredUsers || []).map(name => normalizeName(name));
      blockedUsers = (result.blockedUsers || []).map(name => normalizeName(name));
      maxSessions = result.maxSessions || 2;
      stopMessage = result.stopMessage || '';
      blockedMessage = result.blockedMessage || '';
      enabled = result.extensionEnabled !== undefined ? result.extensionEnabled : false;

      if (enabled) {
        scanAndKill();
      }
    }
  );
}

chrome.storage.onChanged.addListener(() => {
  loadSettings();
});

function scanAndKill() {
  if (!enabled) {
    return;
  }

  const allTiles = document.querySelectorAll('[class*="SessionTile"]');
  const sessionCards = [];

  allTiles.forEach(el => {
    const userNameEl = el.querySelector('[class*="username"]');
    const stopBtn = el.querySelector('[class*="stopButton"]');

    if (userNameEl && stopBtn) {
      sessionCards.push(el);
    }
  });

  const userCount = {};

  sessionCards.forEach(card => {
    const userName = getUserName(card);
    if (!userName) return;

    const normalized = normalizeName(userName);

    if (ignoredUsers.includes(normalized)) {
      return;
    }

    if (blockedUsers.includes(normalized)) {
      return;
    }

    userCount[normalized] = (userCount[normalized] || 0) + 1;
  });

  sessionCards.forEach(card => {
    const userName = getUserName(card);
    if (!userName) return;

    const normalized = normalizeName(userName);
    const stopBtn = getStopButton(card);

    if (!stopBtn) return;

    if (ignoredUsers.includes(normalized)) {
      return;
    }

    if (blockedUsers.includes(normalized)) {
      killSession(stopBtn, blockedMessage);
      return;
    }

    const count = userCount[normalized] || 0;

    if (count > maxSessions) {
      killSession(stopBtn, stopMessage);
    }
  });
}

function killSession(stopBtn, message) {
  stopBtn.click();

  setTimeout(() => {
    const modal = document.querySelector(
      'div.Modal-modalBackdrop-B7kPM7, div[class*="Modal"], div[role="dialog"]'
    );

    if (!modal) {
      return;
    }

    setTimeout(() => {
      if (message) {
        let messageField =
          modal.querySelector('#message') ||
          modal.querySelector('textarea.StopServerSessionModal-textArea-ixgccA') ||
          modal.querySelector('textarea[name="message"]') ||
          modal.querySelector('textarea[data-autofocus="true"]') ||
          modal.querySelector('textarea');

        if (messageField) {
          messageField.focus();
          messageField.value = message;

          ['input', 'change'].forEach(eventType => {
            messageField.dispatchEvent(
              new Event(eventType, { bubbles: true })
            );
          });
        }
      }

      setTimeout(() => {
        let confirmButton = modal.querySelector('button.Button-primary-cMdkLb');

        if (!confirmButton) {
          const buttons = modal.querySelectorAll('button');

          for (let btn of buttons) {
            if (btn.textContent.trim() === 'Parar') {
              confirmButton = btn;
              break;
            }
          }
        }

        if (confirmButton) {
          confirmButton.click();
        }
      }, 200);
    }, 200);
  }, 300);
}

function getUserName(card) {
  const selectors = [
    '.SessionTile-username-gKJCVh',
    '[class*="username"]',
    '[class*="Username"]',
    '.sc-dxgOiQ',
    'div[class*="name"]',
    'span[class*="name"]'
  ];

  for (let sel of selectors) {
    const el = card.querySelector(sel);

    if (el && el.textContent) {
      return el.textContent.trim();
    }
  }

  const possible = card.querySelectorAll('div, span');

  for (let el of possible) {
    const text = el.textContent.trim();

    if (
      text &&
      text.length >= 3 &&
      text.length < 30 &&
      /^[a-zA-ZÀ-ÿ\s]+$/.test(text)
    ) {
      return text;
    }
  }

  return null;
}

function getStopButton(card) {
  const selectors = [
    '.SessionTile-stopButton-mlLWNk',
    '[class*="stopButton"]',
    '[class*="StopButton"]',
    'button[aria-label*="stop"]',
    'button[aria-label*="Stop"]',
    'button[class*="stop"]'
  ];

  for (let sel of selectors) {
    const btn = card.querySelector(sel);

    if (btn) {
      return btn;
    }
  }

  return null;
}

loadSettings();

const observer = new MutationObserver(() => {
  scanAndKill();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

function autoCloseModal() {
  const svg = document.querySelector('#plex-icon-remove-560');

  if (svg) {
    const closeButton = svg.closest('button');

    if (closeButton) {
      closeButton.click();
    }
  }
}

const closeObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.id === 'plex-icon-remove-560') {
            const button = node.closest('button');

            if (button) {
              button.click();
            }
          } else {
            const svg = node.querySelector('#plex-icon-remove-560');

            if (svg) {
              const button = svg.closest('button');

              if (button) {
                button.click();
              }
            }
          }
        }
      }
    }
  }
});

closeObserver.observe(document.body, {
  childList: true,
  subtree: true
});

setInterval(autoCloseModal, 10000);
setTimeout(autoCloseModal, 2000);
