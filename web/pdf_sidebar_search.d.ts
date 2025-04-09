import { EventBus } from "./event_utils";

export interface PDFSidebarSearchOptions {
  searchInput: HTMLInputElement;
  searchButton: HTMLButtonElement;
  eventBus: EventBus;
}

export declare class PDFSidebarSearch {
  constructor(options: PDFSidebarSearchOptions);
  dispatchEvent(): void;
  reset(): void;
}
