const USER_AGENT_HEADER = ["user", "agent"].join("-");

export const getClientAgent = (req) => {
  if (!req) return undefined;
  if (typeof req.get === "function") {
    return req.get(USER_AGENT_HEADER);
  }
  return req.headers?.[USER_AGENT_HEADER];
};

export { USER_AGENT_HEADER };
