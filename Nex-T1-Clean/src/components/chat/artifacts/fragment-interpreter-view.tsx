'use client'

import { ExecutionResultInterpreter } from '@/lib/types'
import {
  Artifact,
  ArtifactContent,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactActions,
  ArtifactAction,
} from '@/components/ai-elements/artifact'
import { CodeBlock, CodeBlockCopyButton } from '@/components/ai-elements/code-block'
import { TerminalIcon, CopyIcon } from 'lucide-react'

export function FragmentInterpreter({ result }: { result: ExecutionResultInterpreter }) {
  // If there are no results, don't render anything (or render a placeholder if needed)
  if (!result.results || result.results.length === 0) {
     if (result.stdout && result.stdout.length > 0) {
        // Render stdout as a code block
         return (
            <Artifact className="my-4">
              <ArtifactHeader>
                 <div className="flex items-center gap-2">
                    <TerminalIcon className="size-4 text-muted-foreground" />
                    <ArtifactTitle>Output</ArtifactTitle>
                 </div>
                 <ArtifactActions>
                   <ArtifactAction icon={CopyIcon} label="Copy" />
                 </ArtifactActions>
              </ArtifactHeader>
              <ArtifactContent className="p-0">
                  <CodeBlock 
                    code={result.stdout.join('\n')} 
                    language="bash" 
                    className="border-none rounded-none"
                  >
                     <CodeBlockCopyButton />
                  </CodeBlock>
              </ArtifactContent>
            </Artifact>
         )
     }
     return null;
  }

  return (
    <div className="flex flex-col gap-4 my-4">
      {result.results.map((item, index) => {
        if (item.text) {
          return (
            <Artifact key={index}>
              <ArtifactHeader>
                <div className="flex items-center gap-2">
                   <TerminalIcon className="size-4 text-muted-foreground" />
                   <ArtifactTitle>Output</ArtifactTitle>
                </div>
                 <ArtifactActions>
                   {/* We can wire up real actions later if needed */}
                 </ArtifactActions>
              </ArtifactHeader>
              <ArtifactContent className="p-0">
                 <CodeBlock 
                   code={item.text} 
                   language="plaintext" 
                   className="border-none rounded-none"
                 >
                    <CodeBlockCopyButton />
                 </CodeBlock>
              </ArtifactContent>
            </Artifact>
          )
        }
        if (item.html) {
             return (
               <Artifact key={index}>
                 <ArtifactHeader>
                    <ArtifactTitle>HTML Preview</ArtifactTitle>
                 </ArtifactHeader>
                 <ArtifactContent>
                   <div dangerouslySetInnerHTML={{ __html: item.html }} />
                 </ArtifactContent>
               </Artifact>
             )
        }
        if (item.png) {
          return (
            <Artifact key={index}>
              <ArtifactContent className="flex justify-center bg-[var(--artifact-surface)] p-2">
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                 <img src={`data:image/png;base64,${item.png}`} alt="Output" className="max-w-full rounded-md shadow-sm" />
              </ArtifactContent>
            </Artifact>
          )
        }
        if (item.jpeg) {
          return (
             <Artifact key={index}>
              <ArtifactContent className="flex justify-center bg-[var(--artifact-surface)] p-2">
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                 <img src={`data:image/jpeg;base64,${item.jpeg}`} alt="Output" className="max-w-full rounded-md shadow-sm" />
              </ArtifactContent>
            </Artifact>
          )
        }
        if (item.svg) {
          return (
            <Artifact key={index}>
              <ArtifactContent className="rounded-md bg-[var(--artifact-preview-canvas)] p-4">
                 <div dangerouslySetInnerHTML={{ __html: item.svg }} />
              </ArtifactContent>
            </Artifact>
          )
        }
        return null;
      })}
    </div>
  )
}
