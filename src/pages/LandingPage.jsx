import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SPECIES_DATA } from "../data/speciesData";
import FundraiserWidget from "../components/FundraiserWidget";
import "./LandingPage.css";

const iucnColors = {
  CR: { bg: "#d32f2f", label: "Critically Endangered" },
  EN: { bg: "#e65100", label: "Endangered" },
  VU: { bg: "#f9a825", label: "Vulnerable" },
  NT: { bg: "#66bb6a", label: "Near Threatened" },
  LC: { bg: "#2e7d32", label: "Least Concern" },
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.title = "Komodo Hub — Protecting Indonesia's Endangered Species";
  }, []);

  const scrollTo = (id) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="landing-page">
      
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-nav-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="landing-nav-logo">K</div>
            <span className="landing-nav-wordmark">Komodo Hub</span>
          </div>

          <div className="landing-nav-links">
            <button className="landing-nav-link" onClick={() => scrollTo("home")}>Home</button>
            <button className="landing-nav-link" onClick={() => scrollTo("species")}>Species</button>
            <button className="landing-nav-link" onClick={() => scrollTo("about")}>About</button>
            <button className="landing-nav-link" onClick={() => scrollTo("support")}>Support</button>
          </div>

          <button className="landing-nav-cta" onClick={() => navigate("/auth")}>
            Login / Sign Up
          </button>

          <button
            className="landing-nav-hamburger"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? "\u2715" : "\u2630"}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="landing-nav-mobile">
            <button className="landing-nav-mobile-link" onClick={() => scrollTo("home")}>Home</button>
            <button className="landing-nav-mobile-link" onClick={() => scrollTo("species")}>Species</button>
            <button className="landing-nav-mobile-link" onClick={() => scrollTo("about")}>About</button>
            <button className="landing-nav-mobile-link" onClick={() => scrollTo("support")}>Support</button>
            <button className="landing-nav-mobile-cta" onClick={() => { setMobileMenuOpen(false); navigate("/auth"); }}>
              Login / Sign Up
            </button>
          </div>
        )}
      </nav>

      
      <section id="home" className="landing-hero">
        <div className="landing-hero-inner">
          <h1 className="landing-hero-headline">
            Protecting Indonesia's Most Endangered Species
          </h1>
          <p className="landing-hero-subtext">
            A secure, school-and-community platform where students, teachers,
            and conservation groups learn, collaborate, and contribute to
            wildlife preservation — together.
          </p>
          <div className="landing-hero-actions">
            <button
              className="landing-hero-cta-primary"
              onClick={() => navigate("/auth")}
            >
              Get Started
            </button>
            <button
              className="landing-hero-cta-secondary"
              onClick={() => scrollTo("species")}
            >
              Explore Species
            </button>
          </div>
        </div>
      </section>

      
      <section id="about" className="landing-features">
        <div className="landing-features-inner">
          <div className="landing-features-header">
            <h2>A Walled Garden for Conservation Education</h2>
            <p>
              Every school and community operates in its own private, secure space.
              Data stays isolated. Students stay protected.
            </p>
          </div>

          
          <div className="landing-feature-row landing-feature-row-left">
            <div className="landing-feature-icon-col">
              <div className="landing-feature-icon">&#x1F3EB;</div>
            </div>
            <div className="landing-feature-text-col">
              <h3>School Privacy</h3>
              <p>
                Each school is a fully isolated environment. Student work,
                sighting reports, and classroom data are visible only to
                that school's teachers and principal. No cross-school
                data leaks, ever.
              </p>
            </div>
          </div>

          
          <div className="landing-feature-row landing-feature-row-right">
            <div className="landing-feature-text-col">
              <h3>Community Isolation</h3>
              <p>
                Conservation communities operate independently with their own
                members, contributions, and leadership — never mixing data
                across organizations. Each community is its own ecosystem.
              </p>
            </div>
            <div className="landing-feature-icon-col">
              <div className="landing-feature-icon">&#x1F30D;</div>
            </div>
          </div>

          
          <div className="landing-feature-row landing-feature-row-left">
            <div className="landing-feature-icon-col">
              <div className="landing-feature-icon">&#x1F6E1;&#xFE0F;</div>
            </div>
            <div className="landing-feature-text-col">
              <h3>Student Protection</h3>
              <p>
                Access codes ensure only authorized students and teachers
                can enter their school. No public profile exposure for minors.
                Teacher-gated publishing protects every contribution.
              </p>
            </div>
          </div>
        </div>
      </section>

      
      <section id="species" className="landing-species">
        <div className="landing-species-inner">
          <div className="landing-species-header">
            <h2>Indonesia's Endemic Wildlife</h2>
            <p>15 species. Each one irreplaceable.</p>
          </div>

          <div className="landing-species-grid">
            {SPECIES_DATA.map((sp) => (
              <div key={sp.commonName} className="landing-species-card">
                <div className="landing-species-card-emoji">{sp.emoji}</div>
                <div className="landing-species-card-body">
                  <h3 className="landing-species-card-name">{sp.commonName}</h3>
                  <p className="landing-species-card-sci">{sp.scientificName}</p>
                  <div className="landing-species-card-meta">
                    <span
                      className="landing-iucn-badge"
                      style={{ background: iucnColors[sp.iucnCode]?.bg || "#888" }}
                      title={iucnColors[sp.iucnCode]?.label}
                    >
                      {sp.iucnCode}
                    </span>
                    <span className="landing-species-card-pop">
                      Pop: {sp.population}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="landing-species-cta-wrap">
            <button
              className="landing-species-cta"
              onClick={() => navigate("/public-library")}
            >
              View Full Encyclopedia
            </button>
          </div>
        </div>
      </section>

      
      <section id="support" className="landing-fundraiser">
        <div className="landing-fundraiser-inner">
          <div className="landing-fundraiser-header">
            <h2>Support Our Mission</h2>
            <p>
              Your contribution directly funds conservation education
              and platform development across the Indonesian archipelago.
            </p>
          </div>

          <div className="landing-impact-cards">
            <a
              href="https://www.gofundme.com/f/help-us-build-a-better-website-and-reach-larger-audiences"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-impact-card"
              style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
            >
              <div className="landing-impact-icon">&#x1F331;</div>
              <h3>Platform Growth</h3>
              <p>
                Fund development of new features, quizzes, and educational
                content for Indonesian schools.
              </p>
            </a>
            <a
              href="https://www.gofundme.com/f/help-us-build-a-better-website-and-reach-larger-audiences"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-impact-card"
              style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
            >
              <div className="landing-impact-icon">&#x1F98E;</div>
              <h3>Species Coverage</h3>
              <p>
                Expand our encyclopedia to cover 50+ species with detailed
                conservation data and tracking.
              </p>
            </a>
            <a
              href="https://www.gofundme.com/f/help-us-build-a-better-website-and-reach-larger-audiences"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-impact-card"
              style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
            >
              <div className="landing-impact-icon">&#x1F3EB;</div>
              <h3>School Outreach</h3>
              <p>
                Bring Komodo Hub to more schools across the Indonesian
                archipelago, free of charge.
              </p>
            </a>
          </div>

          <div className="landing-fundraiser-widget">
            <FundraiserWidget />
          </div>
        </div>
      </section>

      
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-links">
            <button className="landing-footer-link" onClick={() => navigate("/public-library")}>
              Public Library
            </button>
            <button className="landing-footer-link" onClick={() => navigate("/auth")}>
              Login
            </button>
          </div>
          <p className="landing-footer-copy">
            &copy; {new Date().getFullYear()} Komodo Hub. All rights reserved.
          </p>
          <p className="landing-footer-attr">
            Species data sourced from IUCN Red List and Indonesian Ministry of Environment and Forestry.
          </p>
        </div>
      </footer>
    </div>
  );
}
