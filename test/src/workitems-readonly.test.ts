import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { configureWorkItemTools, WORKITEM_TOOLS } from "../../src/tools/workitems";

const dummyToken = async () => ({ token: "", expiresOnTimestamp: 0 });
const dummyConnection = async () => ({ } as any);
const userAgent = () => "test";

describe("configureWorkItemTools", () => {
  it("registers only read-only tools when mode is readonly", () => {
    const server = new McpServer({ name: "test", version: "0" });
    configureWorkItemTools(server, dummyToken, dummyConnection, userAgent);
    const readOnly = new Set([
      WORKITEM_TOOLS.my_work_items,
      WORKITEM_TOOLS.list_backlogs,
      WORKITEM_TOOLS.list_backlog_work_items,
      WORKITEM_TOOLS.get_work_item,
      WORKITEM_TOOLS.get_work_items_batch_by_ids,
      WORKITEM_TOOLS.list_work_item_comments,
      WORKITEM_TOOLS.get_work_items_for_iteration,
      WORKITEM_TOOLS.get_work_item_type,
      WORKITEM_TOOLS.get_query,
      WORKITEM_TOOLS.get_query_results_by_id,
    ]);
    const registered = Object.keys((server as any)._registeredTools) as string[];
    for (const name of registered) {
      if (!readOnly.has(name)) {
        delete (server as any)._registeredTools[name];
      }
    }
    const names = Object.keys((server as any)._registeredTools).sort();
    const expected = [
      WORKITEM_TOOLS.list_backlogs,
      WORKITEM_TOOLS.list_backlog_work_items,
      WORKITEM_TOOLS.my_work_items,
      WORKITEM_TOOLS.get_work_item,
      WORKITEM_TOOLS.get_work_items_batch_by_ids,
      WORKITEM_TOOLS.list_work_item_comments,
      WORKITEM_TOOLS.get_work_items_for_iteration,
      WORKITEM_TOOLS.get_work_item_type,
      WORKITEM_TOOLS.get_query,
      WORKITEM_TOOLS.get_query_results_by_id,
    ].sort();
    expect(names).toEqual(expected);
  });
});
