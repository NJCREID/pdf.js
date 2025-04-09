/* Copyright 2016 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** @typedef {import("./event_utils.js").EventBus} EventBus */
/** @typedef {import("./interfaces.js").IL10n} IL10n */

import { docStyle, SidebarView, toggleExpandedBtn } from "./ui_utils.js";

const SIDEBAR_WIDTH_VAR = "--sidebar-width";
const SIDEBAR_MIN_WIDTH = 200; // pixels
const SIDEBAR_RESIZING_CLASS = "sidebarResizing";

/**
 * @typedef {Object} PDFSidebarOptions
 * @property {PDFSidebarElements} elements - The DOM elements.
 * @property {EventBus} eventBus - The application event bus.
 * @property {IL10n} l10n - The localization service.
 */

/**
 * @typedef {Object} PDFSidebarElements
 * @property {HTMLDivElement} outerContainer - The outer container
 *   (encasing both the viewer and sidebar elements).
 * @property {HTMLDivElement} sidebarContainer - The sidebar container
 *   (in which the views are placed).
 * @property {HTMLButtonElement} toggleButton - The button used for
 *   opening/closing the sidebar.
 * @property {HTMLDivElement} resizer - The DOM element that can be dragged in
 *   order to adjust the width of the sidebar.
 * @property {HTMLDivElement} textSnippetView - The container in which
 *   the text snippets are placed.
 */

class PDFSidebar {
  #isRTL = false;
  #mouseAC = null;
  #outerContainerWidth = null;
  #width = null;
  #searchCallback = null;

  /**
   * @param {PDFSidebarOptions} options
   */
  constructor({ elements, eventBus, l10n }) {
    this.isOpen = false;
    this.isInitialViewSet = false;

    /**
     * Callback used when the sidebar has been opened/closed, to ensure that
     * the viewers are updated correctly.
     */
    this.onToggled = null;

    this.outerContainer = elements.outerContainer;
    this.sidebarContainer = elements.sidebarContainer;
    this.toggleButton = elements.toggleButton;
    this.resizer = elements.resizer;
    this.textSnippetView = elements.textSnippetView;

    this.eventBus = eventBus;

    this.#isRTL = l10n.getDirection() === "rtl";
    this.#addEventListeners();
  }

  reset() {
    this.isInitialViewSet = false;
  }

  /**
   * @type {number} One of the values in {SidebarView}.
   */
  get visibleView() {
    return this.isOpen ? this.active : SidebarView.NONE;
  }

  open() {
    if (this.isOpen) {
      return;
    }
    this.isOpen = true;
    toggleExpandedBtn(this.toggleButton, true);

    this.outerContainer.classList.add("sidebarMoving", "sidebarOpen");
    this.onToggled();
    this.#dispatchEvent();
  }

  close(evt = null) {
    if (!this.isOpen) {
      return;
    }
    this.isOpen = false;
    toggleExpandedBtn(this.toggleButton, false);

    this.outerContainer.classList.add("sidebarMoving");
    this.outerContainer.classList.remove("sidebarOpen");

    this.onToggled();
    this.#dispatchEvent();

    if (evt?.detail > 0) {
      // Remove focus from the toggleButton if it's clicked (see issue 17361).
      this.toggleButton.blur();
    }
  }

  toggle(evt = null) {
    if (this.isOpen) {
      this.close(evt);
    } else {
      this.open();
    }
  }

  #dispatchEvent() {
    if (this.isInitialViewSet) {
      this.isInitialEventDispatched ||= true;
    }
  }

  #addEventListeners() {
    const { eventBus, outerContainer } = this;

    this.sidebarContainer.addEventListener("transitionend", evt => {
      if (evt.target === this.sidebarContainer) {
        outerContainer.classList.remove("sidebarMoving");
        // Ensure that rendering is triggered after opening/closing the sidebar.
        eventBus.dispatch("resize", { source: this });
      }
    });

    this.toggleButton.addEventListener("click", evt => {
      this.toggle(evt);
    });

    // Handle resizing of the sidebar.
    this.resizer.addEventListener("mousedown", evt => {
      if (evt.button !== 0) {
        return;
      }
      // Disable the `transition-duration` rules when sidebar resizing begins,
      // in order to improve responsiveness and to avoid visual glitches.
      outerContainer.classList.add(SIDEBAR_RESIZING_CLASS);

      this.#mouseAC = new AbortController();
      const opts = { signal: this.#mouseAC.signal };

      window.addEventListener("mousemove", this.#mouseMove.bind(this), opts);
      window.addEventListener("mouseup", this.#mouseUp.bind(this), opts);
      window.addEventListener("blur", this.#mouseUp.bind(this), opts);
    });

    eventBus._on("resize", evt => {
      // When the *entire* viewer is resized, such that it becomes narrower,
      // ensure that the sidebar doesn't end up being too wide.
      if (evt.source !== window) {
        return;
      }
      // Always reset the cached width when the viewer is resized.
      this.#outerContainerWidth = null;

      if (!this.#width) {
        // The sidebar hasn't been resized, hence no need to adjust its width.
        return;
      }
      // NOTE: If the sidebar is closed, we don't need to worry about
      //       visual glitches nor ensure that rendering is triggered.
      if (!this.isOpen) {
        this.#updateWidth(this.#width);
        return;
      }
      outerContainer.classList.add(SIDEBAR_RESIZING_CLASS);
      const updated = this.#updateWidth(this.#width);

      Promise.resolve().then(() => {
        outerContainer.classList.remove(SIDEBAR_RESIZING_CLASS);
        // Trigger rendering if the sidebar width changed, to avoid
        // depending on the order in which 'resize' events are handled.
        if (updated) {
          eventBus.dispatch("resize", { source: this });
        }
      });
    });
  }

  /**
   * @type {number}
   */
  get outerContainerWidth() {
    return (this.#outerContainerWidth ||= this.outerContainer.clientWidth);
  }

  /**
   * returns {boolean} Indicating if the sidebar width was updated.
   */
  #updateWidth(width = 0) {
    // Prevent the sidebar from becoming too narrow, or from occupying more
    // than half of the available viewer width.
    const maxWidth = Math.floor(this.outerContainerWidth / 2);
    if (width > maxWidth) {
      width = maxWidth;
    }
    if (width < SIDEBAR_MIN_WIDTH) {
      width = SIDEBAR_MIN_WIDTH;
    }
    // Only update the UI when the sidebar width did in fact change.
    if (width === this.#width) {
      return false;
    }
    this.#width = width;

    docStyle.setProperty(SIDEBAR_WIDTH_VAR, `${width}px`);
    return true;
  }

  #mouseMove(evt) {
    let width = evt.clientX;
    // For sidebar resizing to work correctly in RTL mode, invert the width.
    if (this.#isRTL) {
      width = this.outerContainerWidth - width;
    }
    this.#updateWidth(width);
  }

  #mouseUp(evt) {
    // Re-enable the `transition-duration` rules when sidebar resizing ends...
    this.outerContainer.classList.remove(SIDEBAR_RESIZING_CLASS);
    // ... and ensure that rendering will always be triggered.
    this.eventBus.dispatch("resize", { source: this });

    this.#mouseAC?.abort();
    this.#mouseAC = null;
  }
}

export { PDFSidebar };
