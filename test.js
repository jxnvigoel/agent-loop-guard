const { createLoopGuard } = require("./index");

const rawTools = {
  searchWeb: async ({ query }) => `No results found for "${query}"`,
  readDocs: async ({ topic }) => `Docs checked for "${topic}"`,
};

const guard = createLoopGuard({
  maxIdenticalCalls: 2,
  onLoop: ({ toolName, reason }) => {
    console.log(`Alert triggered: ${reason} on ${toolName}`);
  },
});

const tools = guard.wrapAll(rawTools);

async function runTests() {
  console.log("--- 1. Testing Direct Repeat Loop ---");
  for (let step = 1; step <= 3; step++) {
    const result = await tools.searchWeb({ query: "fix bug" });
    console.log(`Step ${step}:`, result);
  }

  guard.reset();

  console.log("\n--- 2. Testing Ping-Pong Loop ---");
  console.log("Step 1:", await tools.searchWeb({ query: "auth error" }));
  console.log("Step 2:", await tools.readDocs({ topic: "auth" }));
  console.log("Step 3:", await tools.searchWeb({ query: "auth error" }));
  console.log("Step 4:", await tools.readDocs({ topic: "auth" }));
}

runTests();
