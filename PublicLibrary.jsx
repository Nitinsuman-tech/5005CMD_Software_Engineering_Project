import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { SPECIES_DATA, BOOKSHELF_RESOURCES } from "../data/speciesData";
import FundraiserWidget from "../components/FundraiserWidget";
import "./PublicLibrary.css";

const seedArticles = [
  {
    title: "Introduction to Animal Conservation",
    category: "Basics",
    summary: "Learn what conservation means and why protecting wildlife is essential for our planet's future.",
    body: "Animal conservation is the practice of protecting wild animal species and their habitats to prevent them from becoming extinct. It involves a wide range of activities including habitat preservation, anti-poaching enforcement, breeding programs, and community education.\n\nConservation is important because every species plays a role in its ecosystem. When one species disappears, it can cause a chain reaction that affects many other organisms. For example, predators like tigers help control herbivore populations, which in turn prevents overgrazing and habitat destruction.\n\nCommunities play a vital role in conservation. Local people often have the best knowledge of their environment and can serve as the first line of defense against threats like illegal hunting and deforestation. Programs that involve local communities in monitoring and protecting wildlife have shown the greatest long-term success.",
    author: "Komodo Hub Team",
  },
  {
    title: "Komodo Dragon: Indonesia's Living Dinosaur",
    category: "Species",
    summary: "Discover the world's largest lizard, found only on a handful of Indonesian islands.",
    body: "The Komodo dragon (Varanus komodoensis) is the largest living species of lizard, growing up to 3 meters in length and weighing over 70 kilograms. These remarkable reptiles are found only in the Indonesian islands of Komodo, Rinca, Flores, and Gili Motang.\n\nKomodo dragons are apex predators that use sharp claws, powerful tails, and venom glands to hunt prey including deer, pigs, and water buffalo. They have an excellent sense of smell and can detect carrion from up to 9 kilometers away.\n\nThe species is currently listed as Endangered on the IUCN Red List. Major threats include habitat loss, reduced prey availability, and climate change. Komodo National Park was established in 1980 to protect these animals.",
    author: "Komodo Hub Team",
  },
  {
    title: "How to Report Wildlife Sightings Safely",
    category: "Guide",
    summary: "A practical guide for students on documenting and reporting wildlife observations responsibly.",
    body: "Reporting wildlife sightings is one of the most valuable contributions anyone can make to conservation science. Accurate sighting data helps researchers track animal populations, understand migration patterns, and identify threats.\n\nWhen you spot wildlife, keep a safe distance and avoid disturbing the animal. Use binoculars or a camera with zoom to observe details. Record the date, time, general location, weather conditions, and a description of the animal's behavior.\n\nNever share exact locations of endangered species on social media or public platforms, as this information can be exploited by poachers. Report your sighting through official channels like your school's Komodo Hub platform.",
    author: "Komodo Hub Team",
  },
  {
    title: "Why Community Conservation Matters",
    category: "Education",
    summary: "Explore how local communities are the backbone of successful wildlife conservation efforts.",
    body: "Community-based conservation recognizes local people as essential partners in protecting wildlife and natural resources. Rather than excluding communities from conservation areas, this model involves them as active participants.\n\nIn Indonesia, community conservation programs have achieved remarkable results. In areas around Komodo National Park, local fishing communities now serve as marine patrol volunteers. In Sumatra, former poachers have been retrained as forest rangers.\n\nThe success of community conservation depends on ensuring that local people benefit economically from protecting wildlife through ecotourism revenue, sustainable resource harvesting, and employment in conservation programs.",
    author: "Komodo Hub Team",
  },
  {
    title: "Sumatran Tiger: Ghost of the Forest",
    category: "Species",
    summary: "The Sumatran tiger is critically endangered with fewer than 400 individuals remaining in the wild.",
    body: "The Sumatran tiger (Panthera tigris sumatrae) is the smallest surviving tiger subspecies and is found exclusively on the Indonesian island of Sumatra. With fewer than 400 individuals estimated to remain in the wild, it is classified as Critically Endangered.\n\nSumatran tigers are distinguished by their dark orange coat with thick black stripes. They are solitary hunters that prey on wild boar, deer, and occasionally livestock.\n\nThe primary threats to Sumatran tigers are deforestation for palm oil plantations and paper pulp production, which has destroyed over half of their habitat in the past 25 years.",
    author: "Komodo Hub Team",
  },
  {
    title: "Javan Rhino: The Rarest Large Mammal",
    category: "Species",
    summary: "With only around 76 individuals left, the Javan rhinoceros is one of Earth's most endangered species.",
    body: "The Javan rhinoceros is one of the rarest large mammals on Earth, with only approximately 76 individuals surviving in Ujung Kulon National Park on the western tip of Java.\n\nJavan rhinos are solitary animals that inhabit dense lowland tropical rainforest. They feed on over 300 plant species and play an important ecological role by creating clearings in the forest.\n\nConservation efforts focus on protecting and expanding their habitat, monitoring through camera traps and DNA analysis, and removing the invasive Arenga palm that competes with the rhinos' food plants.",
    author: "Komodo Hub Team",
  },
];

