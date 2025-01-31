/* eslint-disable @typescript-eslint/member-ordering */
import chalk from 'chalk';

export class Logger {
  static $shared?: Logger = undefined;

  static get shared(): Logger {
    if (this.$shared === undefined) {
      this.$shared = new Logger();
    }
    return this.$shared;
  }

  public dbg(title: string, params?: any, note?: string) {
    console.log(logString('dim', { title, params, note }));
  }

  public info(title: string, params?: any, note?: string) {
    console.log(logString('cyan', { title, params, note }));
  }

  public fail(title: string, params?: any, note?: string) {
    console.log(logString('red', { title, params, note }));
  }

  public success(title: string, params?: any, note?: string) {
    console.log(logString('green', { title, params, note }));
  }

  public error(error: Error, params?: any) {
    console.error(
      logString('red', {
        title: error?.message || JSON.stringify(error),
        params: params,
        note: error.stack,
      })
    );
  }
}

// --------------------------------------------------------------------------------

function logString(
  color: 'dim' | 'cyan' | 'red' | 'green',
  logData: { title?: string; note?: string; params?: any } = {}
): string {
  const { title, note, params } = logData;

  let logStr = '';

  if (title) {
    logStr += title + '\n';
  }

  if (note) {
    logStr += chalk.dim(note) + '\n';
  }

  if (params) {
    logStr += chalk.dim(getParams(params)) + '\n';
  }

  logStr = logStr.slice(0, -1);

  return chalk[color](logStr);
}

// --------------------------------------------------------------------------------

function getParams(params: any): string {
  if (typeof params === 'string') {
    return params;
  }

  if (typeof params === 'number') {
    return `${params}`;
  }

  try {
    return JSON.stringify(params, undefined, 3);
  } catch (e) {
    console.error(e);
    return '';
  }
}
