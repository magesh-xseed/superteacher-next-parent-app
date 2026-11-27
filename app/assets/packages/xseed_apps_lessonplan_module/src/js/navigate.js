let isNewTabKeyPressed = false;

function attachKeyBoardEvents() {
  document.addEventListener("keydown", function (event) {
    isNewTabKeyPressed = event.ctrlKey || event.metaKey;
  });
  document.addEventListener("keyup", function () {
    isNewTabKeyPressed = false;
  });
}

function getIsCurrentKeyCtrl() {
  clearKeyPressed(200);
  return isNewTabKeyPressed;
}

function openInNewTab(route) {
  window.open(route, '_blank');
}

function clearKeyPressed(delay) {
  setTimeout(() => {
    isNewTabKeyPressed = false;
  }, delay);
}
