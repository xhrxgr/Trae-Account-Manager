import { useState } from "react";

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: {
    id: string;
    name: string;
    email: string;
    avatar_url: string;
    plan_type: string;
    cookies?: string;
    jwt_token?: string | null;
  } | null;
}

export function DetailModal({ isOpen, onClose, account }: DetailModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen || !account) return null;

  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("复制失败:", err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-fixed">
          <h2>账号详情</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body-scrollable">
          <div className="detail-section">
            <h3>基本信息</h3>
            <div className="detail-row">
              <span className="detail-label">用户名</span>
              <span className="detail-value">{account.name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">邮箱</span>
              <span className="detail-value">{account.email || "-"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">套餐类型</span>
              <span className="detail-value">{account.plan_type || "Free"}</span>
            </div>
          </div>

          {/* Token 信息 */}
          {account.jwt_token && (
            <div className="detail-section">
              <h3>Token</h3>
              <div className="detail-row-copy-inline">
                <code className="detail-code-inline">{account.jwt_token}</code>
                <button
                  className="copy-btn-icon"
                  onClick={() => handleCopy(account.jwt_token!, "token")}
                  title="复制 Token"
                >
                  {copiedField === "token" ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Cookies 信息 */}
          {account.cookies && (
            <div className="detail-section">
              <h3>Cookies</h3>
              <div className="detail-row-copy-inline">
                <code className="detail-code-inline">{account.cookies}</code>
                <button
                  className="copy-btn-icon"
                  onClick={() => handleCopy(account.cookies!, "cookies")}
                  title="复制 Cookies"
                >
                  {copiedField === "cookies" ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions-fixed">
          <button onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}
