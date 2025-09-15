'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import RotatingBanana from '@/src/components/rotating-banana';
import { Button } from '@/src/components/ui/button';
import LinkedInPost from '../_components/linkedin-post';
import { posts } from '../posts';

export default function SponsorDeckLinkedInPage() {
  // Randomize posts order
  const shuffledPosts = useMemo(() => {
    const shuffled = [...posts];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);
  return (
    <div className="relative mx-auto flex max-w-6xl">
      {/* Rotating banana background */}
      <div className="-z-10 fixed inset-0 opacity-20">
        <RotatingBanana />
      </div>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl space-y-12 px-6 py-8 font-geist">
        {/* Back Button */}
        <div className="flex justify-start">
          <Button variant="outline" asChild>
            <Link href="/sponsor-deck" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Sponsor Deck
            </Link>
          </Button>
        </div>

        {/* Header */}
        <div className="space-y-4 text-center">
          <div className="text-6xl">💼</div>
          <h1 className="font-bold text-4xl">Visibilidad - LinkedIn</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Decenas de hackers compartieron su experiencia en LinkedIn. Aquí
            algunos ejemplos.
          </p>
        </div>

        {/* LinkedIn Posts Columns */}
        <section className="flex flex-col lg:flex-row lg:gap-8">
          {/* Left Column */}
          <div className="flex flex-1 flex-col space-y-6">
            {shuffledPosts
              .filter((_, index) => index % 2 === 0)
              .map((post, index) => (
                <LinkedInPost
                  key={`${post.url}-${index * 2}`}
                  authorName={post.postData.authorName}
                  authorJobTitle={post.postData.authorJobTitle}
                  authorProfilePicture={post.postData.authorProfilePicture}
                  timePosted={post.postData.timePosted}
                  postContent={post.postData.postContent}
                  reactionsCount={post.postData.reactionsCount}
                  commentsCount={post.postData.commentsCount}
                  postImages={
                    post.postData.newImageFilenames?.map(
                      (filename) => `/assets/images/linkedin/${filename}`,
                    ) || []
                  }
                  url={post.url}
                />
              ))}
          </div>

          {/* Right Column */}
          <div className="flex flex-1 flex-col space-y-6">
            {shuffledPosts
              .filter((_, index) => index % 2 === 1)
              .map((post, index) => (
                <LinkedInPost
                  key={`${post.url}-${index * 2 + 1}`}
                  authorName={post.postData.authorName}
                  authorJobTitle={post.postData.authorJobTitle}
                  authorProfilePicture={post.postData.authorProfilePicture}
                  timePosted={post.postData.timePosted}
                  postContent={post.postData.postContent}
                  reactionsCount={post.postData.reactionsCount}
                  commentsCount={post.postData.commentsCount}
                  postImages={
                    post.postData.newImageFilenames?.map(
                      (filename) => `/assets/images/linkedin/${filename}`,
                    ) || []
                  }
                  url={post.url}
                />
              ))}
          </div>
        </section>
      </main>
    </div>
  );
}
