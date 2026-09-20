import React from "react";
import ReactMarkdown from "react-markdown";
import { unescapeLiteralNewlines } from "../lib/markdownText";

// Styled renderer for AI report markdown.
//
// The report used to be passed to a bare <ReactMarkdown> inside a wrapper using
// `prose prose-headings:... ` classes — but @tailwindcss/typography is not a
// dependency of this project, so every one of those classes was a no-op. With
// Tailwind's preflight resetting h1-h6 to inherit and stripping list markers,
// headings and bullets rendered as flat body text. These explicit component
// styles don't depend on the plugin.
const components = {
    h1: ({ ...p }) => <h1 className="mt-6 mb-2 text-xl font-bold tracking-tight text-slate-900 first:mt-0" {...p} />,
    h2: ({ ...p }) => <h2 className="mt-6 mb-2 text-lg font-bold tracking-tight text-teal-800 first:mt-0" {...p} />,
    h3: ({ ...p }) => <h3 className="mt-5 mb-1.5 text-base font-bold tracking-tight text-slate-800 first:mt-0" {...p} />,
    h4: ({ ...p }) => <h4 className="mt-4 mb-1 text-sm font-bold uppercase tracking-wide text-slate-600 first:mt-0" {...p} />,
    p: ({ ...p }) => <p className="my-2 leading-relaxed text-slate-700" {...p} />,
    ul: ({ ...p }) => <ul className="my-2 list-disc space-y-1 pl-5 marker:text-teal-600" {...p} />,
    ol: ({ ...p }) => <ol className="my-2 list-decimal space-y-1 pl-5 marker:font-semibold marker:text-slate-500" {...p} />,
    li: ({ ...p }) => <li className="leading-relaxed text-slate-700" {...p} />,
    strong: ({ ...p }) => <strong className="font-semibold text-slate-900" {...p} />,
    em: ({ ...p }) => <em className="italic text-slate-600" {...p} />,
    a: ({ ...p }) => <a className="font-medium text-teal-700 underline underline-offset-2" target="_blank" rel="noreferrer" {...p} />,
    hr: ({ ...p }) => <hr className="my-5 border-slate-200" {...p} />,
    blockquote: ({ ...p }) => <blockquote className="my-3 border-l-4 border-teal-200 bg-teal-50/50 py-1 pl-4 text-slate-600 italic" {...p} />,
    code: ({ ...p }) => <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-800" {...p} />,
    table: ({ ...p }) => (
        <div className="my-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm" {...p} />
        </div>
    ),
    th: ({ ...p }) => <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700" {...p} />,
    td: ({ ...p }) => <td className="border border-slate-200 px-3 py-2 text-slate-700" {...p} />,
};

export default function ReportMarkdown({ children, className = "" }) {
    return (
        <div className={className}>
            <ReactMarkdown components={components}>
                {unescapeLiteralNewlines(children)}
            </ReactMarkdown>
        </div>
    );
}
