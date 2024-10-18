import { makeAutoObservable } from 'mobx';
import { PineNode, PineSuggestedNode } from '../model';
import { State, Table, TableHint } from './http';
import { Edge } from 'reactflow';
import { NodeType } from '../components/Graph.box';
import { Session } from './session';

// Generate a pallette of constrasting modern colors
/**
 * @deprecated Moved to graph.util.ts
 */
const Colors = ['#ff4e50', '#ff9f51', '#ffea51', '#4caf50', '#64b6ac'];

/**
 * @deprecated Moved to graph.util.ts
 */
const makeSelectedNode = (n: Table, order: number): PineNode => {
  const { schema, table, alias } = n;
  const { color } = getColor(n.schema);
  const id = alias;
  return {
    id,
    type: NodeType.Selected,
    data: {
      schema,
      table,
      joinOn: 'unknown',
      color,
      type: 'selected',
      alias,
      order,
    },
    position: { x: 0, y: 0 },
  };
};

/**
 * @deprecated Moved to graph.util.ts
 */
const makeSuggestedNode = (n: TableHint, candidate = false): PineSuggestedNode => {
  const { schema, table, column, pine, parent } = n;
  const { color } = getColor(schema);

  // Pine doesn't support directionality at the moment.
  const id = pine;

  return {
    id,
    type: NodeType.Suggested,
    data: {
      schema,
      table,
      joinOn: column,
      color,
      type: candidate ? 'candidate' : 'suggested',
      pine,
      parent,
    },
    position: { x: 0, y: 0 },
  };
};

export class GraphStore {
  activeSessionId: string = '0';

  // For redrawing
  selectedTables: Table[] = [];
  suggestedTables: TableHint[] = [];
  state: State = {
    hints: {
      table: [],
    },
    'selected-tables': [],
    joins: [],
    context: '',
    operation: { type: 'table' },
  };

  // Candidate
  candidateIndex: number | undefined = undefined;
  candidate: PineNode | null = null;

  constructor() {
    // makeAutoObservable(this);
  }

  public selectNextCandidate = (session: Session, offset: number) => {
    if (this.candidateIndex === undefined) {
      this.candidateIndex = 0;
    } else if (offset) {
      this.candidateIndex = this.candidateIndex + offset;
    }
    this.generateGraphWrapper(session, this.state);
  };

  public getCandidate() {
    if (this.candidateIndex === undefined) {
      return null;
    }
    // TODO: use suggestedNodes?
    return this.suggestedTables[this.candidateIndex % this.suggestedTables.length];
  }

  public resetCandidate(session: Session) {
    this.candidateIndex = undefined;
    this.candidate = null;
    this.generateGraphWrapper(session, this.state);
  }

  /**
   * 1. Calculate candidate index (this could be moved to another function)
   * 2. Make selected nodes using `selectedTables: Table[]`
   * 3. Make suggested nodes using `suggestedTables: TableHint[]`
   */
  public generateGraphWrapper = (session: Session, state: State) => {
    this.state = state;
    this.suggestedTables = state.hints.table;

    this.generateGraph(session);
  };

  public generateGraph = (session: Session) => {
    const { graph } = session;
    const {
      hints: { table: suggestedTables },
      'selected-tables': selectedTables,
      joins,
      context,
    } = this.state;

    // TODO: move index calculation before the graph generation. Pass candidate index as argumnet
    this.candidateIndex = this.getCandidateIndex(suggestedTables, this.candidateIndex);

    // Create nodes for the selected and suggested tables
    const selectedNodes: PineNode[] = selectedTables
      ? selectedTables.map((x, i) => makeSelectedNode(x, i + 1))
      : [];

    // TODO: there can be a better way
    const contextNode: PineNode = selectedNodes.find(n => n.id === context)!;

    const suggestedNodes: PineSuggestedNode[] = [];
    for (const { h, i } of suggestedTables.map((h, i) => ({ h, i }))) {
      const isCandidate = this.candidateIndex !== undefined && i === this.candidateIndex;
      const node = makeSuggestedNode(h, isCandidate);
      suggestedNodes.push(node);
      if (isCandidate) {
        this.candidate = node;
      }
    }
    const nodes = selectedNodes.concat(suggestedNodes);
    const selectedNodesLookup = selectedNodes.reduce(
      (acc, x) => {
        acc[x.id] = x;
        return acc;
      },
      {} as Record<string, PineNode>,
    );

    graph.nodes = nodes;

    // If there are no selected tables, there are no edges
    if (selectedTables.length < 1) {
      graph.edges = [];
      return;
    }

    if (suggestedNodes.length === 0) {
      graph.edges = [];
    }

    // TODO: we don't always have to regenerate the lookup. This can be cached
    const edgeLookup: Record<string, Edge> = {};

    const makeId = ({ from: x, to: y }: { from: PineNode; to: PineNode }) => `${x.id} ${y.id}`;

    for (const [fromAlias, toAlias, relation] of joins) {
      const x = selectedNodesLookup[fromAlias];
      const y = selectedNodesLookup[toAlias];
      if (!x || !y || !relation) {
        continue;
      }
      const e = relation[2] === 'has' ? { from: x, to: y } : { from: y, to: x };
      const id = makeId(e);
      if (!edgeLookup[id]) {
        edgeLookup[id] = {
          id,
          source: e.from.id,
          target: e.to.id,
        };
      }
    }

    for (const y of suggestedNodes) {
      const isParent = y.data.parent;
      const e = { to: isParent ? contextNode : y, from: isParent ? y : contextNode };
      const id = makeId(e);
      if (!edgeLookup[id]) {
        edgeLookup[id] = {
          id,
          source: e.from.id,
          target: e.to.id,
        };
      }
    }

    graph.edges = Object.values(edgeLookup);
  };

  /**
   * Recalculate the candidate index
   * Make sure it doesn't go out of bounds
   */
  private getCandidateIndex(suggestedTables: TableHint[], ci: number | undefined) {
    if (ci === undefined) return; // No candidate selected

    // No suggestions - reset the index
    if (!suggestedTables.length) {
      return 0;
    }
    // Make sure that the index is within bounds i.e. the candidate selection
    // should cycle up or down
    return (ci < 0 ? suggestedTables.length + ci : ci) % suggestedTables.length;
  }
}

/**
 * Get the color for the schema. Note: this function probably has collisions.
 * TODO: Keep track of the schemas and colors to avoid collisions.
 *
 * @deprecated Moved to graph.util.ts
 */
function getColor(schema: string) {
  if (!schema) schema = 'public';
  const hash = schema.split('').reduce((acc, x) => acc + x.charCodeAt(0), 0);
  const color = schema === 'public' ? '#FFF' : Colors[hash % Colors.length];
  return { schema, color };
}
