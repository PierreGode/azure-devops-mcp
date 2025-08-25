// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { AccessToken } from "@azure/identity";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebApi } from "azure-devops-node-api";

import { configureAdvSecTools } from "./tools/advsec.js";
import { configureBuildTools } from "./tools/builds.js";
import { configureCoreTools } from "./tools/core.js";
import { configureReleaseTools } from "./tools/releases.js";
import { configureRepoTools } from "./tools/repos.js";
import { configureSearchTools } from "./tools/search.js";
import { configureTestPlanTools } from "./tools/testplans.js";
import { configureWikiTools } from "./tools/wiki.js";
import { configureWorkTools } from "./tools/work.js";
import { configureWorkItemTools, WORKITEM_TOOLS } from "./tools/workitems.js";

interface ToolConfigOptions {
  mode?: "readonly" | "reviewer";
}

function configureAllTools(
  server: McpServer,
  tokenProvider: () => Promise<AccessToken>,
  connectionProvider: () => Promise<WebApi>,
  userAgentProvider: () => string,
  options?: ToolConfigOptions
) {
  if (options?.mode === "readonly") {
    configureWorkItemTools(server, tokenProvider, connectionProvider, userAgentProvider);
    const readOnlyTools = new Set([
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
      if (!readOnlyTools.has(name)) {
        delete (server as any)._registeredTools[name];
      }
    }
    return;
  }

  configureCoreTools(server, tokenProvider, connectionProvider, userAgentProvider);
  configureWorkTools(server, tokenProvider, connectionProvider);
  configureBuildTools(server, tokenProvider, connectionProvider, userAgentProvider);
  configureRepoTools(server, tokenProvider, connectionProvider, userAgentProvider);
  configureWorkItemTools(server, tokenProvider, connectionProvider, userAgentProvider);
  configureReleaseTools(server, tokenProvider, connectionProvider);
  configureWikiTools(server, tokenProvider, connectionProvider);
  configureTestPlanTools(server, tokenProvider, connectionProvider);
  configureSearchTools(server, tokenProvider, connectionProvider, userAgentProvider);
  configureAdvSecTools(server, tokenProvider, connectionProvider);
}

export { configureAllTools };
