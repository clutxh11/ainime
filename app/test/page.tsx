"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8">Test Page</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Test Card 1</h2>
            <p className="text-gray-300 mb-4">
              This is a test card to check if styling is working.
            </p>
            <Button className="bg-red-600 hover:bg-red-700">Test Button</Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Test Card 2</h2>
            <p className="text-gray-300 mb-4">
              Another test card with different content.
            </p>
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Outline Button
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Test Card 3</h2>
            <p className="text-gray-300 mb-4">
              Third test card to verify grid layout.
            </p>
            <Button variant="ghost" className="text-gray-300 hover:bg-gray-700">
              Ghost Button
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
