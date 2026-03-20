import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNavConfig } from "../hooks/useNavConfig";
import "./NavSidebar.css";

export default function NavSidebar() {
  const config = useNavConfig();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [hrExpanded, setHrExpanded] = useState(false);
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [tooltip, setTooltip] = useState({ visible: false, text: "", y: 0 });
  const [bubbleRect, setBubbleRect] = useState(null);

  const acctRef = useRef(null);
  const navBodyRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (acctRef.current && !acctRef.current.contains(e.target)) {
        const bubble = document.getElementById("nav-acct-bubble-fixed");
        if (bubble && bubble.contains(e.target)) return;
        setBubbleOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!location.pathname.startsWith("/hr")) setHrExpanded(false);
  }, [location.pathname]);

  const togglePanel = useCallback(() => {
    setIsOpen((v) => !v);
    setBubbleOpen(false);
  }, []);

  const toggleBubble = useCallback(() => {
    if (!bubbleOpen && acctRef.current) {
      setBubbleRect(acctRef.current.getBoundingClientRect());
    }
    setBubbleOpen((v) => !v);
  }, [bubbleOpen]);

  const showTip = useCallback(
    (e, text) => {
      if (isOpen || isMobile) return;
      const r = e.currentTarget.getBoundingClientRect();
      setTooltip({ visible: true, text, y: r.top + r.height / 2 });
    },
    [isOpen, isMobile],
  );

  const hideTip = useCallback(
    () => setTooltip((t) => ({ ...t, visible: false })),
    [],
  );

  const handleNav = useCallback(
    (path) => {
      navigate(path);
      if (isMobile) setIsOpen(false);
      setTooltip((t) => ({ ...t, visible: false }));
    },
    [navigate, isMobile],
  );

  const handleIconClick = useCallback(
    (path, hasSub, onOpen) => {
      if (!isOpen) setIsOpen(true);
      hideTip();
      if (hasSub) {
        onOpen && onOpen();
      } else {
        handleNav(path);
      }
    },
    [isOpen, hideTip, handleNav],
  );

  const isActive = useCallback(
    (page) => {
      const [pp, pq] = page.path.split("?");
      if (page.sub) {
        return page.sub.some((s) => {
          const [sp, sq] = s.path.split("?");
          if (sq)
            return location.pathname === sp && location.search === "?" + sq;
          return location.pathname === sp && !location.search;
        });
      }
      if (pq) return location.pathname === pp && location.search === "?" + pq;
      return (
        location.pathname === pp &&
        (!location.search || location.pathname !== pp)
      );
    },
    [location],
  );

  const isSubActive = useCallback(
    (sub) => {
      const [sp, sq] = sub.path.split("?");
      if (sq) return location.pathname === sp && location.search === "?" + sq;
      return location.pathname === sp && !location.search;
    },
    [location],
  );

  if (!config) return null;
  if (isMobile)
    return <MobileBar config={config} onNav={handleNav} location={location} />;

  const { pages, title, subtitle, initials, bubbleName, bubbleRole } = config;

  const groupLabel = (page, i) =>
    page.group && page.group !== pages[i - 1]?.group && isOpen ? (
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color: "#BBBBBB",
          padding: "10px 14px 3px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          userSelect: "none",
        }}
      >
        {page.group}
      </div>
    ) : null;

  return (
    <nav
      className={`nav-panel${isOpen ? " open" : ""}`}
      aria-label="Main navigation"
      style={{ position: "relative" }}
    >
      {/* Header */}
      <div className="nav-header">
        <button
          className="nav-burger"
          onClick={togglePanel}
          style={{
            opacity: isOpen ? 0 : 1,
            pointerEvents: isOpen ? "none" : "auto",
          }}
          onMouseEnter={(e) => showTip(e, "Open navigation")}
          onMouseLeave={hideTip}
          aria-label="Open navigation"
          tabIndex={isOpen ? -1 : 0}
        >
          <span className="nav-burger-icon">☰</span>
        </button>
        <div className="nav-title-wrap">
          <div className="nav-title">{title}</div>
          <div className="nav-subtitle">{subtitle}</div>
        </div>
        <button
          className="nav-close-btn"
          onClick={togglePanel}
          aria-label="Close navigation"
        >
          ✕
        </button>
      </div>

      {/* Nav rows */}
      <div className="nav-body" id="nav" ref={navBodyRef}>
        {pages.map((page, i) => {
          const active = isActive(page);

          if (page.sub) {
            return (
              <React.Fragment key={i}>
                {groupLabel(page, i)}
                <div
                  className={`nav-row${active ? " active" : ""}`}
                  onClick={() =>
                    handleIconClick(page.path, true, () => {
                      setHrExpanded((v) => {
                        const next = !v;
                        if (next)
                          setTimeout(() => {
                            if (navBodyRef.current)
                              navBodyRef.current.scrollTop =
                                navBodyRef.current.scrollHeight;
                          }, 220);
                        return next;
                      });
                    })
                  }
                  onMouseEnter={(e) => showTip(e, page.label)}
                  onMouseLeave={hideTip}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === "Enter" && setHrExpanded((v) => !v)
                  }
                  aria-expanded={hrExpanded}
                >
                  <div className="nav-icon-zone">
                    <div className="nav-pill">
                      <span className="nav-icon">{page.icon}</span>
                    </div>
                  </div>
                  <span className="nav-label">{page.label}</span>
                  <span className={`nav-chev${hrExpanded ? " open" : ""}`}>
                    ›
                  </span>
                </div>
                <div
                  className="nav-subs"
                  style={{
                    height: hrExpanded ? page.sub.length * 30 + "px" : "0px",
                  }}
                  aria-hidden={!hrExpanded}
                >
                  {page.sub.map((sub, si) => (
                    <div
                      key={si}
                      className={`nav-sub-item${isSubActive(sub) ? " active" : ""}`}
                      onClick={() => handleNav(sub.path)}
                      role="button"
                      tabIndex={hrExpanded ? 0 : -1}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleNav(sub.path)
                      }
                    >
                      {sub.label}
                    </div>
                  ))}
                </div>
              </React.Fragment>
            );
          }

          return (
            <React.Fragment key={i}>
              {groupLabel(page, i)}
              <div
                className={`nav-row${active ? " active" : ""}`}
                onClick={() => handleIconClick(page.path, false)}
                onMouseEnter={(e) => showTip(e, page.label)}
                onMouseLeave={hideTip}
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  e.key === "Enter" && handleIconClick(page.path, false)
                }
              >
                <div className="nav-icon-zone">
                  <div className="nav-pill">
                    <span className="nav-icon">{page.icon}</span>
                  </div>
                </div>
                <span className="nav-label">{page.label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Account circle */}
      <div className="nav-bottom">
        <div className="nav-acct-wrap">
          <button
            ref={acctRef}
            className={`nav-acct-circle${bubbleOpen ? " active" : ""}`}
            onClick={toggleBubble}
            onMouseEnter={(e) => showTip(e, bubbleName)}
            onMouseLeave={hideTip}
            aria-label="Account menu"
            aria-haspopup="true"
            aria-expanded={bubbleOpen}
          >
            {initials}
          </button>
        </div>
      </div>

      {/* Fixed tooltip */}
      {tooltip.visible && !isOpen && (
        <div
          style={{
            position: "fixed",
            left: 60,
            top: tooltip.y,
            transform: "translateY(-50%)",
            background: "#ffffff",
            border: "0.5px solid rgba(0,0,0,0.15)",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 12,
            color: "#111",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 9999,
            boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
          }}
          aria-hidden="true"
        >
          {tooltip.text}
        </div>
      )}

      {/* Account bubble */}
      {bubbleOpen &&
        (isOpen ? (
          <div
            id="nav-acct-bubble-fixed"
            role="menu"
            style={{
              position: "absolute",
              bottom: 70,
              left: 8,
              right: 8,
              background: "#fff",
              border: "0.5px solid rgba(0,0,0,0.15)",
              borderRadius: 10,
              padding: 12,
              zIndex: 200,
              boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#111",
                marginBottom: 1,
              }}
            >
              {bubbleName}
            </div>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>
              {bubbleRole}
            </div>
            <div
              style={{
                height: "0.5px",
                background: "rgba(0,0,0,0.08)",
                margin: "4px 0",
              }}
            />
            <button
              className="nav-bubble-row"
              role="menuitem"
              onClick={() => {
                setBubbleOpen(false);
                handleNav("/account");
              }}
            >
              ⚙ Settings
            </button>
            <button
              className="nav-bubble-row"
              role="menuitem"
              onClick={() => {
                setBubbleOpen(false);
                handleNav("/account");
              }}
            >
              ◎ My profile
            </button>
            <div
              style={{
                height: "0.5px",
                background: "rgba(0,0,0,0.08)",
                margin: "4px 0",
              }}
            />
            <button
              className="nav-bubble-row danger"
              role="menuitem"
              onClick={() => {
                setBubbleOpen(false);
                handleNav("/account?action=logout");
              }}
            >
              ↩ Log out
            </button>
          </div>
        ) : (
          bubbleRect && (
            <div
              id="nav-acct-bubble-fixed"
              role="menu"
              style={{
                position: "fixed",
                bottom: window.innerHeight - bubbleRect.top + 8,
                left: bubbleRect.right + 8,
                background: "#fff",
                border: "0.5px solid rgba(0,0,0,0.15)",
                borderRadius: 10,
                padding: 12,
                width: 200,
                zIndex: 10000,
                boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: -5,
                  top: "50%",
                  transform: "translateY(-50%) rotate(45deg)",
                  width: 8,
                  height: 8,
                  background: "#fff",
                  borderLeft: "0.5px solid rgba(0,0,0,0.12)",
                  borderBottom: "0.5px solid rgba(0,0,0,0.12)",
                }}
              />
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#111",
                  marginBottom: 1,
                }}
              >
                {bubbleName}
              </div>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>
                {bubbleRole}
              </div>
              <div
                style={{
                  height: "0.5px",
                  background: "rgba(0,0,0,0.08)",
                  margin: "4px 0",
                }}
              />
              <button
                className="nav-bubble-row"
                role="menuitem"
                onClick={() => {
                  setBubbleOpen(false);
                  handleNav("/account");
                }}
              >
                ⚙ Settings
              </button>
              <button
                className="nav-bubble-row"
                role="menuitem"
                onClick={() => {
                  setBubbleOpen(false);
                  handleNav("/account");
                }}
              >
                ◎ My profile
              </button>
              <div
                style={{
                  height: "0.5px",
                  background: "rgba(0,0,0,0.08)",
                  margin: "4px 0",
                }}
              />
              <button
                className="nav-bubble-row danger"
                role="menuitem"
                onClick={() => {
                  setBubbleOpen(false);
                  handleNav("/account?action=logout");
                }}
              >
                ↩ Log out
              </button>
            </div>
          )
        ))}
    </nav>
  );
}

/* Mobile bottom tab bar */
function MobileBar({ config, onNav, location }) {
  if (!config) return null;
  const primary = config.pages.slice(0, 4);
  return (
    <nav className="nav-mobile-bar" aria-label="Mobile navigation">
      {primary.map((page, i) => {
        const [pp] = page.path.split("?");
        const active =
          location.pathname === pp || location.pathname.startsWith(pp + "/");
        return (
          <button
            key={i}
            className={`nav-mobile-tab${active ? " active" : ""}`}
            onClick={() => onNav(page.path)}
            aria-label={page.label}
          >
            <span className="nav-mobile-icon">{page.icon}</span>
            <span className="nav-mobile-label">{page.label}</span>
          </button>
        );
      })}
      <button className="nav-mobile-tab" aria-label="More">
        <span className="nav-mobile-icon">⊕</span>
        <span className="nav-mobile-label">More</span>
      </button>
    </nav>
  );
}
