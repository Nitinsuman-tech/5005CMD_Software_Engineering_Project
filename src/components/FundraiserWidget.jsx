import { useEffect, useRef } from "react";

export default function FundraiserWidget() {
  const containerRef = useRef(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://www.gofundme.com/static/js/embed.js";
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full py-8">
      <a
        href="https://www.gofundme.com/f/help-us-build-a-better-website-and-reach-larger-audiences"
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "block", width: "100%", maxWidth: "672px", textDecoration: "none", cursor: "pointer" }}
        title="Donate on GoFundMe"
      >
        <div
          ref={containerRef}
          className="gfm-embed w-full max-w-2xl"
          data-url="https://www.gofundme.com/f/help-us-build-a-better-website-and-reach-larger-audiences/widget/medium?sharesheet=undefined&attribution_id=sl:9958843c-39f1-4739-9411-a9afed0a8886"
          style={{ pointerEvents: "none" }}
        />
      </a>
    </div>
  );
}
