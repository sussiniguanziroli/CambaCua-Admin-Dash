const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

admin.initializeApp();
const db = admin.firestore();

exports.expireCoupons = onSchedule("every 24 hours", async (event) => {
    logger.info("Running scheduled coupon expiration check.");
    
    const now = admin.firestore.Timestamp.now();
    
    const couponsToExpireQuery = db.collection("redeemable_coupons")
        .where("expiresAt", "<=", now)
        .where("hasExpired", "==", false);

    try {
        const snapshot = await couponsToExpireQuery.get();
        if (snapshot.empty) {
            logger.info("No coupons to expire.");
            return null;
        }

        const batch = db.batch();
        snapshot.forEach(doc => {
            const couponRef = db.collection("redeemable_coupons").doc(doc.id);
            batch.update(couponRef, { hasExpired: true });
        });

        await batch.commit();
        logger.info(`Successfully expired ${snapshot.size} coupons.`);
        return null;

    } catch (error) {
        logger.error("Error expiring coupons:", error);
        return null;
    }
});
