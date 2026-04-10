// Mock @opentelemetry/semantic-conventions for Edge Runtime
const SemanticResourceAttributes = {};
const SemanticAttributes = {};

// CommonJS export
module.exports = {
  SemanticResourceAttributes,
  SemanticAttributes,
};

// ES Module export
export { SemanticResourceAttributes, SemanticAttributes };
const opentelemetrySemanticConventionsMock = {
  SemanticResourceAttributes,
  SemanticAttributes,
};

export default opentelemetrySemanticConventionsMock;
