// The Cloud Functions for Firebase SDK to create Cloud Functions and triggers.
const functions = require('firebase-functions');
// The Firebase Admin SDK to access Firestore and Cloud Storage.
const admin = require('firebase-admin');
// Specifically import scheduler for scheduled functions in v2
const { onSchedule } = require('firebase-functions/v2/scheduler');

// Initialize Firebase Admin SDK if not already initialized
// This check prevents re-initialization in local development or test environments
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();
const storage = admin.storage();

// Define the bucket where your product images are stored.
// If you're using the default bucket, you might not need to specify it,
// but it's good practice for clarity.
const bucket = storage.bucket(); // Uses the default bucket for your project

/**
 * Firebase Cloud Function to clean up orphaned product images in Firebase Storage.
 * This function runs on a schedule (e.g., daily) and deletes images in the
 * 'productos/' path that are no longer referenced by any product or variation
 * in the Firestore 'productos' collection.
 *
 * It's triggered by a Pub/Sub topic, typically set up with Cloud Scheduler.
 *
 * To deploy this function:
 * 1. Make sure you have the Firebase CLI installed and configured.
 * 2. Navigate to your Firebase project's `functions` directory in your terminal.
 * 3. Run `firebase deploy --only functions`
 * 4. Set up a Cloud Scheduler job from the Firebase Console or gcloud CLI:
 * `gcloud scheduler jobs create pubsub cleanOrphanedProductImages --schedule "every 24 hours" --topic projects/YOUR_PROJECT_ID/topics/firebase-schedule-cleanOrphanedProductImages --message-body "run"`
 * (Replace YOUR_PROJECT_ID with your actual Firebase project ID)
 */
exports.cleanOrphanedProductImages = onSchedule('every 24 hours', async (context) => { // Updated to use onSchedule from v2/scheduler
    console.log('Starting orphaned product image cleanup...');

    const referencedImageUrls = new Set();

    try {
        // 1. Fetch all product image URLs from Firestore
        const productsSnapshot = await db.collection('productos').get();
        productsSnapshot.forEach(doc => {
            const productData = doc.data();

            // Add main product images if they exist and are Firebase Storage URLs
            if (!productData.hasVariations) {
                if (productData.imagen && productData.imagen.startsWith('https://firebasestorage.googleapis.com/')) {
                    referencedImageUrls.add(productData.imagen);
                }
                if (productData.imagenB && productData.imagenB.startsWith('https://firebasestorage.googleapis.com/')) {
                    referencedImageUrls.add(productData.imagenB);
                }
                if (productData.imagenC && productData.imagenC.startsWith('https://firebasestorage.googleapis.com/')) {
                    referencedImageUrls.add(productData.imagenC);
                }
            } else if (productData.variationsList && Array.isArray(productData.variationsList)) {
                // Add variation images
                productData.variationsList.forEach(variation => {
                    if (variation.imagen && variation.imagen.startsWith('https://firebasestorage.googleapis.com/')) {
                        referencedImageUrls.add(variation.imagen);
                    }
                    if (variation.imagenB && variation.imagenB.startsWith('https://firebasestorage.googleapis.com/')) {
                        referencedImageUrls.add(variation.imagenB);
                    }
                    if (variation.imagenC && variation.imagenC.startsWith('https://firebasestorage.googleapis.com/')) {
                        referencedImageUrls.add(variation.imagenC);
                    }
                });
            }
        });

        console.log(`Found ${referencedImageUrls.size} referenced image URLs in Firestore.`);

        // 2. List all relevant images in Storage
        // The `prefix` should match the path where your product images are stored.
        // In your case, it seems to be `productos/` and `productos/{productId}/variations/`
        // We'll list all files under `productos/` and then filter.
        const [files] = await bucket.getFiles({ prefix: 'productos/' });

        console.log(`Found ${files.length} files in Storage under 'productos/' prefix.`);

        const deletionPromises = [];
        let deletedCount = 0;

        // 3. Compare and Delete
        for (const file of files) {
            // Construct the full public URL for the file to compare with Firestore URLs
            // This is a common way to get the public URL for comparison.
            // Note: The actual URL might contain tokens, so we need to be careful with comparison.
            // A more robust comparison is to extract the storage path from the URL.
            // Example Storage Path: productos/PRODUCT_ID/principal-TIMESTAMP-FILENAME.ext
            // Example Storage Path for Variation: productos/PRODUCT_ID/variations/VARIATION_ID/imagen-TIMESTAMP-FILENAME.ext
            const filePath = file.name; // e.g., 'productos/someProductId/image.jpg'

            // Check if any of the referenced URLs contain this file path
            const isReferenced = Array.from(referencedImageUrls).some(url => url.includes(filePath));

            if (!isReferenced) {
                console.log(`Deleting orphaned file: ${filePath}`);
                deletionPromises.push(file.delete()
                    .then(() => {
                        deletedCount++;
                        console.log(`Successfully deleted ${filePath}`);
                    })
                    .catch(err => {
                        console.error(`Failed to delete ${filePath}:`, err);
                    })
                );
            }
        }

        await Promise.allSettled(deletionPromises); // Use allSettled to wait for all promises regardless of success/failure

        console.log(`Orphaned image cleanup finished. Total deleted: ${deletedCount}`);
        return null; // Cloud Functions should return null or a Promise
    } catch (error) {
        console.error('Error during orphaned image cleanup:', error);
        throw new functions.https.HttpsError('internal', 'Failed to clean up orphaned images.', error.message);
    }
});
