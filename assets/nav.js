/* ==========================================================================
   Course Design IDE — Navigation & Interactions
   ========================================================================== */

(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // Tooltip support for elements with title attributes
  // Shows a styled tooltip on hover instead of the default browser one
  // -------------------------------------------------------------------------

  let tooltip = null;

  function createTooltip() {
    tooltip = document.createElement('div');
    tooltip.className = 'ide-tooltip';
    tooltip.style.cssText = [
      'position: fixed',
      'background: #1f2937',
      'color: white',
      'padding: 8px 12px',
      'border-radius: 6px',
      'font-size: 13px',
      'line-height: 1.4',
      'max-width: 320px',
      'pointer-events: none',
      'opacity: 0',
      'transition: opacity 0.15s ease',
      'z-index: 1000',
      'box-shadow: 0 4px 12px rgba(0,0,0,0.15)',
    ].join(';');
    document.body.appendChild(tooltip);
  }

  function showTooltip(el, text) {
    if (!tooltip) createTooltip();
    tooltip.textContent = text;
    tooltip.style.opacity = '1';

    const rect = el.getBoundingClientRect();
    const tipRect = tooltip.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    let top = rect.bottom + 8;

    // Keep within viewport
    if (left < 8) left = 8;
    if (left + tipRect.width > window.innerWidth - 8) {
      left = window.innerWidth - tipRect.width - 8;
    }
    if (top + tipRect.height > window.innerHeight - 8) {
      top = rect.top - tipRect.height - 8;
    }

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }

  function hideTooltip() {
    if (tooltip) {
      tooltip.style.opacity = '0';
    }
  }

  // Attach tooltip behavior to elements with `title` that we want to enhance
  var hoverTargets = [
    '.outcome-item[title]',
    '.layer-chip[title]',
    '.progression-step[title]',
  ].join(', ');

  document.addEventListener('mouseover', function (e) {
    var el = e.target.closest(hoverTargets);
    if (el && el.getAttribute('title')) {
      // Store and remove native title to prevent default tooltip
      el.setAttribute('data-tip', el.getAttribute('title'));
      el.removeAttribute('title');
      showTooltip(el, el.getAttribute('data-tip'));
    }
  });

  document.addEventListener('mouseout', function (e) {
    var el = e.target.closest(hoverTargets);
    if (!el) {
      // Also check if we're leaving an element with data-tip
      el = e.target.closest('[data-tip]');
    }
    if (el && el.getAttribute('data-tip')) {
      el.setAttribute('title', el.getAttribute('data-tip'));
      el.removeAttribute('data-tip');
      hideTooltip();
    }
  });

  // -------------------------------------------------------------------------
  // Keyboard navigation — press left/right arrow on prev/next nav
  // -------------------------------------------------------------------------

  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'ArrowLeft') {
      var prev = document.querySelector('.nav-prev');
      if (prev) window.location.href = prev.href;
    } else if (e.key === 'ArrowRight') {
      var next = document.querySelector('.nav-next');
      if (next) window.location.href = next.href;
    }
  });
})();
