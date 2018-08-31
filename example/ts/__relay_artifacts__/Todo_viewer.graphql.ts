/* tslint:disable */

import { ConcreteFragment } from "relay-runtime";
declare const _Todo_viewer$ref: unique symbol;
export type Todo_viewer$ref = typeof _Todo_viewer$ref;
export type Todo_viewer = {
    readonly id: string;
    readonly totalCount: number | null;
    readonly completedCount: number | null;
    readonly animal: ({
        readonly noise?: {
            readonly name: string;
        };
    }) | null;
    readonly " $refType": Todo_viewer$ref;
};



const node: ConcreteFragment = {
  "kind": "Fragment",
  "name": "Todo_viewer",
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
    },
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "totalCount",
      "args": null,
      "storageKey": null
    },
    {
      "kind": "ScalarField",
      "alias": null,
      "name": "completedCount",
      "args": null,
      "storageKey": null
    },
    {
      "kind": "LinkedField",
      "alias": null,
      "name": "animal",
      "storageKey": null,
      "args": null,
      "concreteType": null,
      "plural": false,
      "selections": [
        {
          "kind": "InlineFragment",
          "type": "Dog",
          "selections": [
            {
              "kind": "LinkedField",
              "alias": null,
              "name": "noise",
              "storageKey": null,
              "args": null,
              "concreteType": "Bark",
              "plural": false,
              "selections": [
                {
                  "kind": "ScalarField",
                  "alias": null,
                  "name": "name",
                  "args": null,
                  "storageKey": null
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};
(node as any).hash = '011317e4b7523048187233a83ba3f036';
export default node;
