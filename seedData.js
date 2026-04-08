import { db } from "./firebase";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { SPECIES_DATA, BOOKSHELF_RESOURCES } from "./data/speciesData";

const seedSpecies = [
  {
    name: "Komodo Dragon",
    scientificName: "Varanus komodoensis",
    status: "Endangered",
    population: "~3,000",
    habitat: "Indonesian islands of Komodo, Rinca, Flores, Gili Motang",
  },
  {
    name: "Sumatran Tiger",
    scientificName: "Panthera tigris sumatrae",
    status: "Critically Endangered",
    population: "<400",
    habitat: "Sumatra, Indonesia",
  },
  {
    name: "Javan Rhino",
    scientificName: "Rhinoceros sondaicus",
    status: "Critically Endangered",
    population: "~70",
    habitat: "Ujung Kulon National Park, Java",
  },
];

const seedPrograms = [
  {
    programId: "komodo_dragon",
    name: "Komodo Dragon Conservation",
    description: "Monitor and protect Komodo dragon populations across Indonesian islands.",
    region: "East Nusa Tenggara",
  },
  {
    programId: "sumatran_tiger",
    name: "Sumatran Tiger Watch",
    description: "Track and safeguard Sumatran tiger habitats from deforestation.",
    region: "Sumatra",
  },
  {
    programId: "javan_rhino",
    name: "Javan Rhino Protection",
    description: "Support the last remaining Javan rhino population in Ujung Kulon.",
    region: "West Java",
  },
];

const seedLibraryArticles = [
  {
    title: "Introduction to Animal Conservation",
    category: "Basics",
    summary: "Learn what conservation means and why protecting wildlife is essential.",
    body: "Animal conservation is the practice of protecting wild animal species and their habitats to prevent them from becoming extinct. It involves habitat preservation, anti-poaching enforcement, breeding programs, and community education.",
    author: "Komodo Hub Team",
  },
  {
    title: "Komodo Dragon: Indonesia's Living Dinosaur",
    category: "Species",
    summary: "Discover the world's largest lizard found only on Indonesian islands.",
    body: "The Komodo dragon is the largest living species of lizard, growing up to 3 meters in length. These remarkable reptiles are found only in the Indonesian islands of Komodo, Rinca, Flores, and Gili Motang.",
    author: "Komodo Hub Team",
  },
  {
    title: "How to Report Wildlife Sightings Safely",
    category: "Guide",
    summary: "A practical guide for documenting and reporting wildlife observations.",
    body: "Reporting wildlife sightings is one of the most valuable contributions anyone can make to conservation science. Always keep a safe distance, never share exact GPS coordinates publicly, and report through official channels.",
    author: "Komodo Hub Team",
  },
  {
    title: "Why Community Conservation Matters",
    category: "Education",
    summary: "How local communities are the backbone of successful wildlife conservation.",
    body: "Community-based conservation recognizes local people as essential partners in protecting wildlife and natural resources. When communities see direct benefits from healthy ecosystems, they become the strongest advocates for conservation.",
    author: "Komodo Hub Team",
  },
];

async function seedCollectionIfEmpty(collectionName, items) {
  const snapshot = await getDocs(collection(db, collectionName));
  if (snapshot.size > 0) return false;

  for (const item of items) {
    await addDoc(collection(db, collectionName), {
      ...item,
      createdAt: serverTimestamp(),
    });
  }
  return true;
}

export async function seedAllData() {
  const results = [];

  const speciesSeeded = await seedCollectionIfEmpty("species", seedSpecies);
  results.push(`Species: ${speciesSeeded ? "seeded" : "already exists"}`);

  const programsSeeded = await seedCollectionIfEmpty("programs", seedPrograms);
  results.push(`Programs: ${programsSeeded ? "seeded" : "already exists"}`);

  const librarySeeded = await seedCollectionIfEmpty("library", seedLibraryArticles);
  results.push(`Library: ${librarySeeded ? "seeded" : "already exists"}`);

  const speciesDataSeeded = await seedCollectionIfEmpty("species_data", SPECIES_DATA);
  results.push(`Species Encyclopedia: ${speciesDataSeeded ? "seeded" : "already exists"}`);

  const resourcesSeeded = await seedCollectionIfEmpty("resources", BOOKSHELF_RESOURCES);
  results.push(`Resources: ${resourcesSeeded ? "seeded" : "already exists"}`);

  return results;
}
