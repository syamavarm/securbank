export interface AppInfo {
  name: string;
  version: string;
}

export interface AppCapabilities {
  availableDisplayModes?: Array<'inline' | 'fullscreen' | 'pip'>;
  tools?: { listChanged?: boolean };
  experimental?: Record<string, unknown>;
}

export interface LLMAppOptions {
  appInfo: AppInfo;
  appCapabilities?: AppCapabilities;
}

export type ContainerDimensions =
  ({ height: number } | { maxHeight?: number }) &
  ({ width: number } | { maxWidth?: number });

// --- OpenAI/Codex MCP extensions (AMCP-499) --------------------------------

/** hostContext['openai/deepLink'] — a deep-link activation. */
export interface OpenAIDeepLink {
  url: string;
}

/** Legacy host payload; getDeepLink() normalizes it to OpenAIDeepLink. */
export interface OpenAILegacyDeepLink {
  path: string[];
  query: Array<[string, string]>;
}

/** hostContext['openai/modelContext'] — context attached to the next message. */
export interface OpenAIModelContext {
  updateId: string;
  content?: unknown[];
  structuredContent?: Record<string, unknown>;
}

/** Result of openai/resources/write. */
export type OpenAIResourceWriteResult =
  | { outcome: 'saved'; etag: string }
  | { outcome: 'conflict'; etag: string }
  | { outcome: 'too-large'; maxBytes: number };

export type OpenAIResourceWriteOptions = { ifMatch?: string } & (
  | { text: string; blob?: never }
  | { blob: string; text?: never }
);

export interface OpenAIResourceMetadata {
  writable?: boolean;
  etag?: string;
}

export interface OpenAIResourceReadOptions {
  representation?: 'text' | 'blob';
  _meta?: Record<string, unknown> & {
    'openai/resource'?: { representation?: 'text' | 'blob'; [key: string]: unknown };
  };
}

export type OpenAIResourceContent = {
  uri: string;
  mimeType?: string;
  _meta?: Record<string, unknown> & { 'openai/resource'?: OpenAIResourceMetadata };
  openaiMetadata?: OpenAIResourceMetadata;
} & ({ text: string; blob?: never } | { blob: string; text?: never });

