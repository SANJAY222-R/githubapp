import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { http } from "../../lib/http.js";
import { Markdown } from "../../components/ui/Markdown.js";

type TreeItem = { path: string; type: "blob" | "tree"; sha: string; size?: number };
type FileContent = { path: string; content: string; sha: string; encoding: string };

export function FileBrowserPage() {
  const { owner, repo, "*": filePath } = useParams<{ owner: string; repo: string; "*": string }>();
  const fullName = `${owner}/${repo}`;

  const { data: tree, isLoading: treeLoading } = useQuery({
    queryKey: ["tree", fullName],
    queryFn: () => http.get<TreeItem[]>(`/repos/${fullName}/tree`),
    enabled: !filePath,
  });

  const { data: file, isLoading: fileLoading } = useQuery({
    queryKey: ["file", fullName, filePath],
    queryFn: () => http.get<FileContent>(`/repos/${fullName}/file?path=${encodeURIComponent(filePath ?? "")}`),
    enabled: !!filePath,
  });

  if (filePath) {
    if (fileLoading) return <div style={{ padding: 24 }}>Loading file...</div>;
    if (!file) return <div style={{ padding: 24 }}>File not found.</div>;
    const decoded = file.encoding === "base64" ? atob(file.content) : file.content;
    const isMarkdown = filePath.endsWith(".md");
    return (
      <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <Link to={`/repos/${fullName}/files`} style={{ color: "#0969da", textDecoration: "none" }}>← Back to root</Link>
        </div>
        <h2>{filePath}</h2>
        {isMarkdown ? <Markdown content={decoded} /> : <pre style={{ background: "#f6f8fa", padding: 16, borderRadius: 6, overflow: "auto" }}>{decoded}</pre>}
      </div>
    );
  }

  if (treeLoading) return <div style={{ padding: 24 }}>Loading files...</div>;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <h2>Files — {fullName}</h2>
      <ul style={{ listStyle: "none", padding: 0, fontFamily: "monospace" }}>
        {tree?.map((item) => (
          <li key={item.path} style={{ padding: "6px 0", borderBottom: "1px solid #e1e4e8" }}>
            <Link to={`/repos/${fullName}/files/${item.path}`} style={{ textDecoration: "none", color: "#0969da" }}>
              {item.type === "tree" ? "📁 " : "📄 "}{item.path}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
