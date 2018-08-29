import * as React from "react";

import { TodoListBar_viewer } from "../__relay_artifacts__/TodoListBar_viewer.graphql";
import TodoListBar from "./TodoListBar";

interface Props {
  viewer: TodoListBar_viewer
}

class TodoListFoo extends React.Component<Props> {
  render() {
    return <TodoListBar viewer={this.props.viewer}/>
  }
}

export default TodoListFoo
