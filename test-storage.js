// Test script to debug storage bucket issues
// Run this in the browser console or as a Node.js script

const { createClient } = require("@supabase/supabase-js");

// Replace with your actual Supabase URL and anon key
const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseKey = "YOUR_SUPABASE_ANON_KEY";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStorageBucket() {
  console.log("Testing storage bucket access...");

  try {
    // Test 1: List buckets
    console.log("1. Listing buckets...");
    const { data: buckets, error: bucketsError } =
      await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error("Error listing buckets:", bucketsError);
      return;
    }

    console.log(
      "Available buckets:",
      buckets.map((b) => b.name)
    );

    // Test 2: Check if series-assets bucket exists
    const seriesAssetsBucket = buckets.find((b) => b.name === "series-assets");
    if (!seriesAssetsBucket) {
      console.error("❌ series-assets bucket not found!");
      console.log("Please create the bucket in Supabase Dashboard > Storage");
      return;
    }

    console.log("✅ series-assets bucket found");
    console.log("Bucket details:", seriesAssetsBucket);

    // Test 3: List files in bucket
    console.log("2. Listing files in series-assets bucket...");
    const { data: files, error: filesError } = await supabase.storage
      .from("series-assets")
      .list();

    if (filesError) {
      console.error("Error listing files:", filesError);
      return;
    }

    console.log("Files in bucket:", files);

    // Test 4: Try to upload a test file
    console.log("3. Testing file upload...");
    const testFile = new File(["test content"], "test.txt", {
      type: "text/plain",
    });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("series-assets")
      .upload(`test-${Date.now()}.txt`, testFile);

    if (uploadError) {
      console.error("❌ Upload failed:", uploadError);
      return;
    }

    console.log("✅ Upload successful:", uploadData);

    // Test 5: Clean up test file
    console.log("4. Cleaning up test file...");
    const { error: deleteError } = await supabase.storage
      .from("series-assets")
      .remove([uploadData.path]);

    if (deleteError) {
      console.error("Warning: Could not delete test file:", deleteError);
    } else {
      console.log("✅ Test file cleaned up");
    }

    console.log("🎉 All storage tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testStorageBucket();
