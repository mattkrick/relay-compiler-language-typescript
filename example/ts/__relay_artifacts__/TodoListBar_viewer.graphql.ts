/* tslint:disable */

import { ConcreteFragment } from "relay-runtime";
declare const _TodoListBar_viewer$ref: unique symbol;
export type TodoListBar_viewer$ref = typeof _TodoListBar_viewer$ref;
export type TodoListBar_viewer = {
    readonly id: string;
    readonly " $refType": TodoListBar_viewer$ref;
};



const node: ConcreteFragment = {
  "kind": "Fragment",
  "name": "TodoListBar_viewer",
  "type": "User",
  "metadata": null,
  "argumentDefinitions": [],
  "selections": [
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "id",
      "args": null,
      "storageKey": null
    }
  ]
};
(node as any).hash = '65bcc1d6e1081e0be029bd9c89c9723c';
export default node;
