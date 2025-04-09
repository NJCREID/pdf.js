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

import { MatchType } from "../src/shared/util.js";

const SNIPPET_LENGTH = 100; // Characters to show in each snippet

/**
 * @typedef {Object} PDFTextSnippetViewOptions
 * @property {HTMLDivElement} container - The container element
 * @property {string} text - The text content for the snippet
 * @property {number} id - The snippet identifier
 * @property {EventBus} eventBus - The application event bus
 */

/**
 * @implements {IRenderableView}
 */
class PDFTextSnippetView {
  /**
   * @param {PDFTextSnippetViewOptions} options
   */
  constructor({ container, text, id, eventBus }) {
    this.id = id;
    this.text = text;
    this.eventBus = eventBus;
    this.div = document.createElement("div");
    this.div.className = "textSnippet";
    container.appendChild(this.div);
    this.draw();
  }

  draw() {
    // Create text preview
    const preview = document.createElement("div");
    preview.className = "snippetText";
    preview.textContent = this.#getSnippetText(this.text);

    // Create click handler
    this.div.onclick = () => {
      // Dispatch find event with the snippet text
      this.eventBus.dispatch("find", {
        source: this,
        query: this.text,
        caseSensitive: false,
        entireWord: false,
        highlightAll: true,
        findPrevious: false,
        matchDiacritics: false,
        matchType: MatchType.CHARACTER,
      });
    };

    this.div.appendChild(preview);
  }

  #getSnippetText(text) {
    if (text.length <= SNIPPET_LENGTH) {
      return text;
    }
    return text.substring(0, SNIPPET_LENGTH) + "...";
  }
}

export { PDFTextSnippetView };