async function seedLibraryIfEmpty() {
  try {
    const snapshot = await getDocs(collection(db, "library"));
    if (snapshot.size > 0) return;
    for (const article of seedArticles) {
      await addDoc(collection(db, "library"), { ...article, publishedAt: serverTimestamp() });
    }
  } catch (err) {
    console.error("Error seeding library:", err);
  }
}

async function seedSpeciesIfEmpty() {
  try {
    const snapshot = await getDocs(collection(db, "species_data"));
    if (snapshot.size > 0) return;
    for (const sp of SPECIES_DATA) {
      await addDoc(collection(db, "species_data"), { ...sp, createdAt: serverTimestamp() });
    }
  } catch (err) {
    console.error("Error seeding species_data:", err);
  }
}

async function seedResourcesIfEmpty() {
  try {
    const snapshot = await getDocs(collection(db, "resources"));
    if (snapshot.size > 0) return;
    for (const res of BOOKSHELF_RESOURCES) {
      await addDoc(collection(db, "resources"), { ...res, createdAt: serverTimestamp() });
    }
  } catch (err) {
    console.error("Error seeding resources:", err);
  }
}

const iucnColors = {
  CR: { bg: "#d32f2f", label: "Critically Endangered" },
  EN: { bg: "#e65100", label: "Endangered" },
  VU: { bg: "#f9a825", label: "Vulnerable" },
  NT: { bg: "#66bb6a", label: "Near Threatened" },
  LC: { bg: "#2e7d32", label: "Least Concern" },
};

const TAB_KEYS = ["species", "showcase", "bookshelf", "articles"];

