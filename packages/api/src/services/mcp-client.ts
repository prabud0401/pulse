import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

export interface MCPConnectionConfig {
  url: string;
  transport?: 'sse' | 'streamable_http' | 'http' | 'auto';
  headers?: Record<string, string>;
  authToken?: string;
  timeoutMs?: number;
}

export interface DiscoveredTool {
  name: string;
  description: string | null;
  inputSchema: Record<string, unknown> | null;
}

export interface MCPClientSession {
  client: Client;
  transport: Transport;
  close: () => Promise<void>;
}

export class MCPClientError extends Error {
  public code: string;
  public details?: unknown;

  constructor(message: string, code = 'MCP_CLIENT_ERROR', details?: unknown) {
    super(message);
    this.name = 'MCPClientError';
    this.code = code;
    this.details = details;
  }
}

export class MCPClientGateway {
  private defaultTimeoutMs: number;

  constructor(defaultTimeoutMs = 15000) {
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  /**
   * Helper to execute a promise with a timeout.
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operationName: string
  ): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new MCPClientError(
            `${operationName} timed out after ${timeoutMs}ms`,
            'TIMEOUT'
          )
        );
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  /**
   * Validate and normalize URL string to URL object.
   */
  private parseUrl(urlString: string): URL {
    try {
      const parsed = new URL(urlString);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error(`Unsupported protocol: ${parsed.protocol}. Only http and https are supported.`);
      }
      return parsed;
    } catch (err: any) {
      throw new MCPClientError(
        `Invalid MCP URL "${urlString}": ${err.message}`,
        'INVALID_URL'
      );
    }
  }

  /**
   * Resolve headers from config, injecting auth token if provided.
   */
  private buildHeaders(config: MCPConnectionConfig): Record<string, string> {
    const headers: Record<string, string> = { ...(config.headers || {}) };

    if (config.authToken) {
      const hasAuthHeader = Object.keys(headers).some(
        (key) => key.toLowerCase() === 'authorization'
      );
      if (!hasAuthHeader) {
        headers['Authorization'] = `Bearer ${config.authToken}`;
      }
    }

    return headers;
  }

  /**
   * Instantiate the appropriate MCP transport based on options.
   */
  public createTransport(config: MCPConnectionConfig): Transport {
    const url = this.parseUrl(config.url);
    const headers = this.buildHeaders(config);
    const transportType = config.transport || 'sse';

    if (transportType === 'streamable_http' || transportType === 'http') {
      return new StreamableHTTPClientTransport(url, {
        requestInit: {
          headers,
        },
      });
    }

    // Default to SSE transport
    return new SSEClientTransport(url, {
      requestInit: {
        headers,
      },
    });
  }

  /**
   * Connects to a remote MCP server and returns an active session with client and transport.
   * Session must be closed via session.close() when done.
   */
  public async connect(config: MCPConnectionConfig): Promise<MCPClientSession> {
    const timeout = config.timeoutMs ?? this.defaultTimeoutMs;
    const transport = this.createTransport(config);

    const client = new Client(
      {
        name: 'pulse-mcp-gateway',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    let isClosed = false;
    const close = async () => {
      if (isClosed) return;
      isClosed = true;
      try {
        await client.close();
      } catch {
        // ignore error during client close
      }
      try {
        await transport.close();
      } catch {
        // ignore error during transport close
      }
    };

    try {
      await this.withTimeout(
        client.connect(transport),
        timeout,
        'Connecting to MCP server'
      );

      return { client, transport, close };
    } catch (error: any) {
      await close();
      if (error instanceof MCPClientError) {
        throw error;
      }
      throw new MCPClientError(
        `Failed to connect to MCP server at ${config.url}: ${error.message}`,
        'CONNECTION_FAILED',
        error
      );
    }
  }

  /**
   * Connects to the server, queries available tools with listTools(),
   * formats them to { name, description, inputSchema }, and closes the session.
   */
  public async listTools(config: MCPConnectionConfig): Promise<DiscoveredTool[]> {
    const timeout = config.timeoutMs ?? this.defaultTimeoutMs;
    const session = await this.connect(config);

    try {
      const response = await this.withTimeout(
        session.client.listTools(),
        timeout,
        'Listing tools from MCP server'
      );

      const rawTools = response?.tools || [];
      return rawTools.map((tool) => ({
        name: tool.name,
        description: tool.description ?? null,
        inputSchema: (tool.inputSchema as Record<string, unknown>) ?? null,
      }));
    } catch (error: any) {
      if (error instanceof MCPClientError) {
        throw error;
      }
      throw new MCPClientError(
        `Failed to list tools from MCP server: ${error.message}`,
        'LIST_TOOLS_FAILED',
        error
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Connects to the server, invokes a tool via callTool(),
   * returns the result, and closes the session.
   */
  public async callTool(
    config: MCPConnectionConfig,
    name: string,
    args: Record<string, unknown> = {}
  ): Promise<unknown> {
    const timeout = config.timeoutMs ?? 30000;
    const session = await this.connect({ ...config, timeoutMs: timeout });

    try {
      const result = await this.withTimeout(
        session.client.callTool({
          name,
          arguments: args,
        }),
        timeout,
        `Invoking MCP tool "${name}"`
      );

      return result;
    } catch (error: any) {
      if (error instanceof MCPClientError) {
        throw error;
      }
      throw new MCPClientError(
        `Failed to execute tool "${name}": ${error.message}`,
        'CALL_TOOL_FAILED',
        error
      );
    } finally {
      await session.close();
    }
  }
}

// Export singleton instance as well as class and utilities
export const mcpClient = new MCPClientGateway();

/**
 * Helper to parse integration config record into typed MCPConnectionConfig.
 */
export function parseMCPConfig(config: Record<string, unknown>): MCPConnectionConfig {
  const url = (config.url || config.serverUrl || config.endpoint) as string;
  if (!url || typeof url !== 'string') {
    throw new MCPClientError('Integration config is missing a valid "url"', 'MISSING_URL');
  }

  let headers: Record<string, string> | undefined;
  if (config.headers && typeof config.headers === 'object' && !Array.isArray(config.headers)) {
    headers = {};
    for (const [k, v] of Object.entries(config.headers as Record<string, unknown>)) {
      if (typeof v === 'string') {
        headers[k] = v;
      } else if (v !== undefined && v !== null) {
        headers[k] = String(v);
      }
    }
  }

  const authToken = (config.token || config.authToken || config.apiKey) as string | undefined;
  const transport = (config.transport || 'sse') as 'sse' | 'streamable_http' | 'http' | 'auto';
  const timeoutMs = typeof config.timeoutMs === 'number' ? config.timeoutMs : undefined;

  return {
    url,
    headers,
    authToken: typeof authToken === 'string' ? authToken : undefined,
    transport,
    timeoutMs,
  };
}
