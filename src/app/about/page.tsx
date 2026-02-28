import { Header } from "@/components/header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "About AI Blog — a journey through code and mindfulness",
};

const timeline = [
  {
    year: "2018",
    title: "The Beginning",
    description:
      "Started my programming journey with Python and fell in love with the elegance of clean code.",
  },
  {
    year: "2019",
    title: "Web Development",
    description:
      "Discovered the world of web development. React, Node.js, and the endless possibilities of the browser.",
  },
  {
    year: "2021",
    title: "Finding Balance",
    description:
      "Learned that great code comes from a clear mind. Started practicing mindfulness and minimalism.",
  },
  {
    year: "2023",
    title: "Full Stack & Beyond",
    description:
      "Embraced TypeScript, explored system design, and began mentoring other developers.",
  },
  {
    year: "2024",
    title: "AI Blog",
    description:
      "Created this space to share thoughts on the intersection of technology, creativity, and mindful living.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-12">
        {/* Intro */}
        <section className="mb-16 max-w-2xl">
          <h1 className="font-serif text-3xl font-semibold sm:text-4xl">
            About
          </h1>
          <div className="mt-8 space-y-4 text-muted-foreground">
            <p>
              Hi, I&apos;m a developer who believes that the best software is
              born from clarity of thought. Like the Japanese concept of{" "}
              <em className="text-foreground">wabi-sabi</em> — finding beauty in
              imperfection — I strive to write code that is simple, honest, and
              purposeful.
            </p>
            <p>
              This blog is my digital garden where I cultivate ideas about
              software development, mindful living, and everything in between.
              Each post is a seed planted with intention.
            </p>
            <p>
              When I&apos;m not coding, you&apos;ll find me brewing tea, reading
              philosophy, or taking long walks in nature — the original
              debugging session.
            </p>
          </div>
        </section>

        {/* Philosophy */}
        <section className="mb-16">
          <h2 className="font-serif text-2xl font-semibold">Philosophy</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: "一",
                title: "Simplicity",
                desc: "Remove everything that doesn't serve a purpose. In code, in life, in design.",
              },
              {
                icon: "和",
                title: "Harmony",
                desc: "Technology should enhance life, not complicate it. Find the balance.",
              },
              {
                icon: "間",
                title: "Space",
                desc: "The pauses between notes make the music. Whitespace is not wasted space.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-border p-6 transition-colors hover:bg-secondary/50"
              >
                <span className="font-serif text-3xl">{item.icon}</span>
                <h3 className="mt-3 font-serif text-lg font-semibold">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="mb-16">
          <h2 className="font-serif text-2xl font-semibold">Journey</h2>
          <div className="mt-8 space-y-0">
            {timeline.map((item, index) => (
              <div
                key={item.year}
                className="relative border-l-2 border-border pb-8 pl-8 last:pb-0"
              >
                <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-border bg-background" />
                <div className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                  <span className="text-sm font-medium text-muted-foreground">
                    {item.year}
                  </span>
                  <h3 className="mt-1 font-serif text-lg font-semibold">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="rounded-lg border border-border bg-secondary/30 p-8 text-center">
          <h2 className="font-serif text-2xl font-semibold">Get in Touch</h2>
          <p className="mt-2 text-muted-foreground">
            Want to chat about code, philosophy, or tea? Feel free to reach out.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
            >
              GitHub
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Twitter
            </a>
            <a
              href="mailto:hello@zenblog.dev"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Email
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} AI Blog. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
