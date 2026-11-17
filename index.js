/**
 * Converts any value into a consistent string so objects with keys
 * in different orders still produce the exact same signature.
 */
function stableStringify(value) {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  const keys = Object.keys(value).sort();
  const pairs = keys.map(
    (key) => JSON.stringify(key) + ":" + stableStringify(value[key])
  );
  return "{" + pairs.join(",") + "}";
}

/**
 * Creates a loop guard instance to track and block repetitive tool calls.
 */
function createLoopGuard(options = {}) {
  const maxIdenticalCalls = options.maxIdenticalCalls ?? 2;
  const windowSize = options.windowSize ?? 10;
  const detectPingPong = options.detectPingPong ?? true;
  const onLoop = options.onLoop ?? null;

  const history = [];

  function recordCall(signature) {
    history.push(signature);
    if (history.length > windowSize) {
      history.shift();
    }
  }

  function checkForLoop(toolName, args) {
    const signature = `${toolName}:${stableStringify(args)}`;

    // 1. Direct repetition check (A -> A -> A)
    const repeatCount = history.filter((item) => item === signature).length;
    if (repeatCount >= maxIdenticalCalls) {
      return {
        blocked: true,
        reason: "DIRECT_REPEAT",
        message: `[Loop Guard] Blocked: You have already called "${toolName}" with these exact arguments ${repeatCount} times. Stop repeating this call and try a different tool or strategy.`,
      };
    }

    // 2. Ping-pong loop check (A -> B -> A -> B)
    if (detectPingPong && history.length >= 3) {
      const len = history.length;
      const prev1 = history[len - 1];
      const prev2 = history[len - 2];
      const prev3 = history[len - 3];

      if (signature === prev2 && prev1 === prev3 && signature !== prev1) {
        return {
          blocked: true,
          reason: "PING_PONG_LOOP",
          message: `[Loop Guard] Blocked: Oscillating loop detected involving "${toolName}". Break the cycle and choose a different approach.`,
        };
      }
    }

    recordCall(signature);
    return { blocked: false };
  }

  function wrap(toolName, toolFn) {
    return async function guardedTool(...args) {
      const check = checkForLoop(toolName, args);

      if (check.blocked) {
        if (typeof onLoop === "function") {
          onLoop({ toolName, args, reason: check.reason });
        }
        return check.message;
      }

      return await toolFn(...args);
    };
  }

  function wrapAll(toolsObject) {
    const wrapped = {};
    for (const [name, fn] of Object.entries(toolsObject)) {
      if (typeof fn === "function") {
        wrapped[name] = wrap(name, fn);
      }
    }
    return wrapped;
  }

  function reset() {
    history.length = 0;
  }

  return {
    wrap,
    wrapAll,
    reset,
    getHistory: () => [...history],
  };
}

module.exports = { createLoopGuard };
