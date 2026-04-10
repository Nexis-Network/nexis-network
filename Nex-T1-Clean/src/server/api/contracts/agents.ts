export type AgentInvokeParams = {
  id: string;
};

export type AgentInvokeRouteContext = {
  params: Promise<AgentInvokeParams>;
};
