(() => {
  'use strict';

  const WRAPPER_SELECTOR = '.event-portal-registration-form-wrapper';
  const THEMED_CLASS = 'event-portal-ci-form-themed';
  const FORM_LOAD_EVENT = 'd365mkt-afterformload';

  function markWrapper(wrapper) {
    if (!(wrapper instanceof HTMLElement)) {
      return;
    }

    wrapper.classList.add(THEMED_CLASS);
    wrapper.setAttribute('data-portal-form-theme', 'active');

    const form = wrapper.querySelector('form');
    if (form instanceof HTMLFormElement) {
      form.classList.add('event-portal-ci-form');
      form.setAttribute('data-portal-form-theme', 'active');
    }
  }

  function themeWithin(node) {
    if (!(node instanceof Element || node instanceof Document || node instanceof DocumentFragment)) {
      return;
    }

    if (node instanceof Element && node.matches(WRAPPER_SELECTOR)) {
      markWrapper(node);
    }

    node.querySelectorAll?.(WRAPPER_SELECTOR).forEach(markWrapper);
  }

  function findWrapperForEvent(event) {
    const target = event?.target;
    if (!(target instanceof Element)) {
      return null;
    }

    if (target.matches(WRAPPER_SELECTOR)) {
      return target;
    }

    return target.closest(WRAPPER_SELECTOR) || target.querySelector?.(WRAPPER_SELECTOR) || null;
  }

  function initializeObserver() {
    const host = document.getElementById('event-portal-registration-form-container');
    if (!host) {
      return;
    }

    themeWithin(host);

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(themeWithin);
      }
    });

    observer.observe(host, {
      childList: true,
      subtree: true
    });
  }

  document.addEventListener(FORM_LOAD_EVENT, event => {
    const wrapper = findWrapperForEvent(event);
    if (wrapper) {
      markWrapper(wrapper);
      return;
    }

    const host = document.getElementById('event-portal-registration-form-container');
    if (host) {
      themeWithin(host);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeObserver, { once: true });
  } else {
    initializeObserver();
  }
})();
