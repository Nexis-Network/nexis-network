import { CopyButton } from '@/components/ui/copy-button'
import { Artifact, ArtifactContent, ArtifactHeader, ArtifactTitle, ArtifactActions } from '@/components/ai-elements/artifact'
import { CodeBlock } from '@/components/ai-elements/code-block'
import { FileCode2 } from 'lucide-react'

export function CodeView({ code, language = 'typescript' }: { code: string; language?: string }) {
  return (
    <Artifact className="my-4">
      <ArtifactHeader>
        <div className="flex items-center gap-2">
          <FileCode2 className="size-4 text-muted-foreground" />
          <ArtifactTitle className="capitalize">{language}</ArtifactTitle>
        </div>
        <ArtifactActions>
          <CopyButton content={code} />
        </ArtifactActions>
      </ArtifactHeader>
      <ArtifactContent className="p-0">
        <CodeBlock code={code} language={language} className="rounded-none border-0" />
      </ArtifactContent>
    </Artifact>
  )
}
