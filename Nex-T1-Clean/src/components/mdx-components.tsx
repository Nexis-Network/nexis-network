export const mdxComponents = {
    h2: (props: React.ComponentProps<'h2'>) => (
        <h2
            className="text-foreground mb-4 mt-16 scroll-mt-20 text-2xl font-semibold first:mt-0"
            {...props}
        />
    ),
    h3: (props: React.ComponentProps<'h3'>) => (
        <h3
            className="text-foreground mb-3 mt-6 scroll-mt-20 text-xl font-semibold"
            {...props}
        />
    ),
    h4: (props: React.ComponentProps<'h4'>) => (
        <h4
            className="text-foreground mb-3 mt-6 text-lg font-semibold"
            {...props}
        />
    ),
    p: (props: React.ComponentProps<'p'>) => (
        <p
            className="text-muted-foreground mb-4 text-base leading-relaxed"
            {...props}
        />
    ),
    blockquote: (props: React.ComponentProps<'blockquote'>) => (
        <blockquote
            className="border-muted my-8 border-l-4 pl-4 text-xl"
            {...props}
        />
    ),
    ul: (props: React.ComponentProps<'ul'>) => (
        <ul
            className="text-muted-foreground mb-4 ml-6 list-disc space-y-2"
            {...props}
        />
    ),
    ol: (props: React.ComponentProps<'ol'>) => (
        <ol
            className="text-muted-foreground mb-4 ml-6 list-decimal space-y-2"
            {...props}
        />
    ),
    li: (props: React.ComponentProps<'li'>) => (
        <li
            className="leading-relaxed"
            {...props}
        />
    ),
    strong: (props: React.ComponentProps<'strong'>) => (
        <strong
            className="text-foreground font-semibold"
            {...props}
        />
    ),
    em: (props: React.ComponentProps<'em'>) => (
        <em
            className="italic"
            {...props}
        />
    ),
    code: (props: React.ComponentProps<'code'>) => (
        <code
            className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-sm"
            {...props}
        />
    ),
    a: (props: React.ComponentProps<'a'>) => (
        <a
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
        />
    ),
    table: (props: React.ComponentProps<'table'>) => (
        <div className="mb-6 overflow-x-auto">
            <table
                className="text-muted-foreground w-full text-sm"
                {...props}
            />
        </div>
    ),
    thead: (props: React.ComponentProps<'thead'>) => (
        <thead
            className="border-border border-b"
            {...props}
        />
    ),
    th: (props: React.ComponentProps<'th'>) => (
        <th
            className="text-foreground px-4 py-2 text-left font-semibold"
            {...props}
        />
    ),
    td: (props: React.ComponentProps<'td'>) => (
        <td
            className="border-border border-b px-4 py-2"
            {...props}
        />
    ),
    hr: (props: React.ComponentProps<'hr'>) => (
        <hr
            className="border-border my-8"
            {...props}
        />
    ),
}