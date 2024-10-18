import { Session } from './session';

const base = 'http://localhost:33333';

export type Table = { schema: string; table: string; alias: string };
export type TableHint = {
  schema: string;
  table: string;
  column: string;
  parent: boolean;
  pine: string;
};

export type Hints = { table: TableHint[] };
// There are more operations. I'll add them as we need to handle them here
export type Operation = { type: 'table' | 'delete' };

/**
 * TODO: move to Session
 */
export type Ast = {
  hints: Hints;
  'selected-tables': Table[];
  joins: string[][];
  context: string;
  operation: Operation;
};
export type State = Ast;

export type Response = {
  result: (string | number)[][];
  'connection-id': string;
  query: string;
  error: string;
  'error-type': string;
  state: Ast;
  ast: Ast;
};

/**
 * @deprecated Use `HttpClient'
 */
export const Http = {
  /**
   * @deprecated Use `HttpClient`
   */
  get: async (path: string): Promise<Response | undefined> => {
    const res = await fetch(`${base}/api/v1/${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      return;
    }
    return await res.json();
  },

  /**
   * @deprecated Use `HttpClient`
   */
  post: async (path: string, body: object): Promise<Response | undefined> => {
    const res = await fetch(`${base}/api/v1/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return;
    }
    return await res.json();
  },
};

export class Client {
  constructor(private readonly onBuild?: (state: State) => void) {}

  private cleanExpression(expression: string): string {
    const e = expression.trim();
    return e.endsWith('|') ? e.slice(0, -1) : e;
  }

  public async eval(expression: string): Promise<Response> {
    const response = await Http.post('eval', { expression: this.cleanExpression(expression) });
    if (!response) {
      throw new Error('No response when trying to eval');
    }
    return response;
  }

  /**
   * The first column is usually the primary key
   */
  public async getFirstColumnName(
    expression: string,
  ): Promise<{ columnName: string; state: State }> {
    const response = await Http.post('eval', {
      expression: this.cleanExpression(`${expression} | 1`),
    });
    if (!response) {
      throw new Error('No response when trying to get the first column name');
    }
    return { columnName: response.result[0][0] as string, state: response.state };
  }

  private async build(expression: string): Promise<Response> {
    const x = this.cleanExpression(expression);
    const response = await Http.post('build', { expression: x });
    if (!response) {
      throw new Error('No response when trying to build');
    }
    this.onBuild && (await this.onBuild(response.state));
    return response;
  }

  public async count(expression: string): Promise<number> {
    const response = await this.eval(`${expression} | count:`);
    if (!response) {
      throw new Error('No respnse when trying to count');
    }
    if (response.error) {
      throw new Error(response.error);
    }
    return response.result[1][0] as number;
  }

  public async makeChildExpressions(
    expression: string,
  ): Promise<{ expressions: string[]; state: State }> {
    // Here we can't use the `build` function as it cleans the expression and
    // hence removing the trailing `|`, but we want to keep it. So we clean the
    // expression and add it explicitly
    const x = `${this.cleanExpression(expression)} |`;
    const response = await Http.post('build', { expression: x });
    if (!response) {
      throw new Error('No response when trying to make child Expressions');
    }
    this.onBuild && (await this.onBuild(response.state));
    const expressions = response.state.hints.table
      .filter(h => !h.parent)
      .map(h => `${x} ${h.pine}`);
    return { expressions, state: response.state };
  }

  public async buildDeleteQuery(
    expression: string,
    limit: number,
  ): Promise<{ query: string; state: State }> {
    const { columnName } = await this.getFirstColumnName(expression);
    const x = `${expression} | limit: ${limit} | delete! .${columnName}`;
    const response = await this.build(x);
    if (!response) {
      throw new Error('No response when trying to build the delete query');
    }
    return response;
  }
}
