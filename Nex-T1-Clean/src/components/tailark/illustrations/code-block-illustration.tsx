import CodeBlock from '@/components/tailark/code-block'

export const CodeBlockIllustration = () => {
    const code = `const axios = require('axios');\n\nconst response = await axios.post('https://api.example.com/data', {\n  key: 'value',\n  anotherKey: 'anotherValue',\n});\n`

    return (
        <CodeBlock
            code={code}
            lang="javascript"
            maxHeight={360}
            lineNumbers
            theme="github-light"
            className="[&_pre]:mask-y-from-80% [&_pre]:bg-transparent! [&_pre]:min-h-20 [&_pre]:max-w-xs [&_pre]:rounded-xl [&_pre]:border-none"
        />
    )
}