import { ExecutionResultWeb } from '@/lib/types'
import { ExternalLink, Globe } from 'lucide-react'
import { Artifact, ArtifactContent, ArtifactHeader, ArtifactTitle, ArtifactActions, ArtifactAction } from '@/components/ai-elements/artifact'

export function FragmentWeb({ result }: { result: ExecutionResultWeb }) {
  return (
    <Artifact className="my-4">
      <ArtifactHeader>
        <div className="flex items-center gap-2 overflow-hidden">
           <Globe className="size-4 text-muted-foreground shrink-0" />
           <ArtifactTitle className="shrink-0">Preview</ArtifactTitle>
           <div className="mx-1 h-4 w-[1px] shrink-0 bg-[var(--artifact-border)]" />
           <span className="text-xs text-muted-foreground truncate font-mono opacity-50">{result.url}</span>
        </div>
        <ArtifactActions>
           <ArtifactAction 
             icon={ExternalLink} 
             label="Open in new tab" 
             onClick={() => window.open(result.url, '_blank')} 
           />
        </ArtifactActions>
      </ArtifactHeader>
      <ArtifactContent className="p-0">
        <iframe 
          src={result.url} 
          className="h-[400px] w-full border-none bg-[var(--artifact-preview-canvas)]" 
          title="Web Preview" 
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </ArtifactContent>
    </Artifact>
  )
}
