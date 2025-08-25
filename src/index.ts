#!/usr/bin/env node

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as azdev from "azure-devops-node-api";
import { AccessToken, AzureCliCredential, ChainedTokenCredential, DefaultAzureCredential, TokenCredential } from "@azure/identity";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { configurePrompts } from "./prompts.js";
import { configureAllTools } from "./tools.js";
import { UserAgentComposer } from "./useragent.js";
import { packageVersion } from "./version.js";

// Parse command line arguments using yargs
const argv = yargs(hideBin(process.argv))
  .scriptName("mcp-server-azuredevops")
  .usage("Usage: $0 <organization> [options]")
  .version(packageVersion)
  .command("$0 <organization>", "Azure DevOps MCP Server", (yargs) => {
    yargs.positional("organization", {
      describe: "Azure DevOps organization name",
      type: "string",
    });
  })
  .option("tenant", {
    alias: "t",
    describe: "Azure tenant ID (optional, required for multi-tenant scenarios)",
    type: "string",
  })
  .help()
  .parseSync();

export const orgName = (argv.organization as string) ?? process.env.ADO_ORGANIZATION ?? "";
if (!orgName) {
  throw new Error("Organization name must be provided via argument or ADO_ORGANIZATION env variable");
}

const tenantId = argv.tenant;
const orgUrl = "https://dev.azure.com/" + orgName;
const _projectName = process.env.ADO_PROJECT;

const mcpApiKey = process.env.MCP_API_KEY;
const readOnlyKey = process.env.MCP_API_KEY_READ_ONLY;
const reviewerKey = process.env.MCP_API_KEY_REVIEWER;
let mcpMode: "readonly" | "reviewer";
if (mcpApiKey && readOnlyKey && mcpApiKey === readOnlyKey) {
  mcpMode = "readonly";
} else if (mcpApiKey && reviewerKey && mcpApiKey === reviewerKey) {
  mcpMode = "reviewer";
} else {
  throw new Error("Invalid or missing MCP_API_KEY");
}

async function getAzureDevOpsToken(): Promise<AccessToken> {
  if (process.env.ADO_MCP_AZURE_TOKEN_CREDENTIALS) {
    process.env.AZURE_TOKEN_CREDENTIALS = process.env.ADO_MCP_AZURE_TOKEN_CREDENTIALS;
  } else {
    process.env.AZURE_TOKEN_CREDENTIALS = "dev";
  }
  let credential: TokenCredential = new DefaultAzureCredential(); // CodeQL [SM05138] resolved by explicitly setting AZURE_TOKEN_CREDENTIALS
  if (tenantId) {
    // Use Azure CLI credential if tenantId is provided for multi-tenant scenarios
    const azureCliCredential = new AzureCliCredential({ tenantId });
    credential = new ChainedTokenCredential(azureCliCredential, credential);
  }

  const token = await credential.getToken("499b84ac-1321-427f-aa17-267ca6975798/.default");
  if (!token) {
    throw new Error("Failed to obtain Azure DevOps token. Ensure you have Azure CLI logged in or another token source setup correctly.");
  }
  return token;
}

function getAzureDevOpsClient(userAgentComposer: UserAgentComposer): () => Promise<azdev.WebApi> {
  return async () => {
    const options = {
      productName: "AzureDevOps.MCP",
      productVersion: packageVersion,
      userAgent: userAgentComposer.userAgent,
    };

    if (process.env.ADO_PAT) {
      const authHandler = azdev.getPersonalAccessTokenHandler(process.env.ADO_PAT);
      return new azdev.WebApi(orgUrl, authHandler, undefined, options);
    }

    const token = await getAzureDevOpsToken();
    const authHandler = azdev.getBearerHandler(token.token);
    return new azdev.WebApi(orgUrl, authHandler, undefined, options);
  };
}

async function main() {
  const server = new McpServer({
    name: "Azure DevOps MCP Server",
    version: packageVersion,
  });

  const userAgentComposer = new UserAgentComposer(packageVersion);
  server.server.oninitialized = () => {
    userAgentComposer.appendMcpClientInfo(server.server.getClientVersion());
  };

  configurePrompts(server);

  configureAllTools(server, getAzureDevOpsToken, getAzureDevOpsClient(userAgentComposer), () => userAgentComposer.userAgent, {
    mode: mcpMode,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
