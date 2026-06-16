import { memo, type JSX } from "react";
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { CodeBlock } from "./CodeBlock";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function extractFilename(meta?: string): string | undefined {
  if (!meta) return undefined;
  const trimmed = meta.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

function parseCodeProps(props: {
  className?: string;
  children?: React.ReactNode;
  node?: unknown;
}): { code: string; language?: string; filename?: string } {
  const match = /language-(\S+)/.exec(props.className ?? "");
  const language = match?.[1];
  const code = String(props.children ?? "").replace(/\n$/, "");

  const node = props.node as { data?: { meta?: string } } | undefined;
  const meta = node?.data?.meta;
  const filename = extractFilename(meta);

  return { code, language, filename };
}

function handleLinkClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
  e.preventDefault();
  if (typeof window !== "undefined" && window.nova) {
    window.nova.engine.sendMessage(`Open URL: ${href}`).catch(() => {
      window.open(href, "_blank", "noopener,noreferrer");
    });
  } else {
    window.open(href, "_blank", "noopener,noreferrer");
  }
}

type CodeProps = JSX.IntrinsicElements["code"] & ExtraProps;
type PreProps = JSX.IntrinsicElements["pre"] & ExtraProps;
type AnchorProps = JSX.IntrinsicElements["a"] & ExtraProps;
type ImgProps = JSX.IntrinsicElements["img"] & ExtraProps;
type BlockquoteProps = JSX.IntrinsicElements["blockquote"] & ExtraProps;
type HeadingProps = JSX.IntrinsicElements["h1"] & ExtraProps;
type TableProps = JSX.IntrinsicElements["table"] & ExtraProps;
type SectionProps = JSX.IntrinsicElements["thead"] & ExtraProps;
type RowProps = JSX.IntrinsicElements["tr"] & ExtraProps;
type CellProps = JSX.IntrinsicElements["td"] & ExtraProps;
type UlProps = JSX.IntrinsicElements["ul"] & ExtraProps;
type OlProps = JSX.IntrinsicElements["ol"] & ExtraProps;
type ListItemProps = JSX.IntrinsicElements["li"] & ExtraProps;
type ParagraphProps = JSX.IntrinsicElements["p"] & ExtraProps;
type HrProps = JSX.IntrinsicElements["hr"] & ExtraProps;
type StrongProps = JSX.IntrinsicElements["strong"] & ExtraProps;
type EmProps = JSX.IntrinsicElements["em"] & ExtraProps;
type DelProps = JSX.IntrinsicElements["del"] & ExtraProps;
type InputProps = JSX.IntrinsicElements["input"] & ExtraProps;

const components: Components = {
  code(props: CodeProps) {
    const { children, className, ...rest } = props;
    const isInline = !className;

    if (isInline) {
      return (
        <code
          className="bg-neutral-800 text-neutral-200 rounded px-1 py-0.5 text-[0.85em] font-mono"
          {...rest}
        >
          {children}
        </code>
      );
    }

    const { code, language, filename } = parseCodeProps({
      className,
      children,
      node: (props as { node?: unknown }).node,
    });

    return <CodeBlock code={code} language={language} filename={filename} />;
  },

  pre(props: PreProps) {
    return <>{props.children}</>;
  },

  a(props: AnchorProps) {
    const { href, children, ...rest } = props;
    return (
      <a
        href={href}
        onClick={href ? (e) => handleLinkClick(e, href) : undefined}
        className="text-nova-400 hover:text-nova-300 underline underline-offset-2 decoration-nova-500/40 hover:decoration-nova-400 transition-colors cursor-pointer"
        {...rest}
      >
        {children}
      </a>
    );
  },

  img(props: ImgProps) {
    const { src, alt, ...rest } = props;
    return (
      <img
        src={src}
        alt={alt ?? ""}
        className="max-w-full h-auto rounded-lg border border-neutral-800 my-2"
        loading="lazy"
        {...rest}
      />
    );
  },

  blockquote(props: BlockquoteProps) {
    return (
      <blockquote
        className="border-l-4 border-nova-500 pl-4 py-1 my-3 text-neutral-400 italic bg-neutral-900/30 rounded-r"
        {...props}
      />
    );
  },

  h1(props: HeadingProps) {
    return (
      <h1
        className="text-2xl font-bold text-neutral-100 mt-6 mb-3 pb-2 border-b border-neutral-800"
        {...props}
      />
    );
  },

  h2(props: HeadingProps) {
    return (
      <h2
        className="text-xl font-semibold text-neutral-100 mt-5 mb-2 pb-1.5 border-b border-neutral-800/60"
        {...props}
      />
    );
  },

  h3(props: HeadingProps) {
    return (
      <h3
        className="text-lg font-semibold text-neutral-200 mt-4 mb-2"
        {...props}
      />
    );
  },

  h4(props: HeadingProps) {
    return (
      <h4
        className="text-base font-semibold text-neutral-200 mt-3 mb-1.5"
        {...props}
      />
    );
  },

  h5(props: HeadingProps) {
    return (
      <h5
        className="text-sm font-semibold text-neutral-300 mt-3 mb-1"
        {...props}
      />
    );
  },

  h6(props: HeadingProps) {
    return (
      <h6
        className="text-sm font-medium text-neutral-400 mt-2 mb-1"
        {...props}
      />
    );
  },

  table(props: TableProps) {
    return (
      <div className="overflow-x-auto my-3 rounded-lg border border-neutral-800">
        <table className="w-full text-sm" {...props} />
      </div>
    );
  },

  thead(props: SectionProps) {
    return <thead className="bg-neutral-900" {...props} />;
  },

  tbody(props: SectionProps) {
    return <tbody className="divide-y divide-neutral-800" {...props} />;
  },

  tr(props: RowProps) {
    return (
      <tr
        className="even:bg-neutral-900/40 hover:bg-neutral-800/40 transition-colors"
        {...props}
      />
    );
  },

  th(props: CellProps) {
    return (
      <th
        className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-300 uppercase tracking-wider"
        {...props}
      />
    );
  },

  td(props: CellProps) {
    return (
      <td
        className="px-4 py-2.5 text-neutral-300"
        {...props}
      />
    );
  },

  ul(props: UlProps) {
    return <ul className="list-disc list-inside my-2 space-y-1 text-neutral-200" {...props} />;
  },

  ol(props: OlProps) {
    return <ol className="list-decimal list-inside my-2 space-y-1 text-neutral-200" {...props} />;
  },

  li(props: ListItemProps) {
    return <li className="text-neutral-200 leading-relaxed" {...props} />;
  },

  p(props: ParagraphProps) {
    return <p className="my-2 text-neutral-200 leading-relaxed" {...props} />;
  },

  hr(_props: HrProps) {
    return <hr className="my-4 border-neutral-800" />;
  },

  strong(props: StrongProps) {
    return <strong className="font-semibold text-neutral-100" {...props} />;
  },

  em(props: EmProps) {
    return <em className="italic text-neutral-300" {...props} />;
  },

  del(props: DelProps) {
    return <del className="line-through text-neutral-500" {...props} />;
  },

  input(props: InputProps) {
    const { checked, ...rest } = props;
    return (
      <input
        type="checkbox"
        checked={checked}
        readOnly
        className="mr-1.5 rounded border-neutral-600 bg-neutral-800 text-nova-500 focus:ring-nova-500 focus:ring-offset-0 align-middle"
        {...rest}
      />
    );
  },
};

function MarkdownRendererInner({ content, className }: MarkdownRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const MarkdownRenderer = memo(MarkdownRendererInner);
