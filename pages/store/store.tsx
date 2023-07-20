import { makeAutoObservable } from "mobx";
import { format } from "sql-formatter";
import { Http, Response } from "./http";

type Column = {
    field: string;
    headerName: string;
    flex: number;
    editable: boolean;
}

type Row = { [key: string]: any; };
export class Store {
    connectionName = '';
    expression = '';
    query = '';
    loaded = false;
    error = '';
    hints: string = '';
    columns: Column[] = [];
    rows: Row[] = [];

    constructor() {
        makeAutoObservable(this);
    }

    getActiveConnection = async () => {
        const response = await Http.get('connection');
        if (!response) return;
        this.connectionName = response.result as string;
        return this.connectionName;
    }

    buildQuery = async () => {
        const response = await Http.post('build', {
          expression: this.expression
        });

        if (!response) return;
        this.handleError(response);
        this.setConnection(response);
        this.setQuery(response);
        this.setHints(response);
    }

    handleError = (response: Response) => {
        this.error = response.error || '';
    }

    setConnection = (response: Response) => {
        if (!response["connection-id"]) return;
        this.connectionName = response["connection-id"];
    }

    setQuery = (response: Response) => {
        if (!response.query) return;
        this.query = format(response.query, {
            language: 'postgresql'
        });
        this.loaded = false;
    }

    setHints = (response: Response) => {
        this.hints = response.hints ? JSON.stringify(response.hints) : '';
    }

    evaluate = async () => {
        const response = await Http.post('eval', {
          expression: this.expression
        });

        if (!response) return;
        this.handleError(response);
        this.setConnection(response);
        this.setQuery(response);
        if (!response.result) return;

        const rows = response.result as Row[];
        if (rows.length < 1) {
            this.columns = [];
            this.rows = [];
            return;
        }
        const columns = Object.keys(rows[0]).map(header => { 
            return {
                field: header,
                headerName: header,
                flex: 1,
                editable: true,
                minWidth: 200,
                maxWidth: 400,
            };
        });
        this.columns = columns;
        this.rows = rows;
        this.loaded = true;
    }
}