export interface OpenAIResourceReadResult {
  contents: OpenAIResourceContent[];
  _meta?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface OpenAIIcon {
  src: string;
  mimeType?: string;
  sizes?: string[];
  theme?: 'light' | 'dark';
}

/** A composer @-mention search result item. */
export interface OpenAIMentionResource {
  type: 'resource';
  resourceUri: string;
  title: string;
  subtitle?: string;
  icons?: OpenAIIcon[];
}

export interface OpenAIResourceLink {
  type: 'resource_link';
  uri: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
  icons?: OpenAIIcon[];
  [key: string]: unknown;
}

export type OpenAIMentionItem = OpenAIMentionResource | OpenAIResourceLink;

export interface OpenAIMessageOptions {
  target?: 'active' | 'new';
  send?: boolean;
}

export type MessageResourceContents = {
  uri: string;
  mimeType?: string;
  _meta?: Record<string, unknown>;
  [key: string]: unknown;
} & ({ text: string } | { blob: string });

/** Standard MCP content, independent of any host's supported modalities. */
export type MessageContentBlock = {
  annotations?: {
    audience?: Array<'user' | 'assistant'>;
    priority?: number;
    lastModified?: string;
    [key: string]: unknown;
  };
  _meta?: Record<string, unknown>;
  [key: string]: unknown;
} & (
  | { type: 'text'; text: string }
  | { type: 'image' | 'audio'; data: string; mimeType: string }
  | { type: 'resource_link'; uri: string; name: string; title?: string; description?: string; mimeType?: string }
  | { type: 'resource'; resource: MessageResourceContents }
);

export interface MessageParams {
  role: 'user';
  content: MessageContentBlock[];
  _meta?: Record<string, unknown> & {
    'openai/message'?: OpenAIMessageOptions;
  };
}

export interface MessageResult {
  isError?: boolean;
  [key: string]: unknown;
}

export interface SupportedContentBlockModalities {
  text?: Record<string, never>;
  image?: Record<string, never>;
  audio?: Record<string, never>;
  resource?: Record<string, never>;
  resourceLink?: Record<string, never>;
  structuredContent?: Record<string, never>;
}

export interface HostContext {
  'openai/deepLink'?: OpenAIDeepLink | OpenAILegacyDeepLink | null;
  'openai/modelContext'?: OpenAIModelContext | null;
  theme?: 'light' | 'dark';
  locale?: string;
  timeZone?: string;
  displayMode?: 'inline' | 'fullscreen' | 'pip';
  availableDisplayModes?: Array<'inline' | 'fullscreen' | 'pip'>;
  containerDimensions?: ContainerDimensions;
  platform?: 'web' | 'desktop' | 'mobile';
  deviceCapabilities?: {
    touch?: boolean;
    hover?: boolean;
  };
  safeAreaInsets?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  userAgent?: string;
  toolInfo?: {
    id?: string | number;
    tool: {
      name: string;
      description?: string;
      inputSchema?: Record<string, unknown>;
      [key: string]: unknown;
    };
  };
  styles?: {
    variables?: Record<string, string | undefined>;
    css?: {
      fonts?: string;
    };
  };
  [key: string]: unknown;
}

export interface HostCapabilities {
  experimental?: Record<string, unknown> & {
    'openai/resource'?: Record<string, never>;
    'openai/modelContext'?: Record<string, never>;
    'openai/message'?: Record<string, never>;
  };
  message?: SupportedContentBlockModalities;
  openLinks?: Record<string, never>;
  serverTools?: { listChanged?: boolean };
  serverResources?: { listChanged?: boolean };
  logging?: Record<string, never>;
  sandbox?: {
    permissions?: {
      camera?: Record<string, never>;
      microphone?: Record<string, never>;
      geolocation?: Record<string, never>;
      clipboardWrite?: Record<string, never>;
    };
    csp?: {
      connectDomains?: string[];
      resourceDomains?: string[];
      frameDomains?: string[];
      baseUriDomains?: string[];
    };
  };
  [key: string]: unknown;
}

export interface HostInfo {
  name?: string;
  version?: string;
}

export interface ToolResult {
  content?: Array<{ type: string; text?: string; [key: string]: unknown }>;
  structuredContent?: Record<string, unknown>;
  _meta?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ToolInput {
  arguments?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ToolCancelled {
  reason?: string;
  [key: string]: unknown;
}

export interface ToolCallResult {
  content?: Array<{ type: string; text?: string; [key: string]: unknown }>;
  structuredContent?: Record<string, unknown>;
  _meta?: Record<string, unknown>;
  [key: string]: unknown;
}

export type LogLevel = 'debug' | 'info' | 'warning' | 'error';
export type DisplayMode = 'inline' | 'fullscreen' | 'pip';

export declare class ChatGPTExtensions {
  get widgetState(): unknown | null;
  setWidgetState(state: unknown): void;
  uploadFile(file: File): Promise<{ fileId: string }>;
  getFileDownloadUrl(opts: { fileId: string }): Promise<{ downloadUrl: string }>;
  requestModal(opts?: { template?: string; params?: Record<string, unknown> }): Promise<void>;
  requestClose(): void;
  requestCheckout(opts: Record<string, unknown>): Promise<void>;
  setOpenInAppUrl(opts: { href: string }): void;
  get view(): string | null;
  requestConnectSheet(opts?: Record<string, unknown>): Promise<{ didConnect?: boolean; linkId?: string }>;
  get supportsConnectSheet(): boolean;
}

export declare class LLMApp {
  constructor(options: LLMAppOptions);

  /** Promise that resolves with the tool's response (ui/notifications/tool-result). */
  readonly toolResult: Promise<ToolResult>;

  /** Promise that resolves with the tool's input arguments (ui/notifications/tool-input). */
  readonly toolInput: Promise<ToolInput>;

  /** Promise that resolves if the tool invocation is cancelled (ui/notifications/tool-cancelled). */
  readonly toolCancelled: Promise<ToolCancelled>;

  /** Whether this code is running inside an iframe. */
  get isEmbedded(): boolean;

  /** Whether the ui/initialize handshake has completed. */
  get isConnected(): boolean;

  /** Detected host name. */
  get host(): 'chatgpt' | 'claude' | string | 'unknown' | null;

  /** Host context from the ui/initialize result. Updated on host-context-changed. */
  get hostContext(): HostContext;

  /** Host capabilities from the ui/initialize result. */
  get hostCapabilities(): HostCapabilities;

  /** Host identity from the ui/initialize result. */
  get hostInfo(): HostInfo;

  /** ChatGPT vendor extensions (window.openai). Returns null when not running inside ChatGPT. */
  get chatgpt(): ChatGPTExtensions | null;

  /** Connect to the host and perform the ui/initialize handshake. */
  connect(): Promise<this>;

  /** Stop listening and clean up. */
  destroy(): void;

  /** Call a tool from the UI (tools/call). */
  callTool(name: string, args?: Record<string, unknown>): Promise<ToolCallResult>;

  /** Send a plain-text user message (ui/message). Check result.isError for delivery failure. */
  sendMessage(text: string): Promise<MessageResult>;
  /** Send rich user content. Explicit openai/message options require supportsMessageOptions. */
  sendMessage(params: MessageParams): Promise<MessageResult>;

  /** Whether the host advertises conversation-target and editable-draft options. */
  readonly supportsMessageOptions: boolean;

  /**
   * Update model-visible context from the UI (ui/update-model-context).
   * Accepts a plain string (wrapped as a text block) or a full
   * `{ content?, structuredContent? }` payload. Resolves with the host's
   * accepted `updateId` when present.
   */
  updateModelContext(
    input: string | { content?: unknown | unknown[]; structuredContent?: Record<string, unknown> }
  ): Promise<{ updateId?: string; raw: unknown }>;

  /**
   * The model-context host state currently attached to the user's next message
   * (hostContext['openai/modelContext']). `undefined` = absent, `null` = cleared.
   */
  getModelContext(): OpenAIModelContext | null | undefined;

  /** The deep-link the host activated for this app (hostContext['openai/deepLink']), or null. */
  getDeepLink(): OpenAIDeepLink | null;

  readonly supportsResourceWrite: boolean;
  readonly supportsModelContext: boolean;

  /** Ask the host to open a URL (ui/open-link). */
  openLink(url: string): Promise<Record<string, never>>;

  /** Request a display mode change (ui/request-display-mode). */
  requestDisplayMode(mode: DisplayMode): Promise<{ mode: string }>;

  /** Manually report widget dimensions to the host (ui/notifications/size-changed). */
  reportSize(width: number, height: number): void;

  /** Read an MCP resource by URI (resources/read). */
  readResource(uri: string, options?: OpenAIResourceReadOptions): Promise<OpenAIResourceReadResult>;

  /**
   * Write back to a host-managed resource opened by a file extension handler
   * (openai/resources/write). Pass exactly one of `text` or `blob` (base64).
   */
  writeResource(
    uri: string,
    opts: OpenAIResourceWriteOptions
  ): Promise<OpenAIResourceWriteResult>;

  /**
   * Search the tool advertised by capabilities.extensions['openai/mentions'].
   * Returns MCP resource links or mention resources.
   */
  searchMentions(toolName: string, query?: string): Promise<{ items: OpenAIMentionItem[] }>;

  /** Send a log message to the host (notifications/message). */
  log(level: LogLevel, message: string): void;

  /** Report viewport width and full document height via ResizeObserver. Use reportSize() for explicit widths. Returns a cleanup function. */
  autoResize(target?: HTMLElement): () => void;

  /** Subscribe to host context changes (ui/notifications/host-context-changed). Returns an unsubscribe function. */
  onContextChange(callback: (context: HostContext) => void): () => void;

  /** Subscribe to streaming tool input arguments (ui/notifications/tool-input-partial). Returns an unsubscribe function. */
  onToolInputPartial(callback: (params: ToolInput) => void): () => void;

  /** Subscribe to every tool result (ui/notifications/tool-result), not just the first. Use for a widget that stays mounted across multiple tool calls (e.g. pinned in pip). Returns an unsubscribe function. */
  onToolResult(callback: (result: ToolResult) => void): () => void;

  /** Apply host-provided CSS variables and fonts to the document. */
  applyHostStyles(target?: HTMLElement): void;

  /** Apply host-provided container dimensions as CSS. */
  applyContainerDimensions(target?: HTMLElement): void;

  /** Send a JSON-RPC request (low-level). */
  request(method: string, params?: Record<string, unknown>, options?: { timeout?: number }): Promise<unknown>;

  /** Send a JSON-RPC notification (low-level, fire-and-forget). */
  notify(method: string, params?: Record<string, unknown>): void;
}

/** Create and connect an app in one call. */
export declare function createApp(options: LLMAppOptions): Promise<LLMApp>;

/** Apply Adobe personalization/identity handles from the tool result via the Adobe Web SDK. Loads and configures the SDK whenever datastreamId/orgId are supplied; the applyResponse step is skipped when no handles are present. Alloy's automatic link-click collection is turned off (clickCollectionEnabled: false); send interaction events with sendAdobeEvent. Never throws. */
export declare function applyAdobeHandles(
  bridge: LLMApp,
  config?: { datastreamId: string; orgId: string },
): Promise<Record<string, unknown> | null>;

/** Send a client-side analytics event to Adobe Edge Network, reusing the identityMap from the tool result so client- and server-side events stitch to one identity. Never throws. */
export declare function sendAdobeEvent(
  bridge: LLMApp,
  xdm: Record<string, unknown>,
): Promise<Record<string, unknown> | null>;

export default LLMApp;
