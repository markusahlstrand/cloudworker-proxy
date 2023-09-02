import { MiddlewareHandler } from 'hono';

export interface Rule {
  path: string;
  methods?: 'GET' | 'PATCH' | 'POST' | 'POST' | 'OPTION' | 'DELETE' | 'ALL';
  options?: { [key: string]: string | number };
  handler: MiddlewareHandler;
}
