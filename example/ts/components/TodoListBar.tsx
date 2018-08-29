

import * as React from "react";
import { createFragmentContainer, graphql, RelayProp } from "react-relay";

import { TodoListBar_viewer } from "../__relay_artifacts__/TodoListBar_viewer.graphql";

interface Props {
  relay: RelayProp
  viewer: TodoListBar_viewer
}

class TodoListFoo extends React.Component<Props> {
  render() {
    return null
  }
}

export default createFragmentContainer(
  TodoListFoo,
  graphql`
    fragment TodoListBar_viewer on User {
      id
    }
  `
