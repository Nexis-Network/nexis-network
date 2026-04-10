/**
 * Document Canvas Usage Guide
 *
 * Domain: AI/Metaprompts
 * Responsibility: Instructions for using the Document Canvas to generate long-form content.
 * Depends on: StreamAccumulator, DocumentPanel, DocumentCard
 */

export const DOCUMENT_CANVAS_GUIDE = `
<document_canvas_guide>
The Document Canvas is a feature for generating, viewing, and iterating on long-form content (documents, whitepapers, reports, code files) separately from the chat stream.

<when_to_use_canvas>
**Use Canvas for**:
- Whitepapers or technical specifications (>500 words)
- Detailed research reports or market analysis
- Draft blog posts or articles
- Legal agreements or contracts
- Large code files or modules (>50 lines)
- Any content the user explicitly asks to "create a document" for.

**Do NOT use Canvas for**:
- Brief answers or summaries (<300 words)
- Simple conversational responses
- Quick code snippets (use standard code blocks)
- Artifacts that belong in other categories (e.g., wallet details, charts)
</when_to_use_canvas>

<canvas_trigger_syntax>
To creating a document, emit a \`data-createDocument\` message part. This is typically done by the backend handling the response, but you should structure your intent to trigger this.

If you are generating text that belongs in a document, you should signal the intent CLEARLY at the start of your response:
"I will generate a document for [Title]..."

**Protocol**:
When the user asks for a document:
1.  Acknowledge the request.
2.  Generate the \`data-createDocument\` structure (or instructed the system to do so).
3.  The structure MUST include:
    - \`title\`: Clear, descriptive title.
    - \`type\`: e.g., 'markdown', 'code'.
    - \`content\`: The full body of the document.

**Example Internal Representation** (for system understanding):
\`\`\`json
{
  "type": "data-createDocument",
  "data": {
    "title": "Nex-T1 Whitepaper",
    "status": "success",
    "content": "# Nex-T1 Whitepaper\n\n## Abstract\n..."
  }
}
\`\`\`
</canvas_trigger_syntax>

<content_templates>

### Whitepaper
Title: "[Project Name] Whitepaper"
Structure:
1.  **Executive Summary**: High-level overview.
2.  **Problem Statement**: What are we solving?
3.  **Solution Architecture**: Technical details.
4.  **Tokenomics**: Economy and incentives.
5.  **Roadmap**: Timeline.
6.  **Conclusion**: Final thoughts.

### Research Report
Title: "[Topic] Research Report"
Structure:
1.  **Overview**: Context and scope.
2.  **Key Findings**: Bulleted list of critical insights.
3.  **Data Analysis**: Detailed breakdown with supporting evidence.
4.  **Market Impact**: Implications for the sector.
5.  **Recommendations**: Actionable advice.

### Technical Spec
Title: "[Feature/System] Technical Specification"
Structure:
1.  **Objective**: Goal of the feature.
2.  **Scope**: In/Out of scope items.
3.  **Architecture**: Diagrams (Mermaid) and component descriptions.
4.  **API Design**: Endpoints and interfaces.
5.  **Database Schema**: Tables and relationships.
6.  **Security Considerations**: Risks and mitigations.

</content_templates>

<best_practices>
1.  **Markdown First**: Use standard Markdown for formatting (headers, lists, bold/italic).
2.  **Code Blocks**: Use triple backticks for code within the document.
3.  **Mermaid Diagrams**: You can embed Mermaid diagrams for architecture or flows.
4.  **Iterative Refinement**: If the user asks for changes, you will update the EXISTING document rather than creating a new one (unless requested).
5.  **Grounding**: For research/report documents, distinguish verified findings from open questions and cite only sources actually used.
6.  **Mid-Conversation Updates**: If the user changes the outline or goal, revise the existing document in place unless they explicitly ask for a new document.
</best_practices>

</document_canvas_guide>
`.trim();
