import { createContext, useContext } from 'react';
import { GlobalStore } from './global.store';
import { GraphStore } from './graph.store';

class StoreContainer {
  graph = new GraphStore();
  global = new GlobalStore(this.graph);
}

const container = new StoreContainer();
const StoresContext = createContext(container);
export const useStores = () => useContext(StoresContext);
