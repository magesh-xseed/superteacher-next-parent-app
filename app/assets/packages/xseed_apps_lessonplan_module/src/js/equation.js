var mathJaxTypeSetTimerObject = {};
let hasDomElementInsertedListener = false;
const heightWidthCalculatedClassName = "height-width-calculated";

// Called from lesson_plan_app -> lesson_plan_screen.dart
function initMathJax(shouldStartDomNodeInsertedListener = true) {
  console.log("this method is called initMathJax")
  if (
    mathJaxTypeSetTimerObject.timer &&
    !mathJaxTypeSetTimerObject.shouldStartDomNodeInsertedListener
  ) {
    clearTimeout(mathJaxTypeSetTimerObject.timer);
  }

  const timer = setTimeout(async () => {
    console.log("Rendering equation - MathJax.");
    await window.MathJax.typesetPromise();

    if (shouldStartDomNodeInsertedListener) {
      listenForEquationInserted();
    }
  }, 500);

  mathJaxTypeSetTimerObject = {
    timer,
    shouldStartDomNodeInsertedListener,
  };
}

// Called from lesson_plan_app -> lesson_plan_screen.dart
function disposeMathJax() {
  removeEquationListener();
}

// Called from flutter_common_widgets -> equation.dart
async function calculateSingleEquationHeight(elementId, retryCount = 5) {
  const element = document.getElementById(elementId);

  if (element) {
    await window.MathJax.typesetPromise([element]);

    if (!element.classList.value.includes(heightWidthCalculatedClassName)) {
      setElementSize(element);
    }
  } else {
    if (retryCount > 0) {
      setTimeout(() => {
        calculateSingleEquationHeight(elementId, retryCount - 1);
      }, 100);
    }
  }
}

// Helpers
function removeEquationListener() {
  document.body.removeEventListener("DOMNodeInserted", domNodeInsertedListener);
  hasDomElementInsertedListener = false;
}

function listenForEquationInserted() {
  if (!hasDomElementInsertedListener) {
    document.body.addEventListener("DOMNodeInserted", domNodeInsertedListener);
    hasDomElementInsertedListener = true;
  }
}

async function domNodeInsertedListener(e) {
  if (e.target.innerHTML && e.target.innerHTML.search('class="my-math"')) {
    initMathJax(false);
  }
}

async function setElementSize(element) {
  if (element) {
    const mathJaxContentElement = element.firstChild;
    const height = mathJaxContentElement.offsetHeight;
    const width = mathJaxContentElement.offsetWidth;

    if (height && width) {
      try {
        element.classList.add(heightWidthCalculatedClassName);
        eval(`OnContentSizeComputed${element.id}(${height}, ${width});`);
      } catch (error) {}
    }
  }
}


// Cache typeset markup independently of the projector font size. Revisited
// slides can reuse it without another MathJax typesetting pass.
const projectorEquationCache = new Map();
let projectorEquationQueue = Promise.resolve();
async function renderProjectorEquation(elementId, latex, fontSize, cssColor = 'black', attempt = 0) {
  const element = document.getElementById(elementId);
  if (!element) {
    if (attempt < 60) requestAnimationFrame(() =>
      renderProjectorEquation(elementId, latex, fontSize, cssColor, attempt + 1));
    return;
  }
  const revision = (element.equationRevision || 0) + 1;
  element.equationRevision = revision;
  try {
    await MathJax.startup.promise;
    let result = projectorEquationCache.get(latex);
    if (!result) {
      result = projectorEquationQueue.then(() =>
        MathJax.tex2chtmlPromise(String.raw`\displaystyle ${latex}`, {display: false}));
      projectorEquationQueue = result.catch(() => {});
      projectorEquationCache.set(latex, result);
      // Keep the cache bounded during long teaching sessions.
      if (projectorEquationCache.size > 200)
        projectorEquationCache.delete(projectorEquationCache.keys().next().value);
      result.catch(() => projectorEquationCache.delete(latex));
    }
    const markup = await result;
    // Conversion does not install the adaptive CHTML rules for new glyphs and
    // fraction structures. Publish those rules before measuring the output.
    const previousStyles = document.getElementById('MJX-CHTML-styles');
    const styles = MathJax.chtmlStylesheet();
    if (!previousStyles) document.head.appendChild(styles);
    else if (previousStyles !== styles) previousStyles.replaceWith(styles);
    if (!element.isConnected || element.equationRevision !== revision) return;
    element.style.visibility = 'hidden';
    element.style.fontSize = `${fontSize}px`;
    element.style.color = cssColor;
    element.style.position = 'relative';
    const content = markup.cloneNode(true);
    // MathJax has zero line-height and can place fraction parts outside its
    // container's box. Measure the whole subtree, then fit it in Flutter's span.
    content.style.display = 'block';
    content.style.position = 'absolute';
    content.style.margin = '0';
    content.style.left = '0';
    content.style.top = '0';
    element.replaceChildren(content);
    if (document.fonts) await document.fonts.ready;
    if (!element.isConnected || element.equationRevision !== revision) return;
    const bounds = content.getBoundingClientRect();
    let top = bounds.top, bottom = bounds.bottom;
    let left = bounds.left, right = bounds.right;
    for (const child of content.querySelectorAll('*')) {
      const rect = child.getBoundingClientRect();
      top = Math.min(top, rect.top);
      bottom = Math.max(bottom, rect.bottom);
      left = Math.min(left, rect.left);
      right = Math.max(right, rect.right);
    }
    content.style.top = `${bounds.top - top}px`;
    content.style.left = `${bounds.left - left}px`;
    const callback = window[`OnContentSizeComputed${elementId}`];
    if (callback) callback(Math.ceil(bottom - top), Math.ceil(right - left));
    // Reveal after Flutter has applied the measured dimensions.
    requestAnimationFrame(() => {
      if (element.equationRevision === revision)
        element.style.visibility = 'visible';
    });
  } catch (error) {
    console.error('Unable to render equation', error);
  }
}
