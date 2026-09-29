import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { http } from "../../lib/http.js";
import { Markdown } from "../../components/ui/Markdown.js";

type TreeItem = { path: string; name?: string; type: "blob" | "tree"; sha?: string; size?: number };
type FileResponse = {
  type: "file" | "dir";
  name?: string;
  path: string;
  sha?: string;
  size?: number;
  content?: string;
  encoding?: string;
  entries?: TreeItem[];
};

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
    queryFn: () => http.get<FileResponse>(`/repos/${fullName}/file?path=${encodeURIComponent(filePath ?? "")}`),
    enabled: !!filePath,
  });

  const pathParts = filePath ? filePath.split("/").filter(Boolean) : [];
  const parentPath = pathParts.length > 1 ? pathParts.slice(0, -1).join("/") : "";
  const parentLink = parentPath ? `/repos/${fullName}/files/${parentPath}` : `/repos/${fullName}/files`;

  const renderBreadcrumbs = () => (
    <div style={{ marginBottom: 16, fontSize: 14, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <Link to={`/repos/${fullName}`} style={{ color: "#0969da", textDecoration: "none", fontWeight: 600 }}>{fullName}</Link>
      <span>/</span>
      <Link to={`/repos/${fullName}/files`} style={{ color: "#0969da", textDecoration: "none" }}>files</Link>
      {pathParts.map((part, idx) => {
        const subPath = pathParts.slice(0, idx + 1).join("/");
        const isLast = idx === pathParts.length - 1;
        return (
          <span key={subPath} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span>/</span>
            {isLast ? (
              <span style={{ fontWeight: 600 }}>{part}</span>
            ) : (
              <Link to={`/repos/${fullName}/files/${subPath}`} style={{ color: "#0969da", textDecoration: "none" }}>{part}</Link>
            )}
          </span>
        );
      })}
    </div>
  );

  if (filePath) {
    if (fileLoading) return <div style={{ padding: 24 }}>Loading...</div>;
    if (!file) return <div style={{ padding: 24 }}>Path not found.</div>;

    if (file.type === "dir" || file.entries) {
      const entries = file.entries ?? [];
      return (
        <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
          {renderBreadcrumbs()}
          <div style={{ marginBottom: 16 }}>
            <Link to={parentLink} style={{ color: "#0969da", textDecoration: "none", fontSize: 13 }}>
              📁 .. (Up to {parentPath ? pathParts[pathParts.length - 2] : "root"})
            </Link>
          </div>
          <ul style={{ listStyle: "none", padding: 0, fontFamily: "monospace", border: "1px solid #d0d7de", borderRadius: 6 }}>
            {entries.map((item, idx) => (
              <li
                key={item.path || item.name}
                style={{
                  padding: "8px 12px",
                  borderBottom: idx === entries.length - 1 ? "none" : "1px solid #e1e4e8",
                  background: idx % 2 === 0 ? "#ffffff" : "#f6f8fa",
                }}
              >
                <Link to={`/repos/${fullName}/files/${item.path}`} style={{ textDecoration: "none", color: "#0969da" }}>
                  {item.type === "tree" ? "📁 " : "📄 "}{item.name ?? item.path}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    let decoded = "";
    try {
      decoded = file.encoding === "base64" ? atob((file.content ?? "").replace(/\s/g, "")) : (file.content ?? "");
    } catch {
      decoded = file.content ?? "";
    }
    const isMarkdown = filePath.endsWith(".md");

    return (
      <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
        {renderBreadcrumbs()}
        <div style={{ marginBottom: 16 }}>
          <Link to={parentLink} style={{ color: "#0969da", textDecoration: "none", fontSize: 13 }}>← Back</Link>
        </div>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>{filePath}</h2>
        {isMarkdown ? (
          <div style={{ border: "1px solid #d0d7de", borderRadius: 6, padding: 20 }}>
            <Markdown content={decoded} />
          </div>
        ) : (
          <pre style={{ background: "#f6f8fa", border: "1px solid #d0d7de", padding: 16, borderRadius: 6, overflow: "auto", fontSize: 13, lineHeight: 1.45 }}>
            {decoded}
          </pre>
        )}
      </div>
    );
  }

  if (treeLoading) return <div style={{ padding: 24 }}>Loading files...</div>;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      {renderBreadcrumbs()}
      <h2>Files — {fullName}</h2>
      <ul style={{ listStyle: "none", padding: 0, fontFamily: "monospace", border: "1px solid #d0d7de", borderRadius: 6 }}>
        {tree?.map((item, idx) => (
          <li
            key={item.path}
            style={{
              padding: "8px 12px",
              borderBottom: idx === (tree.length - 1) ? "none" : "1px solid #e1e4e8",
              background: idx % 2 === 0 ? "#ffffff" : "#f6f8fa",
            }}
          >
            <Link to={`/repos/${fullName}/files/${item.path}`} style={{ textDecoration: "none", color: "#0969da" }}>
              {item.type === "tree" ? "📁 " : "📄 "}{item.path}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
