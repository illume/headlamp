// Stub for langsmith — pulled by @langchain/core for optional tracing
// but never used directly by the ai-assistant plugin.
// Exporting no-op placeholders keeps @langchain/core happy at import time.

/* eslint-disable @typescript-eslint/no-unused-vars */

export class Client {}
export class RunTree {}

export type KVMap = Record<string, any>;
export type BaseRun = any;
export type Run = any;
export type RunCreate = any;
export type RunUpdate = any;
export type RunTreeConfig = any;
export type LangSmithTracingClientInterface = any;
export type TraceableFunction = any;

export function getCurrentRunTree() {
  return undefined;
}
export function isTraceableFunction() {
  return false;
}
export function isRunTree() {
  return false;
}
export function convertToDottedOrderFormat() {
  return '';
}
export function getDefaultProjectName() {
  return '';
}

export default {};
