'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { domains, categories } from '@/lib/data';
import { BrainCircuit, Briefcase, GraduationCap } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [selectedDomain, setSelectedDomain] = useState(domains[0].id);
  const [selectedCategory, setSelectedCategory] = useState(categories[0].id);

  const handleStart = () => {
    router.push(`/interview?domain=${selectedDomain}&category=${selectedCategory}`);
  };

  return (
    <main className="main-container">
      <header className="app-header animate-fade-in">
        <div className="flex justify-center mb-4 text-indigo-400">
          <BrainCircuit size={64} style={{ color: "var(--accent-primary)" }} />
        </div>
        <h1 className="app-title">AI Interview Prep</h1>
        <p className="app-subtitle">Practice smarter. Land your dream job.</p>
      </header>

      <section className="glass-panel animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <h2 style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <Briefcase size={20} /> Select Your Domain
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "32px" }}>
          {domains.map(d => (
            <button
              key={d.id}
              className={`btn ${selectedDomain === d.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedDomain(d.id)}
            >
              {d.name}
            </button>
          ))}
        </div>

        <h2 style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <GraduationCap size={20} /> Question Category
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "32px" }}>
          {categories.map(c => (
            <button
              key={c.id}
              className={`btn ${selectedCategory === c.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategory(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <button
            className="btn btn-primary"
            style={{ width: "100%", maxWidth: "300px", padding: "16px", fontSize: "1.1rem" }}
            onClick={handleStart}
          >
            Start Interview Session
          </button>
        </div>
      </section>
    </main>
  );
}