export default function PublicLibrary() {
  const navigate = useNavigate();

  
  let authCtx = { user: null, role: null, schoolId: null, orgId: null, loading: false };
  try { authCtx = useAuth() || authCtx; } catch {  }
  const { user, role, schoolId: userSchoolId, orgId: userOrgId, loading } = authCtx;

  const isStudent = role === "student";
  const isLoggedIn = !!user;

  if (loading) {
    return (
      <div className="pl-page" style={{ justifyContent: "center", alignItems: "center", display: "flex", minHeight: "100vh" }}>
        <div style={{
          width: 48,
          height: 48,
          border: "5px solid #c8e6c9",
          borderTopColor: "#2E7D32",
          borderRadius: "50%",
          animation: "plSpinner 0.9s linear infinite",
        }}></div>
        <style>{`@keyframes plSpinner { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

    const [activeTab, setActiveTab] = useState("species");

    const [speciesList, setSpeciesList] = useState([]);
  const [loadingSpecies, setLoadingSpecies] = useState(true);
  const [speciesSearch, setSpeciesSearch] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("all"); 
  const [selectedSpecies, setSelectedSpecies] = useState(null);

    const [showcaseItems, setShowcaseItems] = useState([]);
  const [loadingShowcase, setLoadingShowcase] = useState(true);
  const [orgFilter, setOrgFilter] = useState("all"); 

    const [resources, setResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [resourceFilter, setResourceFilter] = useState("all"); 

    const [articles, setArticles] = useState([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [articleCategory, setArticleCategory] = useState("All");
  const [articleSearch, setArticleSearch] = useState("");
  const [activeArticle, setActiveArticle] = useState(null);

  /* ────────────────────────────────────────────────────────────────
     DATA LOADING
     ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    document.title = "Public Library - Komodo Hub";
    loadAllData();
  }, []);

  const loadAllData = async () => {
    await Promise.all([
      loadSpecies(),
      loadShowcase(),
      loadResources(),
      loadArticles(),
    ]);
  };

  const loadSpecies = async () => {
    try {
      await seedSpeciesIfEmpty();
      const snap = await getDocs(collection(db, "species_data"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSpeciesList(data.length > 0 ? data : SPECIES_DATA.map((s, i) => ({ id: `local-${i}`, ...s })));
    } catch (err) {
      console.error("Error loading species:", err);
      setSpeciesList(SPECIES_DATA.map((s, i) => ({ id: `local-${i}`, ...s })));
    } finally {
      setLoadingSpecies(false);
    }
  };

  const loadShowcase = async () => {
    try {
      
      const publicQ = query(
        collection(db, "contributions"),
        where("isVisibleInPublic", "==", true)
      );
      const contribSnap = await getDocs(publicQ);
      const schoolCache = {};
      const orgCache = {};
      const items = [];

      for (const d of contribSnap.docs) {
        const data = d.data();

        
        const orgType = data.organizationType || (data.schoolId ? "school" : data.orgId ? "community" : "school");

        
        let orgName = data.communityName || "Unknown";
        if (data.schoolId && orgType === "school") {
          if (schoolCache[data.schoolId]) {
            orgName = schoolCache[data.schoolId];
          } else {
            try {
              const schoolDoc = await getDoc(doc(db, "schools", data.schoolId));
              if (schoolDoc.exists()) {
                orgName = schoolDoc.data().schoolName || "Unknown School";
                schoolCache[data.schoolId] = orgName;
              }
            } catch {  }
          }
        }

        
        if (data.orgId && orgType === "community") {
          if (orgCache[data.orgId]) {
            orgName = orgCache[data.orgId];
          } else {
            try {
              const orgDoc = await getDoc(doc(db, "organizations", data.orgId));
              if (orgDoc.exists()) {
                orgName = orgDoc.data().orgName || "Unknown Organization";
                orgCache[data.orgId] = orgName;
              }
            } catch {  }
          }
        }

                const isSameSchool = isLoggedIn && userSchoolId && data.schoolId === userSchoolId;

        const item = {
          id: d.id,
          title: data.title || `${data.species || "Unknown"} Sighting`,
          type: data.type || "Sighting Report",
          description: data.description || "",
          date: data.date || "",
          photoURL: data.photoURL || "",
          orgType,
          orgName,
          status: data.status || "approved",
        };

        if (orgType === "community") {
          
          item.contributorName = data.contributorName || data.studentEmail || "Community Member";
          item.contributorProfileLink = data.studentId ? `/member/profile/${data.studentId}` : null;
        } else if (isSameSchool) {
          
          item.contributorName = data.studentEmail || "Student";
        }
        

        items.push(item);
      }

      setShowcaseItems(items);
    } catch (err) {
      console.error("Error loading showcase:", err);
    } finally {
      setLoadingShowcase(false);
    }
  };

  const loadResources = async () => {
    try {
      await seedResourcesIfEmpty();
      const snap = await getDocs(collection(db, "resources"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setResources(data.length > 0 ? data : BOOKSHELF_RESOURCES.map((r, i) => ({ id: `local-${i}`, ...r })));
    } catch (err) {
      console.error("Error loading resources:", err);
      setResources(BOOKSHELF_RESOURCES.map((r, i) => ({ id: `local-${i}`, ...r })));
    } finally {
      setLoadingResources(false);
    }
  };

  const loadArticles = async () => {
    try {
      await seedLibraryIfEmpty();
      const snap = await getDocs(collection(db, "library"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setArticles(data);
      if (data.length > 0) setActiveArticle(data[0]);
    } catch (err) {
      console.error("Error loading articles:", err);
    } finally {
      setLoadingArticles(false);
    }
  };

  
  
  const filteredSpecies = useMemo(() => {
    let result = speciesList;
    if (speciesFilter !== "all") {
      result = result.filter((s) => s.iucnCode === speciesFilter);
    }
    const q = speciesSearch.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (s) =>
          s.commonName?.toLowerCase().includes(q) ||
          s.scientificName?.toLowerCase().includes(q) ||
          s.island?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [speciesList, speciesFilter, speciesSearch]);

  
  const filteredShowcase = useMemo(() => {
    if (orgFilter === "all") return showcaseItems;
    return showcaseItems.filter((i) => i.orgType === orgFilter);
  }, [showcaseItems, orgFilter]);

  
  const filteredResources = useMemo(() => {
    if (resourceFilter === "all") return resources;
    return resources.filter((r) => r.type === resourceFilter);
  }, [resources, resourceFilter]);

  
  const articleCategories = ["All", ...new Set(articles.map((a) => a.category))];
  const filteredArticles = useMemo(() => {
    let result = articles;
    if (articleCategory !== "All") result = result.filter((a) => a.category === articleCategory);
    const q = articleSearch.trim().toLowerCase();
    if (q) result = result.filter((a) => a.title?.toLowerCase().includes(q) || a.summary?.toLowerCase().includes(q));
    return result;
  }, [articles, articleCategory, articleSearch]);

    const getAccessButton = useCallback((resource) => {
    if (resource.access === "global_paid") {
      
      return { label: `Purchase Required (${resource.price})`, className: "access-btn-paid", disabled: true, tooltip: "Advanced research — purchase required for all users" };
    }
    if (resource.access === "student_free" && isStudent) {
      return { label: "Read Now (Free)", className: "access-btn-free", disabled: false, tooltip: "Free access for enrolled students" };
    }
    if (resource.access === "student_free" && !isStudent) {
      return { label: resource.price ? `Purchase (${resource.price})` : "Paid / Purchase Required", className: "access-btn-paid", disabled: true, tooltip: "Free for students — login as a student to access" };
    }
    if (resource.access === "paid") {
      if (isStudent) {
        return { label: "Read Now (Free)", className: "access-btn-free", disabled: false, tooltip: "Free access for enrolled students" };
      }
      return { label: resource.price ? `Purchase (${resource.price})` : "Paid / Purchase Required", className: "access-btn-paid", disabled: true, tooltip: "Purchase required for non-student users" };
    }
    return { label: "View", className: "access-btn-default", disabled: false, tooltip: "" };
  }, [isStudent]);

  const getResourceIcon = (type) => {
    if (type === "book") return "📕";
    if (type === "research_paper") return "📄";
    if (type === "field_guide") return "🗺️";
    return "📚";
  };

    return (
    <div className="pl-page">
      <div className="pl-container">
        
        <header className="pl-header">
          <div className="pl-header-left">
            <div className="pl-logo-badge">🦎</div>
            <div>
              <h1 className="pl-title">Komodo Hub Public Library</h1>
              <p className="pl-subtitle">
                Indonesia's National Knowledge Base for Endangered Species Conservation
              </p>
            </div>
          </div>
          <div className="pl-header-right">
            {user ? (
              <>
                <button
                  className="pl-login-btn"
                  onClick={() => {
                    const dashPaths = {
                      student: "/student",
                      teacher: "/teacher",
                      principal: "/principal",
                      chairman: "/community",
                      member: "/member",
                      admin: "/admin",
                    };
                    navigate(dashPaths[role] || "/");
                  }}
                  title="Return to your dashboard"
                >
                  ← Dashboard
                </button>
                <span className="pl-user-badge" title={`Logged in as ${role}`}>
                  {role === "student" ? "🎓" : "👤"} {role}
                </span>
              </>
            ) : (
              <button className="pl-login-btn" onClick={() => navigate("/")}>
                Login / Register
              </button>
            )}
          </div>
        </header>

        
        {!user && (
          <div style={{
            background: "#e8f5e9", color: "#2E7D32", padding: "12px 20px",
            borderRadius: "8px", margin: "0 24px 20px", display: "flex", gap: "12px",
            alignItems: "center", border: "1px solid #c8e6c9"
          }}>
            <span style={{ fontSize: "20px" }}>👋</span>
            <div style={{ flex: 1 }}>
              <strong>Welcome, Guest!</strong>
              <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#4f6f52" }}>
                You're viewing the public encyclopedia. Sign in to access your school or community's exclusive wildlife contributions and resources.
              </p>
            </div>
            <button
              onClick={() => navigate("/auth")}
              style={{
                background: "#2E7D32", color: "white", padding: "8px 16px",
                borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600
              }}
            >
              Sign In
            </button>
          </div>
        )}

        
        <nav className="pl-tabs" role="navigation" aria-label="Library sections">
          <button
            className={`pl-tab ${activeTab === "species" ? "pl-tab-active" : ""}`}
            onClick={() => setActiveTab("species")}
            title="Browse the encyclopedia of 15 Indonesian endangered species"
          >
            <span className="pl-tab-icon">🦎</span>
            <span>Species Encyclopedia</span>
          </button>
          <button
            className={`pl-tab ${activeTab === "showcase" ? "pl-tab-active" : ""}`}
            onClick={() => setActiveTab("showcase")}
            title="View contributions from schools and communities"
          >
            <span className="pl-tab-icon">🏫</span>
            <span>Organization Showcase</span>
          </button>
          <button
            className={`pl-tab ${activeTab === "bookshelf" ? "pl-tab-active" : ""}`}
            onClick={() => setActiveTab("bookshelf")}
            title="Browse conservation books, field guides, and research papers"
          >
            <span className="pl-tab-icon">📚</span>
            <span>Digital Bookshelf</span>
          </button>
          <button
            className={`pl-tab ${activeTab === "articles" ? "pl-tab-active" : ""}`}
            onClick={() => setActiveTab("articles")}
            title="Read educational articles about Indonesian wildlife"
          >
            <span className="pl-tab-icon">📰</span>
            <span>Educational Articles</span>
          </button>
          <button
            className={`pl-tab ${activeTab === "donate" ? "pl-tab-active" : ""}`}
            onClick={() => setActiveTab("donate")}
            title="Support Komodo Hub's mission through donations"
          >
            <span className="pl-tab-icon">💚</span>
            <span>Support Us</span>
          </button>
        </nav>

        
        {activeTab === "species" && (
          <section className="pl-section">
            <div className="pl-section-header">
              <h2>Species Encyclopedia</h2>
              <p className="pl-section-desc">
                Explore 15 Indonesian endangered species. Click a card for full details, conservation efforts, and threats.
              </p>
            </div>

            <div className="pl-controls">
              <input
                className="pl-search"
                type="text"
                placeholder="Search species, scientific name, or island..."
                value={speciesSearch}
                onChange={(e) => setSpeciesSearch(e.target.value)}
                aria-label="Search species"
              />
              <div className="pl-filter-chips">
                {[
                  { key: "all", label: "All Species" },
                  { key: "CR", label: "Critically Endangered" },
                  { key: "EN", label: "Endangered" },
                  { key: "VU", label: "Vulnerable" },
                ].map((f) => (
                  <button
                    key={f.key}
                    className={`pl-chip ${speciesFilter === f.key ? "pl-chip-active" : ""}`}
                    onClick={() => setSpeciesFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <span className="pl-result-count">{filteredSpecies.length} species found</span>
            </div>

            {loadingSpecies ? (
              <div className="pl-loading">
                <div className="pl-spinner"></div>
                <p>Loading species data...</p>
              </div>
            ) : selectedSpecies ? (
                            <div className="species-detail" role="article" aria-label={selectedSpecies.commonName}>
                <button className="species-detail-back" onClick={() => setSelectedSpecies(null)}>
                  ← Back to All Species
                </button>
                <div className="species-detail-header">
                  <span className="species-detail-emoji">{selectedSpecies.emoji}</span>
                  <div>
                    <h2 className="species-detail-name">{selectedSpecies.commonName}</h2>
                    <p className="species-detail-scientific">{selectedSpecies.scientificName}</p>
                    <div className="species-detail-badges">
                      <span
                        className="iucn-badge-lg"
                        style={{ background: iucnColors[selectedSpecies.iucnCode]?.bg || "#888" }}
                        title={iucnColors[selectedSpecies.iucnCode]?.label}
                      >
                        {selectedSpecies.iucnCode} — {selectedSpecies.conservationStatus}
                      </span>
                      <span className="species-detail-pop">Population: {selectedSpecies.population}</span>
                    </div>
                  </div>
                </div>

                <div className="species-detail-grid">
                  <div className="species-detail-main">
                    <h3>About</h3>
                    <p className="species-detail-body">{selectedSpecies.description}</p>

                    <div className="species-detail-info-row">
                      <div className="species-info-card">
                        <span className="info-card-label">🏝️ Habitat</span>
                        <span className="info-card-value">{selectedSpecies.habitat}</span>
                      </div>
                      <div className="species-info-card">
                        <span className="info-card-label">📍 Island(s)</span>
                        <span className="info-card-value">{selectedSpecies.island}</span>
                      </div>
                    </div>
                  </div>

                  <div className="species-detail-sidebar">
                    <div className="species-sidebar-card threats-card">
                      <h4>⚠️ Threats</h4>
                      <ul className="species-list">
                        {selectedSpecies.threats?.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="species-sidebar-card efforts-card">
                      <h4>🛡️ Conservation Efforts</h4>
                      <ul className="species-list species-list-green">
                        {selectedSpecies.conservationEfforts?.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
                            <div className="species-grid">
                {filteredSpecies.length === 0 ? (
                  <div className="pl-empty">
                    <p>No species found matching your search. Try different keywords.</p>
                  </div>
                ) : (
                  filteredSpecies.map((sp) => (
                    <button
                      key={sp.id}
                      className="species-card"
                      onClick={() => setSelectedSpecies(sp)}
                      aria-label={`View details for ${sp.commonName}`}
                    >
                      <div className="species-card-emoji">{sp.emoji}</div>
                      <div className="species-card-body">
                        <h3 className="species-card-name">{sp.commonName}</h3>
                        <p className="species-card-sci">{sp.scientificName}</p>
                        <span
                          className="iucn-badge"
                          style={{ background: iucnColors[sp.iucnCode]?.bg || "#888" }}
                          title={iucnColors[sp.iucnCode]?.label}
                        >
                          {sp.iucnCode}
                        </span>
                        <p className="species-card-summary">{sp.summary}</p>
                        <div className="species-card-footer">
                          <span className="species-card-pop">Pop: {sp.population}</span>
                          <span className="species-card-island">📍 {sp.island}</span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </section>
        )}

        
        {activeTab === "showcase" && (
          <section className="pl-section">
            <div className="pl-section-header">
              <h2>Organization Showcase</h2>
              <p className="pl-section-desc">
                Browse contributions from schools and communities across Indonesia.
              </p>
            </div>

            
            <div className="pl-privacy-notice" role="alert">
              <span className="privacy-icon">🔒</span>
              <div>
                <strong>Privacy Protection:</strong> Student names and profiles from school entries
                are <strong>never displayed</strong> to protect minors. Community contributions
                show contributor names with consent.
              </div>
            </div>

            <div className="pl-controls">
              <div className="pl-filter-chips">
                <button
                  className={`pl-chip ${orgFilter === "all" ? "pl-chip-active" : ""}`}
                  onClick={() => setOrgFilter("all")}
                >
                  All Organizations ({showcaseItems.length})
                </button>
                <button
                  className={`pl-chip ${orgFilter === "school" ? "pl-chip-active" : ""}`}
                  onClick={() => setOrgFilter("school")}
                >
                  🏫 Schools ({showcaseItems.filter((i) => i.orgType === "school").length})
                </button>
                <button
                  className={`pl-chip ${orgFilter === "community" ? "pl-chip-active" : ""}`}
                  onClick={() => setOrgFilter("community")}
                >
                  🌍 Communities ({showcaseItems.filter((i) => i.orgType === "community").length})
                </button>
              </div>
            </div>

            {loadingShowcase ? (
              <div className="pl-loading">
                <div className="pl-spinner"></div>
                <p>Loading contributions...</p>
              </div>
            ) : filteredShowcase.length === 0 ? (
              <div className="pl-empty">
                <p>No contributions found for this filter. Check back soon!</p>
              </div>
            ) : (
              <div className="showcase-grid">
                {filteredShowcase.map((item) => (
                  <div
                    key={item.id}
                    className={`showcase-card ${item.orgType === "community" ? "showcase-card-community" : "showcase-card-school"}`}
                    onClick={() => navigate(`/sighting/${item.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    {item.photoURL && (
                      <img src={item.photoURL} alt="Contribution" className="showcase-card-img" />
                    )}
                    <div className="showcase-card-body">
                      <div className="showcase-card-header">
                        <span className={`showcase-org-badge ${item.orgType === "community" ? "badge-community" : "badge-school"}`}>
                          {item.orgType === "community" ? "🌍 Community" : "🏫 School"}
                        </span>
                        <span className="showcase-card-type">{item.type}</span>
                      </div>

                      <h4 className="showcase-card-title">{item.title}</h4>
                      <p className="showcase-card-desc">{item.description}</p>

                      <div className="showcase-card-footer">
                        
                        {item.orgType === "school" && (
                          <div className="showcase-org-name" title={item.contributorName ? "" : "Student identity protected"}>
                            <span>🏫 {item.orgName}</span>
                            {item.contributorName && (
                              <span className="showcase-contributor-name" style={{ marginLeft: "8px", fontSize: "12px", color: "#666" }}>
                                — {item.contributorName} (Student)
                              </span>
                            )}
                          </div>
                        )}

                        
                        {item.orgType === "community" && (
                          <div className="showcase-contributor">
                            <span className="showcase-contributor-name">
                              👤 {item.contributorName} {item.contributorName !== "Community Member" ? "(Community Member)" : ""}
                            </span>
                            {item.contributorProfileLink && (
                              <Link
                                to={item.contributorProfileLink}
                                className="showcase-profile-link"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Profile →
                              </Link>
                            )}
                          </div>
                        )}

                        {item.date && (
                          <span className="showcase-card-date">📅 {item.date}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        
        {activeTab === "bookshelf" && (
          <section className="pl-section">
            <div className="pl-section-header">
              <h2>Digital Bookshelf & Resources</h2>
              <p className="pl-section-desc">
                Conservation books, field guides, and research papers.
                {isStudent && (
                  <span className="student-free-notice"> 🎓 As a student, you have free access to educational titles!</span>
                )}
              </p>
            </div>

            
            <div className="bookshelf-legend">
              <span className="legend-item">
                <span className="legend-dot legend-dot-free"></span>
                Free for Students
              </span>
              <span className="legend-item">
                <span className="legend-dot legend-dot-paid"></span>
                Paid / Purchase Required
              </span>
              <span className="legend-item">
                <span className="legend-dot legend-dot-global-paid"></span>
                Advanced Research (Paid for all)
              </span>
            </div>

            <div className="pl-controls">
              <div className="pl-filter-chips">
                <button
                  className={`pl-chip ${resourceFilter === "all" ? "pl-chip-active" : ""}`}
                  onClick={() => setResourceFilter("all")}
                >
                  All Resources
                </button>
                <button
                  className={`pl-chip ${resourceFilter === "book" ? "pl-chip-active" : ""}`}
                  onClick={() => setResourceFilter("book")}
                >
                  📕 Books
                </button>
                <button
                  className={`pl-chip ${resourceFilter === "field_guide" ? "pl-chip-active" : ""}`}
                  onClick={() => setResourceFilter("field_guide")}
                >
                  🗺️ Field Guides
                </button>
                <button
                  className={`pl-chip ${resourceFilter === "research_paper" ? "pl-chip-active" : ""}`}
                  onClick={() => setResourceFilter("research_paper")}
                >
                  📄 Research Papers
                </button>
              </div>
            </div>

            {loadingResources ? (
              <div className="pl-loading">
                <div className="pl-spinner"></div>
                <p>Loading resources...</p>
              </div>
            ) : (
              <div className="bookshelf-grid">
                {filteredResources.length === 0 ? (
                  <div className="pl-empty"><p>No resources found for this filter.</p></div>
                ) : (
                  filteredResources.map((res) => {
                    const accessInfo = getAccessButton(res);
                    return (
                      <div key={res.id} className={`book-card ${res.access === "global_paid" ? "book-card-premium" : ""}`}>
                        <div className="book-card-icon">{getResourceIcon(res.type)}</div>
                        <div className="book-card-body">
                          <div className="book-card-meta">
                            <span className="book-type-badge">{res.type === "research_paper" ? "Research Paper" : res.type === "field_guide" ? "Field Guide" : "Book"}</span>
                            <span className="book-category">{res.category}</span>
                          </div>
                          <h4 className="book-title">{res.title}</h4>
                          <p className="book-author">{res.author}</p>
                          <p className="book-desc">{res.description}</p>
                          <div className="book-details">
                            {res.pages && <span>{res.pages} pages</span>}
                            {res.year && <span>© {res.year}</span>}
                            {res.journal && <span>{res.journal}</span>}
                          </div>
                          <button
                            className={`book-access-btn ${accessInfo.className}`}
                            disabled={accessInfo.disabled}
                            title={accessInfo.tooltip}
                            aria-label={accessInfo.tooltip}
                          >
                            {accessInfo.label}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </section>
        )}

        
        {activeTab === "articles" && (
          <section className="pl-section">
            <div className="pl-section-header">
              <h2>Educational Articles</h2>
              <p className="pl-section-desc">
                Read educational resources about Indonesian wildlife conservation.
              </p>
            </div>

            <div className="pl-controls">
              <input
                className="pl-search"
                type="text"
                placeholder="Search articles..."
                value={articleSearch}
                onChange={(e) => setArticleSearch(e.target.value)}
                aria-label="Search articles"
              />
              <div className="pl-filter-chips">
                {articleCategories.map((cat) => (
                  <button
                    key={cat}
                    className={`pl-chip ${articleCategory === cat ? "pl-chip-active" : ""}`}
                    onClick={() => setArticleCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {loadingArticles ? (
              <div className="pl-loading">
                <div className="pl-spinner"></div>
                <p>Loading articles...</p>
              </div>
            ) : (
              <div className="articles-layout">
                <div className="articles-list-panel">
                  <div className="articles-list-header">Articles ({filteredArticles.length})</div>
                  <div className="articles-list-scroll">
                    {filteredArticles.map((a) => (
                      <button
                        key={a.id}
                        className={`articles-list-item ${activeArticle?.id === a.id ? "articles-list-item-active" : ""}`}
                        onClick={() => setActiveArticle(a)}
                      >
                        <div className="articles-list-title">{a.title}</div>
                        <div className="articles-list-cat">{a.category}</div>
                        <div className="articles-list-summary">{a.summary}</div>
                      </button>
                    ))}
                    {filteredArticles.length === 0 && (
                      <div className="pl-empty-inline">No articles found.</div>
                    )}
                  </div>
                </div>

                <div className="articles-reader-panel">
                  {!activeArticle ? (
                    <div className="articles-empty-reader">Select an article to read.</div>
                  ) : (
                    <>
                      <h2>{activeArticle.title}</h2>
                      <div className="articles-reader-meta">
                        <span className="articles-reader-cat">{activeArticle.category}</span>
                        {activeArticle.author && (
                          <span className="articles-reader-author">By {activeArticle.author}</span>
                        )}
                      </div>
                      <p className="articles-reader-summary">{activeArticle.summary}</p>
                      <div className="articles-reader-body">{activeArticle.body}</div>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        
        {activeTab === "donate" && (
          <section className="pl-section">
            <div className="pl-section-header">
              <h2>Support Our Mission</h2>
              <p className="pl-section-desc">
                Your contribution helps us build a better platform, reach wider audiences,
                and protect Indonesia's most endangered species. Every donation makes a difference.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem", padding: "1.5rem 0" }}>
              
              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", justifyContent: "center", maxWidth: "800px" }}>
                {[
                  { icon: "🌿", title: "Platform Growth", desc: "Fund new features that empower students and researchers." },
                  { icon: "🦎", title: "Species Coverage", desc: "Expand our database to cover more endangered species." },
                  { icon: "🏫", title: "School Outreach", desc: "Help us onboard more schools across the Indonesian archipelago." },
                ].map((card) => (
                  <a
                    key={card.title}
                    href="https://www.gofundme.com/f/help-us-build-a-better-website-and-reach-larger-audiences"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: "1 1 200px",
                      background: "rgba(52, 211, 153, 0.08)",
                      border: "1px solid rgba(52, 211, 153, 0.3)",
                      borderRadius: "12px",
                      padding: "1.25rem",
                      textAlign: "center",
                      textDecoration: "none",
                      color: "inherit",
                      cursor: "pointer",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(52,211,153,0.2)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{card.icon}</div>
                    <h3 style={{ margin: "0 0 0.4rem", fontSize: "1rem", fontWeight: 600 }}>{card.title}</h3>
                    <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>{card.desc}</p>
                  </a>
                ))}
              </div>

              
              <div style={{ width: "100%", maxWidth: "700px" }}>
                <FundraiserWidget />
              </div>
            </div>
          </section>
        )}

        
        <footer className="pl-footer">
          <p>© 2024–2026 Komodo Hub — Indonesian Endangered Species Conservation Platform</p>
          <p className="pl-footer-note">
            Data sourced from IUCN Red List, Indonesian Ministry of Environment and Forestry,
            and partner conservation organizations.
          </p>
        </footer>
      </div>
    </div>
  );
}
