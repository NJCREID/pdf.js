/* Copyright 2012 Mozilla Foundation
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

import { PDFTextSnippetView } from "./pdf_text_snippet_view.js";

/**
 * @typedef {Object} PDFTextSnippetViewerOptions
 * @property {HTMLDivElement} container - The container for the snippet elements
 * @property {EventBus} eventBus - The application event bus
 */

/**
 * Viewer control to display text snippets for pages in a PDF document.
 */
class PDFTextSnippetViewer {
  /**
   * @param {PDFTextSnippetViewerOptions} options
   */
  constructor(options) {
    this.container = options.container;
    this.eventBus = options.eventBus;

    this.#resetView();
  }

  #resetView() {
    this._snippets = [];
    this.container.textContent = "";
  }

  /**
   * Updates the snippets with new text content
   * @param {Array<string>} snippetTexts Array of text strings to show as snippets
   */
  setSnippets(snippetTexts) {
    this.#resetView();
    snippetTexts.forEach((text, index) => {
      const snippet = new PDFTextSnippetView({
        container: this.container,
        text,
        id: index + 1,
        eventBus: this.eventBus,
      });
      this._snippets.push(snippet);
    });
  }

  /**
   * @param {number} index
   */
  getSnippet(index) {
    return this._snippets[index];
  }
}

export { PDFTextSnippetViewer };
