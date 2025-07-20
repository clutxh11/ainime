"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SimplePage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">AI-Nime</h1>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="text-gray-300 hover:text-white">
              Browse
            </Button>
            <Button variant="ghost" className="text-gray-300 hover:text-white">
              Calendar
            </Button>
            <Button variant="ghost" className="text-gray-300 hover:text-white">
              Creator Hub
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-8">
        <h2 className="text-3xl font-bold mb-8">Welcome to AI-Nime</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">Mystic Warriors</h3>
              <p className="text-gray-300 mb-4">
                Ancient warriors wielding mystical powers battle against an
                otherworldly invasion.
              </p>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-yellow-400">★★★★★</span>
                <span className="text-sm text-gray-300">4.9</span>
              </div>
              <Button className="bg-red-600 hover:bg-red-700 w-full">
                Watch
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">Galactic Conquest</h3>
              <p className="text-gray-300 mb-4">
                An epic space opera following rebel forces as they fight against
                an oppressive empire.
              </p>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-yellow-400">★★★★★</span>
                <span className="text-sm text-gray-300">4.9</span>
              </div>
              <Button className="bg-red-600 hover:bg-red-700 w-full">
                Watch
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">Dragon's Legacy</h3>
              <p className="text-gray-300 mb-4">
                A young warrior discovers an ancient dragon's power within
                himself.
              </p>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-yellow-400">★★★★☆</span>
                <span className="text-sm text-gray-300">4.8</span>
              </div>
              <Button className="bg-red-600 hover:bg-red-700 w-full">
                Watch
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
